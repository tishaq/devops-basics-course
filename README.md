# DevOps Basics Course

A complete, self-contained DevOps fundamentals curriculum for **developers**. The course takes a small sample web application from "code on a laptop" all the way to "containerized, deployed via an automated pipeline, and monitored in production" across 12 modules plus a capstone project.

Everything is plain Markdown, so the whole course is versionable, reviewable via pull requests, and exportable to HTML or PDF.

## What's Inside

| Path | Contents |
| --- | --- |
| `SYLLABUS.md` | Schedule, prerequisites, grading breakdown |
| `modules/NN-topic/slides.md` | Marp slide deck for the lecture (~20-30 slides, with speaker notes) |
| `modules/NN-topic/handout.md` | In-depth reading document for the module |
| `modules/NN-topic/lab.md` | Hands-on lab with numbered steps, expected output, and troubleshooting |
| `modules/NN-topic/quiz.md` | 8-10 question quiz with an answer key |
| `sample-app/` | The running example app that labs build on |
| `assessments/midterm.md` | Midterm exam covering modules 1-6 |
| `capstone/brief.md` | Capstone project requirements |
| `capstone/rubric.md` | Capstone grading rubric |

## Curriculum

1. **What is DevOps?** — history, culture, CALMS, DORA metrics
2. **Git & Collaboration Workflows** — branching strategies, trunk-based development, code review
3. **Linux, Shell & Networking Essentials** — the ops knowledge developers actually need
4. **Continuous Integration** — CI concepts, GitHub Actions pipelines
5. **Testing & Quality Gates** — test pyramid, linting, coverage, static analysis
6. **Containers with Docker** — images, Dockerfiles, registries, Compose
7. **Container Orchestration with Kubernetes** — pods, deployments, services, kubectl
8. **Infrastructure as Code** — Terraform basics, state, modules
9. **Configuration & Secrets Management** — env config, Ansible intro, secrets handling
10. **Continuous Delivery & Deployment Strategies** — blue/green, canary, feature flags, GitOps
11. **Observability** — metrics, logs, traces; Prometheus & Grafana
12. **DevSecOps & SRE Fundamentals** — shift-left security, SLOs, incident response

See `SYLLABUS.md` for the week-by-week schedule and grading.

## Building the Slides

Slide decks are written for [Marp](https://marp.app/). To export them:

```bash
npm install

# Export every deck to HTML (slides.html next to each slides.md)
npm run slides:html

# Export every deck to PDF (requires a local Chrome/Chromium install)
npm run slides:pdf
```

You can also present directly in VS Code / Cursor with the "Marp for VS Code" extension, or run a live preview:

```bash
npx marp -s modules --theme-set themes/course.css
```

## Using the Course

- **Instructors:** each module is designed as one week — a lecture (slides), assigned reading (handout), a lab session, and a quiz. Speaker notes are embedded in the slide decks as HTML comments.
- **Self-learners:** read the handout, walk through the slides, do the lab, then check yourself with the quiz. Labs build on each other through the `sample-app`, so do them in order.

## Prerequisites

- Comfortable writing code in at least one language (labs use JavaScript/Node.js, but the code is intentionally simple)
- Git installed and a GitHub account
- Docker Desktop (from module 6 onward)
- A terminal and a text editor
