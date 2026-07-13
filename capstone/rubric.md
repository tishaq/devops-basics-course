# Capstone Grading Rubric

Total: 100 points. Scores within each row: **Full** (meets all criteria), **Partial** (works with gaps), **Minimal** (attempted but substantially incomplete), **Missing** (0).

## Pipeline (70 points)

### Source Control & Collaboration — 10 points

| Score | Criteria |
| --- | --- |
| 9-10 | Protected main with required CI check; 8+ focused PRs with descriptive titles and at least some review discussion; clean history; `v1.0.0` tag present |
| 6-8 | PR workflow used but PRs are large or descriptions thin; protection or tag partially configured |
| 1-5 | Some PRs exist but significant work committed directly to main, or protection absent |
| 0 | No meaningful use of PRs |

### Continuous Integration — 15 points

| Score | Criteria |
| --- | --- |
| 13-15 | Lint, test (with Node version matrix), and security jobs all green on main; smoke test verifies the health endpoint; pipeline under 5 minutes; check is required for merge |
| 9-12 | All jobs present and green but missing the matrix, the smoke test, or the required-check wiring |
| 4-8 | CI runs but a required job is missing or intermittently red |
| 1-3 | Workflow exists but does not meaningfully gate anything |
| 0 | No CI |

### Containerization — 10 points

| Score | Criteria |
| --- | --- |
| 9-10 | Pinned base image, cache-friendly layer order, non-root USER, .dockerignore, SHA-based tagging documented; image builds and runs cleanly |
| 6-8 | Image works but one or two hygiene items missing (e.g. runs as root, no .dockerignore) |
| 1-5 | Image builds but with substantial problems (unpinned base, bloated context, secrets or junk in image) |
| 0 | No working Dockerfile |

### Kubernetes Deployment & Configuration — 15 points

| Score | Criteria |
| --- | --- |
| 13-15 | Deployment (3+ replicas, both probes, requests/limits) and Service correct; config via ConfigMap and at least one Secret; app demonstrably running on the cluster |
| 9-12 | App runs on the cluster but probes, resources, or the ConfigMap/Secret split is incomplete |
| 4-8 | Manifests exist and mostly apply but the app is not reliably reachable, or configuration is hardcoded |
| 1-3 | Manifests present but do not produce a running app |
| 0 | No Kubernetes deployment |

### Deployment Strategy (Canary or Blue/Green) — 10 points

| Score | Criteria |
| --- | --- |
| 9-10 | v1-to-v2 rollout executed with the chosen strategy; traffic split or cutover demonstrated with evidence (curl counts, selector states); promotion and rollback both performed and documented |
| 6-8 | Strategy implemented and promotion shown, but rollback not demonstrated or evidence thin |
| 1-5 | Manifests for the strategy exist but the rollout was not actually demonstrated |
| 0 | Plain `kubectl apply` of a new image with no strategy |

### Observability — 10 points

| Score | Criteria |
| --- | --- |
| 9-10 | Prometheus scraping the app (target UP); Grafana dashboard with 3+ meaningful panels including a rate() panel; alert rule demonstrated firing and recovering |
| 6-8 | Scraping and dashboard work but the alert was not demonstrated, or panels are trivial |
| 1-5 | Stack runs but is not actually wired to the app |
| 0 | No observability stack |

## Documentation (15 points)

### Runbook — 5 points

Deploy, rollback, and alert-response procedures accurate enough that a stranger could follow them (5); present but incomplete or out of date with the actual system (2-4); missing or unusable (0-1).

### SLO Document — 5 points

SLI precisely defined with its measurement query, sensible target, correctly computed error budget (5); definition or arithmetic flawed (2-4); missing (0-1).

### Postmortem — 5 points

Blameless tone, real timeline with timestamps from the game day, contributing factors, actionable items with owners (5); template filled but shallow or blameful (2-4); missing (0-1).

## Presentation (15 points)

| Points | Component |
| --- | --- |
| 5 | Live pipeline demo: change flows PR to CI to merge to deploy without manual fudging |
| 4 | Rollout and failure demo: strategy shown, alert fires, system recovered |
| 3 | Clarity of explanation: design decisions and trade-offs articulated, questions answered credibly |
| 3 | Time management and participation: within 10 minutes, all members present a part |

## Deductions

| Deduction | Reason |
| --- | --- |
| -10 | A real credential committed anywhere in history (even if later rotated) |
| -5 | CI red on `main` at submission time |
| -5 | README missing the from-scratch setup instructions, or they do not work |
| -3 | Late submission (per day, maximum 3 days, then 0) |

## Grade Bands

| Points | Grade |
| --- | --- |
| 90-100 | Excellent — production-credible pipeline and operations |
| 75-89 | Good — everything works, minor hygiene gaps |
| 60-74 | Satisfactory — core pipeline works, weak edges |
| 40-59 | Marginal — significant components missing or not demonstrated |
| 0-39 | Unsatisfactory |
