# devops-demo-app

The tiny web service used as the running example throughout the DevOps Basics course. It has zero runtime dependencies (Node.js standard library only) so labs stay focused on DevOps practices, not application code.

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /` | Greeting; accepts `?name=` query parameter |
| `GET /health` | Health/readiness check (used by Docker and Kubernetes probes) |
| `GET /metrics` | Prometheus-style plain-text metrics (used in module 11) |

## Run

```bash
node server.js
# devops-demo-app listening on port 3000

curl "http://localhost:3000/?name=Ada"
# {"message":"Hello, Ada!"}
```

## Test

```bash
npm test    # uses the built-in Node.js test runner (Node 18+)
```

## How the course uses this app

| Module | What happens to the app |
| --- | --- |
| 2 | Students copy it into their own Git repository |
| 4 | A GitHub Actions CI pipeline builds and tests it on every push |
| 5 | Linting and coverage gates are added to the pipeline |
| 6 | It gets a `Dockerfile` and runs via Docker Compose |
| 7 | It is deployed to a local Kubernetes cluster |
| 10 | It is rolled out with a canary deployment strategy |
| 11 | Its `/metrics` endpoint is scraped by Prometheus and graphed in Grafana |
| Capstone | Students assemble the full pipeline end to end |
