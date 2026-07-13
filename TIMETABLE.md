# Course Timetable — 14 Weeks

This timetable assumes **two live sessions per week** plus independent work:

- **Session 1 — Lecture** (90 min): slide deck walkthrough with discussion.
- **Session 2 — Lab** (120 min): hands-on, instructor-supported. Labs build on each other in the student's `devops-demo-app` repository.
- **Independent work** (2-3 hrs/week): handout reading before Session 1, lab completion and quiz after Session 2.

Suggested rhythm: Session 1 early in the week (e.g. Monday or Tuesday), Session 2 later (e.g. Thursday or Saturday), quiz submitted by Sunday night. Adjust days to suit — the sequence is what matters.

## Week-by-Week Schedule

### Week 1 — Module 01: What is DevOps?


| When                | Activity                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/01-what-is-devops/handout.md`                                  |
| Session 1 (90 min)  | Lecture: history, culture, CALMS, Three Ways, DORA metrics                   |
| Session 2 (120 min) | Lab 01: environment setup, run the sample app, value-stream mapping exercise |
| By end of week      | Submit `lab01.md` write-up and Quiz 01                                       |


### Week 2 — Module 02: Git & Collaboration Workflows


| When                | Activity                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/02-git-collaboration/handout.md`                                                                 |
| Session 1 (90 min)  | Lecture: branching strategies, trunk-based development, PRs and review                                         |
| Session 2 (120 min) | Lab 02: create your own `devops-demo-app` repo, branch protection, first PR, conflict resolution, tag `v1.0.0` |
| By end of week      | Repo link + merged PR + Quiz 02                                                                                |


**Milestone: the repository created this week is used in every remaining lab.**

### Week 3 — Module 03: Linux, Shell & Networking Essentials


| When                | Activity                                                                             |
| ------------------- | ------------------------------------------------------------------------------------ |
| Before Session 1    | Read `modules/03-linux-shell-networking/handout.md`                                  |
| Session 1 (90 min)  | Lecture: processes and signals, permissions, shell, HTTP and ports                   |
| Session 2 (120 min) | Lab 03: signals and graceful shutdown, log wrangling, `healthcheck.sh` script via PR |
| By end of week      | Merged PR + recorded outputs + Quiz 03                                               |


### Week 4 — Module 04: Continuous Integration


| When                | Activity                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/04-continuous-integration/handout.md`                                          |
| Session 1 (90 min)  | Lecture: CI principles, GitHub Actions anatomy, fast feedback                                |
| Session 2 (120 min) | Lab 04: build `ci.yml`, break and fix the build, Node version matrix, required checks, badge |
| By end of week      | Green workflow run + Quiz 04                                                                 |


### Week 5 — Module 05: Testing & Quality Gates


| When                | Activity                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/05-testing-quality-gates/handout.md`                           |
| Session 1 (90 min)  | Lecture: test pyramid, flaky tests, coverage, static analysis, quality gates |
| Session 2 (120 min) | Lab 05: ESLint setup, coverage, lint job in CI, smoke test step              |
| By end of week      | Green two-job pipeline + Quiz 05                                             |


### Week 6 — Module 06: Containers with Docker


| When                | Activity                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Before Session 1    | Read `modules/06-containers-docker/handout.md`; install Docker Desktop                           |
| Session 1 (90 min)  | Lecture: images vs containers, Dockerfile, layers and caching, Compose                           |
| Session 2 (120 min) | Lab 06: Dockerfile, build and run, layer-cache experiment, `docker-compose.yml` with healthcheck |
| By end of week      | Healthy `compose ps` output + merged PR + Quiz 06                                                |


### Week 7 — Midterm


| When               | Activity                                                  |
| ------------------ | --------------------------------------------------------- |
| Session 1 (90 min) | Review session: modules 1-6, practice questions, open Q&A |
| Session 2 (90 min) | **Midterm exam** (`assessments/midterm.md`) — closed book |
| By end of week     | Instructor returns graded midterm with feedback           |


No new module this week — use spare time to catch up on any incomplete labs.

### Week 8 — Module 07: Container Orchestration with Kubernetes


| When                | Activity                                                                                |
| ------------------- | --------------------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/07-kubernetes/handout.md`; install kind                                   |
| Session 1 (90 min)  | Lecture: architecture, Deployments, Services, probes, kubectl                           |
| Session 2 (120 min) | Lab 07: kind cluster, deploy 3 replicas, self-healing demo, rolling update and rollback |
| By end of week      | `kubectl get all` output + merged PR + Quiz 07                                          |


### Week 9 — Module 08: Infrastructure as Code


| When                | Activity                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/08-infrastructure-as-code/handout.md`; install Terraform                       |
| Session 1 (90 min)  | Lecture: IaC principles, Terraform workflow, state, modules                                  |
| Session 2 (120 min) | Lab 08: Terraform with the Docker provider, plan/apply, drift detection and healing, destroy |
| By end of week      | Plan output + drift demo + merged PR + Quiz 08                                               |


### Week 10 — Module 09: Configuration & Secrets Management


| When                | Activity                                                                          |
| ------------------- | --------------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/09-config-secrets/handout.md`                                       |
| Session 1 (90 min)  | Lecture: 12-factor config, ConfigMaps and Secrets, Vault concepts, Ansible intro  |
| Session 2 (120 min) | Lab 09: env-driven config, ConfigMap and Secret on the cluster, gitleaks scanning |
| By end of week      | Secret decode demo + gitleaks output + merged PR + Quiz 09                        |


### Week 11 — Module 10: Continuous Delivery & Deployment Strategies


| When                | Activity                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/10-continuous-delivery/handout.md`                             |
| Session 1 (90 min)  | Lecture: CD vs CDep, blue/green, canary, feature flags, GitOps               |
| Session 2 (120 min) | Lab 10: canary rollout of v2, traffic-split measurement, promotion, rollback |
| By end of week      | Curl-loop counts + rollout history + Quiz 10                                 |


**Capstone kickoff: read `capstone/brief.md` this week and choose solo or pair.**

### Week 12 — Module 11: Observability


| When                | Activity                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| Before Session 1    | Read `modules/11-observability/handout.md`                               |
| Session 1 (90 min)  | Lecture: metrics, logs, traces, Prometheus, Grafana, alerting philosophy |
| Session 2 (120 min) | Lab 11: Prometheus + Grafana stack, dashboard panels, firing alert       |
| By end of week      | Dashboard + alert demo + Quiz 11                                         |


**Capstone milestone check-in: repository with CI and containerization complete (brief sections 1-3).**

### Week 13 — Module 12: DevSecOps & SRE Fundamentals


| When                | Activity                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Before Session 1    | Read `modules/12-devsecops-sre/handout.md`                                                |
| Session 1 (90 min)  | Lecture: shift-left security, scanning toolbox, SLOs and error budgets, incident response |
| Session 2 (120 min) | Lab 12: Trivy scan, security job in CI, SLO document, game day and postmortem             |
| By end of week      | Green CI with security job + postmortem + Quiz 12                                         |


### Week 14 — Capstone


| When                | Activity                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Early in week       | Submit repository URL and `v1.0.0` tag (per `capstone/brief.md`)                               |
| Session 1 (90 min)  | Final working session: instructor office hours, dry-run of the demo                            |
| Session 2 (~60 min) | **Capstone presentation**: 10-minute live demo + 5-minute Q&A, graded per `capstone/rubric.md` |
| End of course       | Final grades: quizzes 20%, labs 30%, midterm 20%, capstone 30%                                 |


## Weekly Time Budget Summary


| Component             | Hours/week  |
| --------------------- | ----------- |
| Lecture session       | 1.5         |
| Lab session           | 2.0         |
| Reading (handout)     | 1.0         |
| Lab completion + quiz | 1.0-2.0     |
| **Total**             | **5.5-6.5** |


Total course commitment: roughly 80-90 hours over 14 weeks, of which about 45 are live instructor-led sessions.

## Catch-Up Policy

Labs are cumulative. If a lab is incomplete by the next week's Session 2, schedule a catch-up before proceeding — modules 7 onward assume every earlier lab artifact (repo, CI pipeline, Dockerfile, cluster) exists and works.