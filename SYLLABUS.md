# Syllabus — DevOps Basics for Developers

## Course Description

This course teaches developers the fundamentals of DevOps: the culture, practices, and tooling used to build, ship, and run software reliably and quickly. Rather than surveying tools in isolation, the course follows a single running example — a small Node.js web service in `sample-app/` — that students progressively take from local code to a containerized, pipeline-deployed, monitored service.

## Learning Outcomes

By the end of the course, students will be able to:

1. Explain DevOps culture and measure delivery performance with DORA metrics.
2. Collaborate on code using branching strategies, pull requests, and code review.
3. Operate comfortably in a Linux shell and reason about basic networking.
4. Build CI pipelines that lint, test, and package software on every change.
5. Containerize applications with Docker and run them locally with Compose.
6. Deploy and manage workloads on Kubernetes.
7. Provision infrastructure declaratively with Terraform.
8. Manage configuration and secrets safely across environments.
9. Choose and implement deployment strategies (blue/green, canary, GitOps).
10. Instrument services with metrics, logs, and traces, and define alerts.
11. Apply DevSecOps and SRE practices: shift-left security, SLOs, incident response.

## Prerequisites

- Programming experience in any language (labs use simple JavaScript/Node.js)
- Basic Git (clone, commit, push)
- A laptop capable of running Docker Desktop

## Schedule (14 weeks)

| Week | Module | Topic |
| --- | --- | --- |
| 1 | 01 | What is DevOps? |
| 2 | 02 | Git & Collaboration Workflows |
| 3 | 03 | Linux, Shell & Networking Essentials |
| 4 | 04 | Continuous Integration |
| 5 | 05 | Testing & Quality Gates |
| 6 | 06 | Containers with Docker |
| 7 | — | **Midterm exam** (modules 1-6) |
| 8 | 07 | Container Orchestration with Kubernetes |
| 9 | 08 | Infrastructure as Code |
| 10 | 09 | Configuration & Secrets Management |
| 11 | 10 | Continuous Delivery & Deployment Strategies |
| 12 | 11 | Observability |
| 13 | 12 | DevSecOps & SRE Fundamentals |
| 14 | — | **Capstone presentations** |

Each module week consists of:

- **Lecture** (~90 min) using the module slide deck
- **Reading**: the module handout
- **Lab** (~90-120 min): hands-on exercise building on the sample app
- **Quiz**: 8-10 questions, taken after the lab

## Grading

| Component | Weight |
| --- | --- |
| Module quizzes (12, lowest 2 dropped) | 20% |
| Labs (completion + write-up) | 30% |
| Midterm exam | 20% |
| Capstone project | 30% |

## Course Policies

- **Labs build on each other.** From module 4 onward, labs use the same repository students create in module 2. Falling behind on labs makes later labs harder — catch up early.
- **Collaboration** is encouraged on labs (pairing is welcome); quizzes and the midterm are individual.
- **Late work**: labs may be submitted up to one week late for 80% credit.
- **Tools**: all required tools are free (Git, GitHub, Docker Desktop, kind/minikube, Terraform, Prometheus, Grafana).

## Materials

There is no required textbook. Handouts contain further-reading links, including:

- *Accelerate* — Forsgren, Humble, Kim
- *The Phoenix Project* — Kim, Behr, Spafford
- *The DevOps Handbook* — Kim, Humble, Debois, Willis
- *Site Reliability Engineering* (free online) — Google
