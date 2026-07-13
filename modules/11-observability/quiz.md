# Quiz 11: Observability

Answer all questions without notes. Multiple-choice questions have exactly one correct answer. Check yourself against the answer key at the end.

**Q1.** What is the practical test that distinguishes an observable system from a merely monitored one?

A. It has more than ten dashboards
B. You can ask a new question about its internal state without shipping new code
C. It pages an on-call engineer when CPU exceeds 90%
D. It stores logs for at least 30 days

**Q2.** For each pillar — metrics, logs, traces — name its main strength and its main weakness or cost. (short answer)

**Q3.** Classify the two metrics exposed by `devops-demo-app` at `/metrics`, and justify each classification in one clause. (short answer)

**Q4.** Which statement about a Prometheus counter is correct?

A. Its current value is the most useful thing to graph
B. It can go up and down as load changes
C. It only increases (resetting on restart), so you graph its rate of change with `rate()`, which also handles resets
D. It stores request durations in buckets so you can compute percentiles

**Q5.** Why should you graph `rate(demo_app_requests_total[1m])` instead of `demo_app_requests_total`? (short answer)

**Q6.** In Prometheus's pull model, which of the following is true?

A. Applications push samples to Prometheus whenever they have new data
B. Prometheus periodically scrapes each target's `/metrics` endpoint, and a failed scrape sets the synthetic `up` metric for that target to 0
C. Applications must link a Prometheus client library or they cannot be monitored
D. Prometheus discovers what to scrape by inspecting container logs

**Q7.** Your team has alerts for "CPU > 90%", "disk > 80%", and "pod restarted". Users report checkout has been failing for an hour, but no alert fired. Which alerting principle was violated, and what alert should exist instead? (short answer)

**Q8.** Which set correctly lists the four golden signals?

A. Latency, traffic, errors, saturation
B. Rate, errors, duration, utilization
C. CPU, memory, disk, network
D. Uptime, downtime, throughput, cost

**Q9.** The RED method applies to ______ and the USE method applies to ______.

A. resources; services
B. services (rate, errors, duration); resources (utilization, saturation, errors)
C. logs; metrics
D. production; staging

**Q10.** Give two concrete advantages of the JSON log line `{"ts":"...","method":"GET","url":"/","status":200}` over the free-text line `2026-07-13T14:02:11Z GET / 200`. (short answer)

---

## Answer Key

**A1.** B — observability means internal state can be inferred from existing telemetry, so novel (unknown-unknown) questions are answerable without new instrumentation.

**A2.** Metrics: cheap fixed-cost aggregates ideal for trends and alerting, but no per-request detail. Logs: full per-event detail, but expensive since volume scales with traffic (and they need structure to be queryable). Traces: show where time and failures occur across services for one request, but require instrumentation and are usually sampled.

**A3.** `demo_app_requests_total` is a counter because it only ever increases (and resets on restart); `demo_app_uptime_seconds` is a gauge because its current value is read directly and it drops back to zero when the process restarts.

**A4.** C — monotonic increase plus reset handling is exactly why counters are always wrapped in `rate()`; A describes the classic mistake, B a gauge, D a histogram.

**A5.** The raw counter's absolute value depends on when the process started and only climbs, so it carries almost no information; `rate()` extracts the slope — requests per second right now — which is the actual signal for dashboards and alerts.

**A6.** B — pull-based scraping is the core design, and the `up` metric produced by every scrape attempt doubles as a free availability check (the lab's `AppDown` alert is built on it).

**A7.** They alerted on causes (internal resource states) instead of symptoms (what users experience), so a user-facing failure with no matching predicted cause went unnoticed; there should be a symptom alert on the checkout error rate (or availability/latency), e.g. the fraction of failing requests exceeding a threshold.

**A8.** A — latency, traffic, errors, saturation, from Google's SRE book.

**A9.** B — RED (rate, errors, duration) is the checklist for request-driven services; USE (utilization, saturation, errors) is the checklist for hardware and software resources.

**A10.** Any two of: fields can be filtered/grouped/aggregated precisely (e.g. all `status: 404` for a given URL) instead of fragile text matching; parsers and log pipelines can ingest it without custom regexes; new fields (like a correlation ID) can be added without breaking existing queries; type-aware queries (status as a number) become possible.
