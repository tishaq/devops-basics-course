---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 11: Observability"
---

<!-- _class: lead -->

# Observability

## Module 11

Knowing what your system is doing without SSHing into anything.

---

<!-- _class: section-divider -->

# Part 1: Monitoring vs Observability

---

## Monitoring: the questions you thought to ask

- Monitoring = predefined checks and dashboards for **known failure modes**
  - "Is the disk full?" "Is the process up?" "Is CPU above 90%?"
- Works well for **known-unknowns**: things you anticipated could break
- Fails at 3 a.m. when the system breaks in a way nobody predicted

In lab 10 you "judged the canary" by reading raw logs. That pain was monitoring's limit.

<!-- Frame this with the lab 10 experience: students had to eyeball kubectl logs and decide whether v2 was healthy, with no numbers and no history. Monitoring is checking a fixed list of gauges you installed in advance; it answers exactly the questions you thought of at design time and nothing else. -->

---

## Observability: the questions you did not think to ask

- Observability = can you understand **any** internal state from external outputs?
- The test: can you ask a **new question** of the running system **without shipping new code**?
  - "What is the error rate for requests with `?name=` longer than 100 chars, from the canary pods, since 14:00?"
- Known-unknowns vs **unknown-unknowns**
- Achieved by emitting rich, queryable telemetry: metrics, logs, traces

<!-- The term comes from control theory: a system is observable if its internal state can be inferred from its outputs. The practical litmus test is the "new question" one — if answering a novel question requires adding a log line and redeploying, you have monitoring, not observability. Modern systems fail in novel, emergent ways, which is why this matters more as architectures get more distributed. -->

---

<!-- _class: section-divider -->

# Part 2: The Three Pillars

---

## Pillar 1: Metrics

- Numbers, aggregated over time: counts, durations, sizes
- **Cheap**: fixed storage cost regardless of traffic (one number per interval)
- Great for: trends, dashboards, alerting, math (`rate()`, percentiles)
- Weakness: **no per-request detail** — you see *that* errors rose, not *which* request failed

```text
demo_app_requests_total 1547
demo_app_uptime_seconds 3922
```

<!-- Metrics are pre-aggregated at the source, which is why they are so cheap: a million requests and ten requests cost the same to store — one counter value. The exposition lines shown are literally what our sample app has served on /metrics since module 2. The trade-off to hammer: aggregation destroys detail; you can never get individual requests back out of a counter. -->

---

## Metric types: counter

- A value that only ever **goes up** (resets to 0 on restart)
- Examples: requests served, errors, bytes sent
- `demo_app_requests_total` is a counter — note the `_total` naming convention
- You almost never look at the raw value; you look at its **rate of change**

<!-- Counters are the workhorse metric type. The monotonic-increase property is what makes rate() mathematically sound: the difference between two samples divided by time is the throughput. The reset-on-restart behavior matters — our app's counter lives in process memory, so a redeploy zeroes it, and Prometheus's rate() function is smart enough to detect and handle those resets. -->

---

## Metric types: gauge

- A value that goes **up and down**: a snapshot of "right now"
- Examples: memory in use, active connections, queue depth, temperature
- `demo_app_uptime_seconds` is a gauge — current value is directly meaningful
- Read it raw; `rate()` on a gauge is meaningless

<!-- The distinction from a counter: with a gauge, the current value is the interesting thing (how much memory now?), whereas with a counter only the rate of change is interesting. Uptime is a slightly unusual gauge since it mostly increases, but it drops to zero on restart and its absolute value is what you read — which is what makes it a gauge, not a counter. -->

---

## Metric types: histogram

- Observations sorted into **buckets**: "how many requests took < 10ms, < 50ms, < 100ms..."
- Lets you compute **percentiles** (p50, p95, p99) across time and instances
- Essential for latency — an *average* latency hides your slowest users
- Our app does not expose one (yet) — a good capstone extension

<!-- Explain why averages lie: if 99 requests take 10ms and one takes 5 seconds, the average is ~60ms and looks fine, but one user waited 5 seconds. Percentiles from histograms expose the tail. Full histogram mechanics (bucket series, histogram_quantile) are beyond this course, but students must know the type exists and when they need it. -->

---

## Pillar 2: Logs

- Timestamped **event records** — the richest, most detailed pillar
- **Expensive**: storage scales with traffic; every request can emit lines
- Unstructured logs are grep-only. **Structured logs** (JSON) are queryable:

```json
{"ts":"2026-07-13T14:02:11.532Z","method":"GET","url":"/health","status":200}
```

- **Correlation IDs**: one ID per request, stamped on every log line it causes

<!-- The structure argument: `grep 404` works until you need "all 404s for URLs under /api from the last hour grouped by client". Structured logs turn logs into a queryable dataset. Correlation IDs extend that across services: generate an ID at the edge, pass it along in a header, log it everywhere — then one query reconstructs a request's whole story. The lab converts our app's log line to JSON. -->

---

## Pillar 3: Traces

- Follow **one request** across service boundaries
- A trace = tree of **spans**; each span = one timed operation (service call, DB query)
- Answers: "where did these 3 seconds go?" — the distributed-systems debugger
- **OpenTelemetry (OTel)**: the vendor-neutral standard for emitting all telemetry
  - Instrument once, ship to any backend (Jaeger, Tempo, vendor tools)

<!-- With one service, a trace is boring; with thirty, it is the only way to see that a checkout request spent 2.8 of its 3 seconds waiting on a recommendation service nobody thought was involved. OpenTelemetry matters strategically: it decouples instrumentation (in your code, hard to change) from the backend (a purchasing decision, easy to change). We stay at concept level — our single-service app has no cross-service hops to trace. -->

---

## The pillars compared

| | Metrics | Logs | Traces |
| --- | --- | --- | --- |
| Cost | Cheap, fixed | Expensive, scales with traffic | Medium (usually sampled) |
| Detail | Aggregates only | Full per-event detail | Per-request, cross-service |
| Best at | Trends, alerting | Investigating specifics | Locating latency/failures across services |
| Question | "How much? How fast?" | "What exactly happened?" | "Where in the chain?" |

Use them **together**: an alert (metrics) leads to a trace, which leads to logs.

<!-- Give the canonical workflow: a metric alert fires (error rate up), a trace shows which hop in the request path fails, the logs of that service tell you why. No single pillar answers all three questions. The quiz asks about these trade-offs directly, especially the cost/detail tension between metrics and logs. -->

---

<!-- _class: section-divider -->

# Part 3: Prometheus and Grafana

---

## Prometheus architecture: pull, not push

```text
  Prometheus  --HTTP GET /metrics every 5s-->  app:3000
     |                                          (target)
  stores time series locally; evaluates alert rules
```

- Prometheus **scrapes** targets on a schedule — apps just expose a text endpoint
- Pull benefits: Prometheus knows immediately when a target is **down** (`up` metric = 0), config lives centrally, apps stay dumb
- Our app has been Prometheus-ready since module 2

<!-- The pull model surprises people used to agents pushing data. Two big wins: first, target health falls out for free — a failed scrape sets the synthetic up metric to 0, which the lab uses for its AppDown alert; second, the application needs zero knowledge of the monitoring system, just a text endpoint. Push gateways exist for batch jobs, but pull is the default. -->

---

## The exposition format

What Prometheus sees when it scrapes `http://app:3000/metrics`:

```text
demo_app_requests_total 1547
demo_app_uptime_seconds 3922
```

- Plain text: `metric_name value` — deliberately trivial to produce
- Real exporters add `# HELP` / `# TYPE` comments and **labels**:

```text
http_requests_total{method="GET",status="200"} 1204
```

- Labels create **dimensions** you can filter and group by in queries

<!-- Show that this is not magic: our app produces the format with a template string, no library. Labels are the power feature of real exporters — one metric name becomes a family of time series sliced by method, status, endpoint. Warn about cardinality: a label with unbounded values (like user ID) creates unbounded time series and melts Prometheus. -->

---

## PromQL: querying time series

```promql
demo_app_requests_total            # raw counter: an ever-climbing line
demo_app_uptime_seconds            # gauge: read directly
rate(demo_app_requests_total[1m])  # requests PER SECOND, averaged over 1m
```

- `rate()` computes the **per-second rate of change** of a counter over a window
- It handles counter resets (restarts) automatically
- The `up{job="demo-app"}` metric: 1 if the last scrape succeeded, 0 if not

<!-- Live-demo these three queries if you have the lab stack running; the visual difference between the climbing counter and the flat-ish rate line teaches more than any slide. The [1m] range selector says "look at the last minute of samples to compute the rate" — larger windows give smoother but laggier lines. -->

---

## Why you never graph a raw counter

- A raw counter is a line that only climbs — its **slope** is the information
- "1,547 total requests" tells you nothing without *since when*
- `rate(demo_app_requests_total[1m])` answers the real question: **how busy are we right now?**
- Rule of thumb: counters are always wrapped in `rate()` (or `increase()`) before graphing or alerting

<!-- This is the most common beginner mistake in Prometheus and a guaranteed quiz question. A graph of the raw counter looks like a mountain range going up forever and is unreadable; the same data through rate() shows traffic ebbing and flowing. increase() is rate() times the window length — total new requests in the window — useful for human-friendly numbers. -->

---

## Grafana: dashboards on top

- Grafana = visualization layer; Prometheus = storage + query engine
- **Data source**: where Grafana sends queries (our Prometheus, at `http://prometheus:9090`)
- **Dashboard**: a grid of **panels**; each panel = one query + one visualization
  - Time series panel for `rate(...)`, stat/gauge panel for current values
- One Grafana can front many data sources: Prometheus, Loki (logs), Tempo (traces)

<!-- Position the division of labor clearly: Prometheus scrapes, stores, and evaluates; Grafana only asks Prometheus questions and draws the answers. In the lab, the data source URL is http://prometheus:9090 — the container DNS name, not localhost, because Grafana resolves it from inside the compose network. That trips up nearly every student, so flag it now. -->

---

<!-- _class: section-divider -->

# Part 4: Alerting and What to Watch

---

## Alerting philosophy: symptoms, not causes

- Alert on what **users experience** (symptoms): error rate, latency, availability
- Not on internal states (causes): CPU high, disk 80%, pod restarted
- Why: causes without symptoms are noise; symptoms catch causes you never predicted
- Every page should be: **urgent, actionable, and user-impacting**

<!-- The classic counterexample: "CPU > 90%" pages someone at 2 a.m. while users are perfectly happy — the service absorbed it. Meanwhile the failure mode nobody predicted sails past the cause-based alerts until users notice. A symptom alert (error rate, latency) catches every cause, including the novel ones. Cause-level signals belong on dashboards for diagnosis, not in pagers. -->

---

## Alert fatigue and runbooks

- Noisy alerts train humans to **ignore alerts** — the worst possible outcome
- If it is not actionable at 3 a.m., it should not page (email/ticket instead)
- Every alert links to a **runbook**: what this means, how to verify, what to do
- Review alerts regularly: delete ones that never fire or always get ignored

```yaml
- alert: AppDown
  expr: up{job="demo-app"} == 0
  for: 30s
```

<!-- The `for: 30s` clause is anti-fatigue engineering in one line: the condition must hold for 30 seconds before firing, so a single blipped scrape does not page anyone. Tell the story of alarm fatigue from hospitals — the same human factors apply. The lab writes exactly this AppDown rule and watches it move through inactive, pending, firing. -->

---

## The four golden signals

| Signal | Question | Example metric |
| --- | --- | --- |
| **Latency** | How long do requests take? | p95 request duration |
| **Traffic** | How much demand? | `rate(demo_app_requests_total[1m])` |
| **Errors** | What fraction fails? | rate of non-2xx / rate of all |
| **Saturation** | How full is the system? | memory %, queue depth |

From Google's SRE book — if you can only measure four things, measure these.

<!-- These four cover the user experience (latency, errors), the load (traffic), and the headroom (saturation). Map them to our app: traffic we have via the request counter; latency and errors would need a histogram and a status-code label — good capstone work. Saturation is the leading indicator: it predicts problems before they become symptoms. -->

---

## RED and USE: two mnemonics

- **RED** — for **services** (request-driven):
  - **R**ate, **E**rrors, **D**uration — the golden signals minus saturation
- **USE** — for **resources** (CPUs, disks, queues):
  - **U**tilization, **S**aturation, **E**rrors
- Method: for every service, check RED; for every resource, check USE

<!-- RED (Tom Wilkie) and USE (Brendan Gregg) are checklists that make "what should I monitor?" mechanical. For a microservice you dashboard rate, errors, duration; for the node it runs on you dashboard utilization, saturation, errors. Together they cover the golden signals from both the service's and the machine's point of view. -->

---

## SLIs: measurement with intent

- **Service Level Indicator**: a metric chosen to represent user-perceived quality
  - "Fraction of requests answering in < 300ms"
  - "Fraction of scrapes where the app was up"
- SLIs turn "is the service good?" into a number you can track and target
- Next module: put a **target** on an SLI (an SLO) and manage an **error budget**

<!-- This slide is deliberately a cliffhanger for module 12. The shift in thinking: an SLI is not just any metric, it is a metric selected because it correlates with user happiness. Once you have that number, you can set a target for it — and everything about error budgets and release freezes follows. Students define a real SLI for the demo app in lab 12. -->

---

## Summary

- Monitoring answers **predefined** questions; observability lets you ask **new** ones without new code
- Three pillars: **metrics** (cheap aggregates), **logs** (rich, expensive, structure them as JSON), **traces** (cross-service request paths, OpenTelemetry)
- Counter vs gauge vs histogram — and `demo_app_requests_total` vs `demo_app_uptime_seconds`
- Prometheus **pulls** `/metrics`; never graph a raw counter — use `rate()`
- Grafana visualizes what Prometheus stores
- Alert on **symptoms**, keep pages actionable, write runbooks
- Golden signals / RED / USE tell you what to measure; SLIs formalize it

<!-- Retrieval practice: ask the class to classify demo_app_requests_total and demo_app_uptime_seconds, then ask why rate() applies to one and not the other. Then ask which golden signal our app cannot currently report (latency — no histogram) and what it would take to add it. -->

---

## Next up

**Module 12: DevSecOps & SRE Fundamentals**

- Security shifts left into the pipeline: scanning code, dependencies, and images
- SRE: SLOs and error budgets built on the SLIs you just met
- Incidents, on-call, and blameless postmortems — using this module's alerting

Lab 11 first: stand up Prometheus + Grafana next to your app, graph its metrics, and make an alert fire.

<!-- Preview the connection: module 12's SLO exercise queries the exact Prometheus stack students build in lab 11, and the game-day exercise deliberately triggers the AppDown alert they write today. Nothing in lab 11 is throwaway. -->
