# DevOps Basics Course

A complete, self-contained DevOps fundamentals curriculum for **developers**. The course takes a small sample web application from "code on a laptop" all the way to "containerized, deployed via an automated pipeline, and monitored in production" across 12 modules plus a capstone project.

Everything is plain Markdown, so the whole course is versionable, reviewable via pull requests, and exportable to HTML or PDF.

## What's Inside

| Path | Contents |
| --- | --- |
| `SYLLABUS.md` | Schedule, prerequisites, grading breakdown |
| `TIMETABLE.md` | Detailed 14-week session-by-session timetable |
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

## Getting Started

### 1. Install Git

Check whether you already have it:

```bash
git --version
```

If that prints a version (any 2.x is fine), skip ahead. Otherwise:

- **macOS:** run `xcode-select --install` (installs Apple's command-line tools, including Git), or `brew install git` if you use [Homebrew](https://brew.sh/).
- **Windows:** install [Git for Windows](https://git-scm.com/download/win), which includes Git Bash — use Git Bash for the course labs, since they assume a Unix-style shell.
- **Linux (Debian/Ubuntu):** `sudo apt update && sudo apt install git`
- **Linux (Fedora/RHEL):** `sudo dnf install git`

Then tell Git who you are (used to attribute your commits):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 2. Install Node.js

The sample app and the course tooling need **Node.js 18 or newer** (20 LTS recommended). Check first:

```bash
node --version
```

If you need to install or upgrade:

- **Any platform (recommended):** install [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager), then:

```bash
nvm install 20
nvm use 20
```

  On Windows, use [nvm-windows](https://github.com/coreybutler/nvm-windows) instead.

- **macOS:** `brew install node@20`
- **Windows:** download the LTS installer from [nodejs.org](https://nodejs.org/en/download)
- **Linux (Debian/Ubuntu):** use [NodeSource](https://github.com/nodesource/distributions): `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install nodejs`

`npm` ships with Node.js — verify both:

```bash
node --version   # v20.x.x or newer
npm --version
```

### 3. Clone the repo and install dependencies

```bash
git clone https://github.com/tishaq/devops-basics-course.git
cd devops-basics-course
npm install
```

If you have an SSH key set up with GitHub, you can clone over SSH instead:

```bash
git clone git@github.com:tishaq/devops-basics-course.git
```

### 4. Sanity check

Make sure everything works by running the sample app's tests:

```bash
cd sample-app
npm test    # 6 tests should pass
cd ..
```

You're ready — start with module 1 in `modules/01-what-is-devops/`.

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

The Marp server is only for `slides.md` decks — it renders any other Markdown file as a single fixed-size slide, cutting off long documents.

## Building the Documents (handouts, labs, quizzes)

To read the handouts, labs, quizzes, and assessments in a browser as scrollable pages (with Mermaid diagrams rendered):

```bash
npm run docs:html
open dist/docs/index.html
```

Alternatively, read them as plain Markdown in your editor's preview or on GitHub.

## Using the Course

- **Instructors:** each module is designed as one week — a lecture (slides), assigned reading (handout), a lab session, and a quiz. Speaker notes are embedded in the slide decks as HTML comments.
- **Self-learners:** read the handout, walk through the slides, do the lab, then check yourself with the quiz. Labs build on each other through the `sample-app`, so do them in order.

## Prerequisites

- Comfortable writing code in at least one language (labs use JavaScript/Node.js, but the code is intentionally simple)
- Git and Node.js 18+ installed (see [Getting Started](#getting-started)) and a GitHub account
- Docker Desktop (from module 6 onward)
- A terminal and a text editor
