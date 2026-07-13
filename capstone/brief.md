# Capstone Project Brief — Ship It

## Overview

The capstone is the final deliverable of the course and is worth 30% of your grade. You will take a provided sample application and build a complete, working DevOps pipeline around it: version control workflow, continuous integration with quality gates, containerization, an automated deployment to Kubernetes, a monitored production-like environment, and the operational documentation a real team would expect.

You have already practiced every individual piece in the labs. The capstone is about assembling them into one coherent, defensible system — and being able to explain your choices.

## The Application

Use the course sample app (`sample-app/`, the `devops-demo-app` service) **or** a small application of your own, subject to instructor approval. If you bring your own app it must:

- Expose an HTTP interface with at least a health endpoint
- Have an automated test suite (even a small one)
- Be containerizable

Most students should use the sample app. Bringing your own app earns no extra credit by itself — the grading is on the pipeline, not the application.

## Requirements

Your submission is a single GitHub repository containing the application and everything below.

### 1. Source Control & Collaboration (module 2)

- `main` branch is protected: changes land only through pull requests with the CI check required.
- History shows a real PR-based workflow (at least 8 meaningful PRs across the project, not one giant "add everything" PR).
- A tagged release `v1.0.0` marking your finished pipeline.

### 2. Continuous Integration (modules 4-5)

- A GitHub Actions workflow that runs on every PR and push to `main` with at least three jobs or clearly separated stages:
  - **Lint** — static analysis must pass.
  - **Test** — the full test suite, run against at least two Node.js versions (matrix).
  - **Security** — secret scanning (gitleaks) and dependency audit.
- A smoke test step that starts the service and verifies the health endpoint.
- The workflow completes in under 5 minutes.

### 3. Containerization (module 6)

- A production-quality `Dockerfile`: pinned base image, correct layer ordering for caching, non-root `USER`, no secrets baked in.
- A `.dockerignore`.
- Images tagged with the git SHA (document your tagging convention in the README).

### 4. Deployment (modules 7, 10)

- Kubernetes manifests (`k8s/`) deploying the app to a local kind or minikube cluster:
  - Deployment with at least 3 replicas, readiness and liveness probes, and resource requests/limits.
  - A Service fronting the pods.
  - Configuration supplied via ConfigMap; at least one value supplied via a Secret (module 9).
- A demonstrated deployment strategy for shipping v2 of the app: **either** a canary (two Deployments behind one Service) **or** blue/green (selector flip). Include the manifests for both versions and document the promotion and rollback procedure you executed.

### 5. Observability (module 11)

- A Prometheus + Grafana stack (Docker Compose is fine) scraping the app's `/metrics` endpoint.
- A Grafana dashboard with at least three panels, including request rate (a `rate()` query) and uptime.
- At least one alert rule (e.g. `AppDown`) that you demonstrate firing and recovering.

### 6. Operations Documentation (modules 3, 12)

In a `docs/` directory:

- `runbook.md` — how to deploy, roll back, and respond to the `AppDown` alert. Written for a teammate who has never seen the project.
- `slo.md` — one availability SLO with its SLI definition, target, and computed monthly error budget.
- `postmortem.md` — a blameless postmortem of a failure you deliberately induced (game day), using the module 12 template with a real timeline.

### 7. README

The repository README must include: architecture overview (a diagram is expected — Mermaid is fine), how to run everything from scratch on a clean machine, the CI badge, and a short "design decisions" section (5-10 bullet points explaining trade-offs you chose).

## Presentation

You will give a 10-minute live demo in week 14:

1. Push a small change through the full pipeline (PR, CI, merge).
2. Deploy it with your chosen strategy and show the rollout.
3. Show the dashboard reflecting live traffic.
4. Break something, show the alert fire, and recover.

Plus 5 minutes of Q&A. Every group member must present a part.

## Rules & Logistics

- Work solo or in pairs (pairs are held to a visibly higher standard on scope and polish, and both members must have a substantial commit history).
- All infrastructure must be free/local: GitHub free tier, Docker Desktop, kind/minikube. No cloud account is required, and using one earns no extra credit.
- **Never commit real credentials.** A leaked real secret in your repository is an automatic 10-point deduction, even if rotated.
- Milestone check-in at the end of week 12: repository with CI and containerization complete (sections 1-3). Ungraded, but skipping it forfeits the right to argue about scope at grading time.
- Submit the repository URL and your `v1.0.0` tag by the start of week 14.

## Grading

See [rubric.md](rubric.md) for the detailed 100-point breakdown. In short: 70 points for the working pipeline (sections 1-5), 15 for documentation, 15 for the presentation.

Start early. The single most common capstone failure mode is discovering in week 13 that the pieces work individually but not together.
