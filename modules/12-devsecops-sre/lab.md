# Lab 12: Scan It, SLO It, Break It, Learn From It

## What you will do

Harden your pipeline and practice reliability engineering on `devops-demo-app`: scan dependencies and the container image, add a least-privilege security job to CI, define an SLO with a computed error budget, stage a one-minute outage in a game day, and write a blameless postmortem about it.

Estimated time: 90–120 minutes.

## Prerequisites

- [ ] Completed Lab 11 (observability stack merged; `observability/` directory with the `AppDown` alert on `main`)
- [ ] Docker Desktop (or your Docker engine) running; images `devops-demo-app:v1` and `:v2` present locally (`docker images | grep devops-demo-app`)
- [ ] Your `.github/workflows/ci.yml` from modules 4–5 passing on `main`
- [ ] Homebrew installed (for Trivy) — or see [Trivy install docs](https://aquasecurity.github.io/trivy/latest/getting-started/installation/) for your platform
- [ ] `git` and `curl` on your PATH

## Steps

### 1. Scan dependencies and the image

Start a branch:

```bash
git checkout -b module-12-devsecops-sre
```

**Dependencies first.** `npm audit` checks your dependency tree against known CVEs, but it needs a lockfile, and our zero-dependency app never had one. Generate and keep it:

```bash
npm install --package-lock-only
npm audit
```

Expected output:

```text
found 0 vulnerabilities
```

Of course it is clean — the app has zero dependencies. Discuss (and note in your PR description): why commit a lockfile anyway? Because the lockfile pins exactly what any future `npm install` may resolve. The day someone adds a dependency, the lockfile is what makes builds reproducible and gives `npm audit` a precise tree to scan — and it protects against a compromised or typosquatted version silently resolving in CI. It is an integrity contract, cheapest to adopt at zero dependencies.

**Now the image.** Install Trivy and scan v2:

```bash
brew install trivy
trivy image devops-demo-app:v2
```

Expected: a report listing the image's layers and any CVEs found in the **OS packages of the alpine base image** (packages like `libcrypto3`, `libssl3`, `busybox`). Your application layer is clean — zero npm dependencies — so everything you see comes from the base image. This is the point: your code can be perfect while the base image ships vulnerabilities, and those findings appear over time even if you never rebuild.

Narrow the noise to what would actually gate a release:

```bash
trivy image --severity HIGH,CRITICAL devops-demo-app:v2
```

Expected: a much shorter report — possibly empty if `node:20-alpine` is currently well-patched. Save a few lines of either report for your deliverables. If HIGH/CRITICAL findings exist, note the fix: bump to a newer base image tag and rebuild.

### 2. Add a security job to CI

Open `.github/workflows/ci.yml`. Two changes.

**First, least privilege.** At the top level of the workflow (same indentation as `on:`), add:

```yaml
permissions:
  contents: read
```

Why: every workflow run gets a `GITHUB_TOKEN`, and its default permissions can include write access. Your CI only needs to *read* the repo to lint, test, and scan. If any action you use is ever compromised (a supply-chain attack), this line shrinks what the attacker's code can do with your token from "push to your repo" to "read it". Grant the minimum at workflow level; widen per-job only if a job genuinely needs more.

**Second, the job.** Add this job alongside your existing `lint` and `test` jobs:

```yaml
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Check out full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Scan for secrets
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Audit dependencies
        run: npm audit --audit-level=high
```

Notes:

- `fetch-depth: 0` fetches the **entire Git history**, because gitleaks scans history, not just the current tree — a secret committed and "deleted" three commits ago is still a leak.
- `npm audit --audit-level=high` exits non-zero (failing the job) only for HIGH or CRITICAL findings, so a future LOW-severity advisory in a transitive dependency does not block every PR. This needs the lockfile from step 1.

Commit both the lockfile and the workflow change:

```bash
git add package-lock.json .github/workflows/ci.yml
git commit -m "Module 12: security CI job (gitleaks + npm audit), least-privilege token"
```

### 3. Define an SLO and compute the error budget

You have been collecting an availability signal since lab 11: Prometheus records `up{job="demo-app"}` as 1 or 0 on every scrape. Its average over a window is the fraction of successful scrapes — a simple but honest availability **SLI**:

```promql
avg_over_time(up{job="demo-app"}[1h])
```

(With the lab 11 stack running, try it at [http://localhost:9090](http://localhost:9090) — expected value: `1` if the app has been up for the whole hour.)

Create `docs/slo.md` from this template and fill in every bracketed part:

```markdown
# SLO: devops-demo-app availability

## SLI (what we measure)

Availability, measured as the fraction of successful Prometheus scrapes
of the app target:

    avg_over_time(up{job="demo-app"}[30d])

A scrape succeeds when GET /metrics answers within the scrape timeout.
This is a proxy for "users can reach the service".

## SLO (our target)

99.5% availability over a rolling 30-day window.

## Error budget

Budget fraction: 1 - 0.995 = 0.005
Budget in time:  0.005 x 30 days x 24 h x 60 min = [compute this] minutes per 30 days

## Policy

- If the remaining budget for the window falls below 25%, we stop feature
  releases and prioritize reliability work until it recovers.
- The AppDown alert (observability/alerts.yml) is our fastest budget-burn signal.

## Review

Owner: [your name]. Review this SLO after the first 30-day window:
is 99.5% too strict or too loose for this service?
```

Compute the budget: 0.005 × 30 × 24 × 60 = **216 minutes** — about 3.6 hours of allowed downtime per 30 days. Write the number into the file. Notice what it buys you: the one-minute outage you are about to stage in the game day will consume less than 0.5% of the budget. That is the point of a budget — planned, bounded failure is affordable.

```bash
git add docs/slo.md
git commit -m "Module 12: availability SLO with error budget"
```

### 4. Game day: stage an outage

Verify a resilience claim by experiment: *"If the app dies, our alert fires within about 35 seconds, and we notice before users tell us."*

Bring up the lab 11 stack and start traffic:

```bash
docker compose -f observability/docker-compose.yml up -d --build
```

In a second terminal, run the traffic loop (your "users"):

```bash
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/; sleep 1; done
```

Open [http://localhost:9090/alerts](http://localhost:9090/alerts) and confirm `AppDown` is **inactive**. Now, **note the current time** (you need real timestamps for the postmortem), and break it:

```bash
date
docker compose -f observability/docker-compose.yml stop app
```

Observe, and write down times as you go:

- The traffic loop starts printing `000` (connection refused) — user impact begins.
- Within ~5 seconds, the next scrape fails; on the alerts page, `AppDown` turns **pending**.
- After 30 more seconds, it turns **firing**. Time how long from `stop` to firing.

Leave it down for about a minute total, then recover:

```bash
docker compose -f observability/docker-compose.yml start app
date
```

Confirm recovery: the traffic loop prints `200` again, and the alert returns to inactive within one scrape interval. Total user-facing downtime: roughly 60–90 seconds. Against your 216-minute budget, you spent well under 1%.

Stop the loop, and when done experimenting:

```bash
docker compose -f observability/docker-compose.yml down
```

### 5. Write the blameless postmortem

Create `docs/postmortem-2026-07-13.md` using this full template. Fill in your real timestamps from step 4; keep it blameless — the "operator" (you) ran `docker compose stop` deliberately, but write it as you would a real mistake: focus on what the *system* did and allowed, not on who did it.

```markdown
# Postmortem: devops-demo-app outage, 2026-07-13

Status: complete. Severity: SEV2 (full outage, short duration, no data loss).

## Summary

On 2026-07-13, devops-demo-app was completely unavailable for approximately
[N] seconds after the application container was stopped during a planned
game-day exercise. The AppDown alert detected the outage in [N] seconds.
Service was restored by restarting the container.

## Impact

- All requests to the service failed (connection refused) between [start] and [end].
- Synthetic user traffic observed [N] failed requests.
- Error budget consumed: ~[N] minutes of the 216-minute 30-day budget ([N]%).

## Timeline (all times local)

| Time | Event |
| --- | --- |
| [HH:MM:SS] | Game day begins; stack healthy; AppDown inactive |
| [HH:MM:SS] | App container stopped; user traffic begins failing (000) |
| [HH:MM:SS] | Prometheus scrape fails; AppDown enters pending |
| [HH:MM:SS] | AppDown fires |
| [HH:MM:SS] | Operator restarts the app container |
| [HH:MM:SS] | Traffic returns 200; AppDown returns to inactive; incident over |

## Contributing factors

- The service runs as a single container; there is no redundancy in the
  compose stack, so one container stopping means total outage. (Contrast:
  the Kubernetes deployment from module 7 runs 3 replicas.)
- Nothing restarts a stopped container automatically (no restart policy,
  no orchestrator supervision in this stack).
- Detection depends on a 5s scrape interval plus a 30s "for" duration —
  a floor of ~35s on time-to-alert.

## What went well

- The alert fired exactly as designed and within the expected window.
- Recovery was a single, known command; total downtime stayed within
  the planned budget spend.

## What went poorly

- User traffic failed for [N] seconds before the alert fired — detection
  is slower than impact.
- There is no runbook link on the AppDown alert; a responder unfamiliar
  with the stack would have to figure out recovery from scratch.

## Action items

| # | Action | Owner | Priority |
| --- | --- | --- | --- |
| 1 | Add a runbook for AppDown and link it in the alert annotations | [you] | High |
| 2 | Evaluate `restart: unless-stopped` policy for the app service in compose | [you] | Medium |
| 3 | Consider reducing `for:` to 15s and measuring false-positive rate | [you] | Low |
```

```bash
git add docs/postmortem-2026-07-13.md
git commit -m "Module 12: blameless postmortem for game-day outage"
```

### 6. Open the PR — the security job must pass

```bash
git push -u origin module-12-devsecops-sre
```

Open a pull request. Watch the checks: `lint`, `test`, and the new `security` job must all be green — gitleaks scanning your full history and `npm audit` reading your new lockfile. Fix anything red (see Troubleshooting), then merge.

## Deliverables

- An excerpt (a few lines) of the Trivy report for `devops-demo-app:v2`, plus the HIGH/CRITICAL-filtered result
- A green CI run on the PR that includes the passing `security` job
- `docs/slo.md` with the error budget computed (216 minutes)
- `docs/postmortem-2026-07-13.md` completed with your real game-day timestamps
- Merged PR containing `package-lock.json`, the `ci.yml` changes, `docs/slo.md`, and the postmortem

## Troubleshooting

**`npm audit` fails with `ENOLOCK` ("requires an existing lockfile").**
You skipped the lockfile generation. Run `npm install --package-lock-only` in the repo root, confirm `package-lock.json` exists, and commit it — the CI audit step needs it too.

**The gitleaks step fails with a license error.**
`gitleaks-action@v2` is free for personal GitHub accounts but requires a `GITLEAKS_LICENSE` secret for organization-owned repos. Course repos should be under your personal account; if yours is in an org, move it or obtain a license key and add it as a repository secret (`GITLEAKS_LICENSE`).

**Gitleaks reports a real finding and fails CI.**
It found something that looks like a secret in your history (possibly a leftover from module 9's exercises). Inspect the reported commit and file. If it is a real credential: rotate it immediately — removing it from history is cleanup, not remediation. If it is a known false positive (e.g. a deliberately fake example key), add a `.gitleaksignore` file containing the finding's fingerprint from the job log.

**`trivy image` says the image is not found.**
Trivy scans your local Docker images. Check `docker images | grep devops-demo-app` — if `v2` is missing, rebuild it: `docker build -t devops-demo-app:v2 .` from the repo root.

**The AppDown alert never leaves "inactive" during the game day.**
Prometheus is not evaluating your rule. Confirm the lab 11 wiring survived: `rule_files` present in `observability/prometheus.yml`, the `alerts.yml` volume mounted, and the rule visible at Status > Rules in the Prometheus UI. Also confirm you stopped the `app` service of *this* compose file, not a different container.

**`avg_over_time(up{job="demo-app"}[30d])` returns no data.**
Your local Prometheus has not been running for 30 days — it only has data since you started the stack. Use a window you actually have, like `[1h]`; the `docs/slo.md` file can still state the 30-day definition as the target.
