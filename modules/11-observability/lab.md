# Lab 11: Metrics, Dashboards, and a Firing Alert

## What you will do

Stand up a local observability stack — Prometheus and Grafana — next to `devops-demo-app` with Docker Compose. You will scrape the app's `/metrics` endpoint, query it with PromQL, build a two-panel Grafana dashboard, convert the app's logging to structured JSON, and write an alert rule that you then watch fire.

Estimated time: 90–120 minutes.

## Prerequisites

- [ ] Completed Lab 10 (canary merged; your repo is on an up-to-date `main`)
- [ ] Docker Desktop (or your Docker engine) running, with Docker Compose v2 (`docker compose version`)
- [ ] Your `Dockerfile` from module 6 at the repository root
- [ ] `curl` and `git` on your PATH; `jq` recommended (`brew install jq`)
- [ ] Ports 3000, 9090, and 3001 free on your machine

## Steps

### 1. Create the Prometheus configuration

Create a new directory `observability/` at the repo root, then create `observability/prometheus.yml` with exactly this content:

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: demo-app
    static_configs:
      - targets: ['app:3000']
```

Two things to understand before moving on:

- `scrape_interval: 5s` — Prometheus will `GET /metrics` from every target every 5 seconds. (Production values are usually 15–60s; 5s makes the lab responsive.)
- `targets: ['app:3000']` — `app` is not a hostname on your laptop. It is the **Compose service name** of the app container. Docker Compose puts all services in a compose file on a shared network with DNS: each container can reach the others by service name. Prometheus runs *inside* that network, so it scrapes `app:3000`, not `localhost:3000`.

### 2. Create the observability Compose file

Create `observability/docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: ..
    ports:
      - "3000:3000"

  prometheus:
    image: prom/prometheus:v2.53.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:11.1.0
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

Path gotchas, spelled out:

- Relative paths inside a compose file are resolved **relative to the compose file's directory**, not your current shell directory. So `context: ..` is the repo root (where your `Dockerfile` lives), and `./prometheus.yml` is `observability/prometheus.yml`.
- Grafana listens on 3000 *inside* its container, but the app already publishes host port 3000, so we map Grafana to host port **3001** (`3001:3000`).
- This file is separate from your module 6 `docker-compose.yml` at the repo root; we leave that one untouched.

### 3. Start the stack and generate traffic

From the **repo root**:

```bash
docker compose -f observability/docker-compose.yml up -d --build
docker compose -f observability/docker-compose.yml ps
```

Expected: three services (`app`, `prometheus`, `grafana`) with `Up` status. Sanity-check the app from the host:

```bash
curl -s http://localhost:3000/metrics
```

Expected output (numbers will differ):

```text
demo_app_requests_total 3
demo_app_uptime_seconds 41
```

Now start a traffic loop in a **separate terminal** and leave it running for the rest of the lab:

```bash
while true; do curl -s http://localhost:3000/ > /dev/null; sleep 1; done
```

### 4. Explore in the Prometheus UI

Open [http://localhost:9090](http://localhost:9090).

1. Go to **Status > Targets**. You should see the `demo-app` job with one endpoint, `http://app:3000/metrics`, state **UP**. If it is DOWN, see Troubleshooting.
2. In the **Graph** tab, run the query `demo_app_requests_total` and switch to the Graph view. You see a line that only climbs — every request (your loop, plus Prometheus's own scrape of `/metrics` every 5s) increments the counter.
3. Now run `rate(demo_app_requests_total[1m])`. The line is roughly **flat**, hovering around 1.2 — that is requests **per second**: your loop's ~1/s plus the scraper's ~0.2/s.

The difference between the two graphs is the whole lesson: the raw counter's value is an accident of when the container started; its *slope*, extracted by `rate()`, is the actual throughput. Stop your traffic loop for 30 seconds and watch the rate dip, then restart it.

### 5. Build a Grafana dashboard

Open [http://localhost:3001](http://localhost:3001) and log in with `admin` / `admin`.

1. **Add the data source**: Connections > Data sources > Add data source > Prometheus. Set the server URL to `http://prometheus:9090` and click **Save & test** — you should see a success message. Note the URL: Grafana queries Prometheus from *inside* the compose network, so it uses the service name `prometheus`, not `localhost`. (`http://localhost:9090` would point at the Grafana container itself.)
2. **Create a dashboard**: Dashboards > New > New dashboard > Add visualization, choose the Prometheus data source.
3. **Panel 1 — Request rate**: query `rate(demo_app_requests_total[1m])`, visualization type *Time series*, title it "Request rate (req/s)". Apply.
4. **Panel 2 — Uptime**: add another panel with query `demo_app_uptime_seconds`, visualization type *Stat* or *Gauge*, title it "Uptime (seconds)". Apply.
5. Save the dashboard as "devops-demo-app".

You should see the request rate hovering around your loop's rate and the uptime climbing.

### 6. Structured logging

The app currently logs free text. Make it log JSON so the output is machine-queryable. In `server.js`, replace the `console.log` line inside the request handler:

```js
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${result.status}`);
```

with:

```js
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    method: req.method,
    url: req.url,
    status: result.status
  }));
```

Rebuild and restart just the app service:

```bash
docker compose -f observability/docker-compose.yml up -d --build app
```

With your traffic loop running, inspect the logs (the `--no-log-prefix` flag drops Compose's `app-1 |` prefix so the lines are pure JSON):

```bash
docker compose -f observability/docker-compose.yml logs --no-log-prefix --tail 5 app | jq .
```

Expected output — one object per request:

```json
{
  "ts": "2026-07-13T19:24:03.117Z",
  "method": "GET",
  "url": "/",
  "status": 200
}
```

No `jq`? Filter with grep instead — try `curl -s http://localhost:3000/nope` once, then:

```bash
docker compose -f observability/docker-compose.yml logs --no-log-prefix app | grep '"status":404'
```

This is the payoff of structure: filtering by field, not by guessing at text patterns.

### 7. Write an alert rule and watch it fire

Create `observability/alerts.yml`:

```yaml
groups:
  - name: demo-app
    rules:
      - alert: AppDown
        expr: up{job="demo-app"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "demo-app target is down"
          description: "Prometheus has failed to scrape demo-app for 30 seconds."
```

`up` is the synthetic metric Prometheus records after every scrape attempt: 1 for success, 0 for failure. The `for: 30s` means the condition must hold for 30 continuous seconds before the alert fires — one flaky scrape pages nobody.

Wire it in. Add a `rule_files` section to `observability/prometheus.yml` (top level, alongside `global`):

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
```

And mount the file by adding one line to the `prometheus` service's `volumes` in `observability/docker-compose.yml`:

```yaml
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alerts.yml:/etc/prometheus/alerts.yml:ro
```

Recreate Prometheus:

```bash
docker compose -f observability/docker-compose.yml up -d
```

Open [http://localhost:9090/alerts](http://localhost:9090/alerts) — `AppDown` should be listed, state **inactive** (green). Now cause the outage:

```bash
docker compose -f observability/docker-compose.yml stop app
```

Watch the alerts page (refresh every few seconds):

- Within ~5s (the next scrape) the condition becomes true and the alert turns **pending** (yellow) — true, but not yet for 30s.
- After 30 more seconds it turns **firing** (red).

(Your traffic loop will print nothing or errors while the app is down — that is your "users" experiencing the outage.) Restore service:

```bash
docker compose -f observability/docker-compose.yml start app
```

The alert returns to inactive on the next successful scrape. In production, a firing alert would be routed by Alertmanager to a pager or chat channel; the rule mechanics are identical.

### 8. Commit via a PR

Stop the stack when you are done experimenting:

```bash
docker compose -f observability/docker-compose.yml down
```

Then:

```bash
git checkout -b module-11-observability
git add observability/prometheus.yml observability/docker-compose.yml observability/alerts.yml server.js
git commit -m "Module 11: Prometheus + Grafana stack, structured logging, AppDown alert"
git push -u origin module-11-observability
```

Open a pull request, wait for CI to pass, and merge.

## Deliverables

- Screenshot or written description of **Status > Targets** showing the `demo-app` endpoint UP
- Your Grafana dashboard with both panels (request rate time series, uptime stat/gauge) — screenshot or export
- Screenshot or description of the `AppDown` alert in the **firing** state on `localhost:9090/alerts`
- Merged PR containing `observability/prometheus.yml`, `observability/docker-compose.yml`, `observability/alerts.yml`, and the `server.js` logging change, with green CI

## Troubleshooting

**Target shows DOWN with "connection refused" or "no such host" for `app:3000`.**
Prometheus cannot reach the app container. Check `docker compose -f observability/docker-compose.yml ps` — is `app` Up? Both services must be defined in the *same* compose file to share a network and DNS. Also confirm the target is `app:3000`, not `localhost:3000` — inside the Prometheus container, `localhost` is Prometheus itself.

**Grafana "Save & test" fails on the data source.**
Almost always the URL: it must be `http://prometheus:9090` (compose service name), not `http://localhost:9090`. Also check Prometheus is Up and you selected connection type Prometheus.

**Prometheus exits immediately after adding the rule file.**
A YAML or path error. Check `docker compose -f observability/docker-compose.yml logs prometheus` — it names the bad line. Confirm `rule_files` points at `/etc/prometheus/alerts.yml` (the *container* path) and that the alerts volume line was added before recreating.

**The alerts volume created a directory instead of mounting the file.**
If you added the volume mount *before* creating `alerts.yml`, Docker created a directory named `alerts.yml`. Remove the stack (`docker compose -f observability/docker-compose.yml down`), delete the stray directory if one appeared, make sure the file exists, and bring the stack up again.

**`jq` errors with "parse error" on the log output.**
Non-JSON lines (like the startup message `devops-demo-app listening on port 3000`) are mixed in. Use `--tail 5` while the traffic loop is running so only request lines are shown, or fall back to the grep variant.

**Port 3000 already in use.**
Your kind cluster port-forward from lab 10 or a stray `node server.js` is holding it. Find it with `lsof -i :3000` and stop it, then re-run the `up` command.
