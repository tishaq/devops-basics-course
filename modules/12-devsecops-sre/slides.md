---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 12: DevSecOps & SRE Fundamentals"
---

<!-- _class: lead -->

# DevSecOps & SRE Fundamentals

## Module 12

Making the pipeline secure — and the service reliable — by design.

---

<!-- _class: section-divider -->

# Part 1: Shift-Left Security

---

## Security was the last wall left

- Module 1 tore down the Dev/Ops wall — but security stayed a **late gate**
- Traditional model: build for months, then a security review the week before launch
- Result: findings arrive when they are **most expensive** to fix, so they get waived
- **DevSecOps**: security is automated into the pipeline and shared by the whole team

<!-- Frame this as the same story as module 1, one wall later: a specialist team at the end of the process, throwing findings over a wall, with every incentive to become a bottleneck or be bypassed. The fix is also the same: shared ownership plus automation. Security teams shift from gatekeepers to toolsmiths who build the guardrails developers run on every commit. -->

---

## Shift left: the cost curve

| Vulnerability found during... | Typical cost to fix |
| --- | --- |
| Design review | Change a diagram |
| Coding (IDE/CI feedback) | Minutes — edit and re-push |
| Code review / test stage | Hours |
| Production | Incident + patch + possible **breach**, disclosure, reputation |

Shifting left = moving detection toward the cheap end, automatically, on every change.

<!-- The same defect-cost curve applies to security as to bugs, but the right-hand tail is much worse: a production vulnerability is not just an outage risk but a breach risk, with legal and reputational cost attached. The pitch to developers: shift-left security is mostly about fast feedback, exactly like CI — nobody wants a pentest finding six months after they wrote the code. -->

---

<!-- _class: section-divider -->

# Part 2: The Pipeline Security Toolbox

---

## Mapping tools to pipeline stages

| Stage | Check | Tool examples |
| --- | --- | --- |
| Commit | **Secret scanning** | gitleaks |
| Dependencies | **SCA** | npm audit, Dependabot |
| Source code | **SAST** | CodeQL, Semgrep |
| Image build | **Image scanning** | Trivy |
| Running app | **DAST** | OWASP ZAP |

Each catches a different class of problem — they complement, not replace, each other.

<!-- This table is the skeleton of the next five slides; keep returning to it. The key exam-level skill is knowing which tool class catches which problem: a leaked AWS key (secret scanning), a vulnerable lodash version (SCA), SQL injection in your own code (SAST), an outdated OpenSSL in the base image (image scanning), a misconfigured header only visible at runtime (DAST). -->

---

## Secret scanning: gitleaks

- Finds credentials committed to Git: API keys, tokens, private keys
- Scans **history too** — a secret deleted in the next commit is still in the repo
- You met gitleaks in module 9; today it becomes a **CI job** on every push
- A leaked secret is not "removed" by a new commit — it must be **rotated**

<!-- Reinforce the module 9 lesson with the operational rule: once a secret has touched a public remote, treat it as compromised and rotate it; rewriting history is cleanup, not remediation. Running gitleaks in CI turns an occasional manual check into a permanent gate — the lab adds exactly that job. -->

---

## SCA: your dependencies are your attack surface

- **Software Composition Analysis**: scan dependencies for known CVEs
- Typical app: your code is a thin layer on hundreds of transitive packages
- Tools: `npm audit` (on demand), **Dependabot** (continuous PRs to bump versions)
- The **supply chain problem**: attackers publish or compromise packages
  - **Typosquatting**: `lodahs` instead of `lodash` — one typo installs malware
  - **Lockfiles** (`package-lock.json`) pin exact versions — same tree every install

<!-- Our demo app has zero dependencies precisely so students can see how unusual that is — ask how many transitive dependencies their day-job projects pull in (often thousands). The lockfile point matters even at zero deps: it is an integrity statement about what npm install may do, and the lab has students generate and commit one. Mention event-stream or left-pad as real-world supply chain stories. -->

---

## SAST: scanning your own code

- **Static Application Security Testing**: analyze source without running it
- Finds: injection patterns, unsafe deserialization, path traversal, hardcoded crypto keys
- Tools: **CodeQL** (queries over a semantic code database; free for public GitHub repos), **Semgrep** (fast, pattern-based rules)
- Trade-off: false positives — tune rules or triage findings, or the team ignores the tool

<!-- Concept level is fine here. The distinction from SCA: SCA finds known vulnerabilities in code you imported; SAST finds suspicious patterns in code you wrote. The false-positive warning is practical: an untriaged SAST report with 400 findings gets ignored, which is worse than a tuned one with 12 real findings — the alert-fatigue lesson from module 11 applies to security tooling too. -->

---

## Container image scanning: Trivy

```bash
trivy image devops-demo-app:v2
trivy image --severity HIGH,CRITICAL devops-demo-app:v2
```

- Scans **two layers**: OS packages of the base image (alpine's apk packages) + application dependencies (npm, pip...)
- Your app code can be perfect while the base image ships a vulnerable OpenSSL
- Fixes: bump the base image tag, rebuild regularly (patches arrive without your code changing)

<!-- The insight students miss: an image is a snapshot of an OS, so it ages — an image that scanned clean in January can be riddled with CVEs by June with zero code changes, because new vulnerabilities were published against the packages it froze. That is why teams rebuild and rescan on a schedule, not just on code change. The lab runs both commands against the v2 image. -->

---

## DAST: testing the running application

- **Dynamic Application Security Testing**: probe the deployed app over HTTP
- Finds what static analysis cannot: auth bypasses, misconfigured headers/TLS, injection confirmed against real responses
- Tool example: OWASP ZAP against a staging environment
- Slowest and latest of the tool classes — complements, never replaces, the earlier ones

<!-- One slide of awareness is enough. Position it in the funnel: DAST runs against a deployed environment, so it is the most realistic and the most expensive check, typically nightly or pre-release against staging rather than on every commit. If a finding appears here that SAST or SCA could have caught, that is a signal to improve the earlier gates. -->

---

## Least privilege for pipelines

```yaml
# top of ci.yml — applies to the whole workflow
permissions:
  contents: read
```

- The default `GITHUB_TOKEN` can often **write** to your repo — most jobs only need to read
- A compromised action (supply chain again) inherits your token's permissions
- Rule: grant the minimum; widen per-job only where needed
- Same principle everywhere: deploy keys, cloud IAM roles, cluster credentials

<!-- Connect this to the GitOps credential discussion in module 10 — it is the same principle at a different layer. The threat model to describe: you add a third-party action, that action's repo gets compromised, and the malicious version runs with whatever GITHUB_TOKEN permissions your workflow granted. contents: read turns that from "attacker can push code" into "attacker can read a public repo". The lab sets this line. -->

---

## Signing and provenance (briefly)

- How do you know an artifact was built by **your pipeline** from **your source**?
- **Provenance**: attested metadata — who built what, from which commit, on which system
- **SLSA**: a maturity framework (levels) for supply-chain integrity
- **Sigstore / cosign**: sign container images; verify signatures before deploy
- Concept level for this course — know the terms and the problem they solve

<!-- Keep this to two minutes. The motivating question is enough: if your registry were compromised and an attacker pushed an image tagged like yours, would your cluster notice? Signing plus verify-before-deploy answers it. SLSA gives teams a ladder to climb rather than a binary pass/fail. -->

---

## OWASP Top 10: know the classics

- The canonical list of the most critical web application security risks
- Perennials: **broken access control**, **injection**, cryptographic failures, security misconfiguration, vulnerable & outdated components
- Not a checklist to "complete" — a shared vocabulary and awareness baseline
- Map: SCA covers "vulnerable components"; SAST helps with injection; access control needs **humans and tests**

<!-- The point of this slide is vocabulary, not memorization: developers should recognize the categories and know that tooling covers only some of them. Broken access control — the number one item — is a logic problem that no scanner reliably finds; it needs code review and tests. That is the argument for security being a team skill, not a tool purchase. -->

---

<!-- _class: section-divider -->

# Part 3: SRE — Reliability as an Engineering Problem

---

## What is SRE?

> "SRE is what happens when you ask a software engineer to design an operations team." — Ben Treynor Sloss, Google

- Treat operations as a **software problem**: automate it, measure it, engineer it
- SRE teams cap manual work and spend the rest on engineering
- DevOps is the philosophy; SRE is one concrete, opinionated implementation
- Core instruments: **SLIs, SLOs, error budgets, toil budgets, blameless postmortems**

<!-- Position SRE relative to the whole course: everything so far — CI, IaC, observability — is what SRE-style operations engineering looks like in practice. The Google framing is useful because it explains the vibe: apply software engineering instincts (automation, measurement, design) to the problem of keeping systems running. -->

---

## SLI, SLO, SLA — three different things

| | What it is | Example for our app |
| --- | --- | --- |
| **SLI** | A *measurement* of service quality | Fraction of successful `/health` checks |
| **SLO** | An internal *target* for the SLI | 99.9% over a rolling month |
| **SLA** | A *contract* with consequences | 99.5% or the customer gets credits |

- SLO is stricter than SLA on purpose: the SLO is your tripwire, the SLA your legal floor
- No SLI, no SLO — you cannot target what you do not measure (module 11)

<!-- Drill the one-word anchors: indicator = measurement, objective = target, agreement = contract. The layering matters: you promise customers less than you demand of yourself, so breaching the internal target triggers action long before money is owed. Module 11's SLI slide set this up; now it gets teeth. -->

---

## Error budgets: 100% is the wrong target

- Users cannot tell 99.99% from 100% — their wifi is worse than that
- Each extra nine costs roughly **10x** more engineering
- **Error budget = 1 − SLO**: the unreliability you are *allowed* to spend
  - SLO 99.9%/month gives a budget of ~43 minutes of downtime
  - SLO 99.5% over 30 days: 0.005 x 30 x 24 x 60 = **216 minutes**
- Spend it on: releases, experiments, planned maintenance

<!-- Do the 216-minute arithmetic live on the slide — the quiz and lab both ask for this computation. The reframe is the powerful part: downtime within budget is not failure, it is a resource you deliberately spend on velocity. Chasing 100% means spending infinite money to deliver value users cannot perceive. -->

---

## The error budget as a peace treaty

- Budget **healthy**: ship fast, take risks, run experiments
- Budget **exhausted**: feature releases freeze; engineering shifts to reliability until the budget recovers
- **Burn rate**: how fast you consume budget — burning 5% of a monthly budget in one hour pages someone
- Replaces the module 1 turf war (dev wants change, ops wants stability) with a **number both sides agreed to**

<!-- This is the cultural payoff of the whole SLO apparatus: the ancient dev-versus-ops argument becomes a data-driven policy nobody has to fight about. The freeze is not punishment — it is the pre-agreed consequence. Burn-rate alerting is also the modern answer to symptom-based alerting from module 11: page when the budget is burning abnormally fast, not on any single blip. -->

---

## Toil: the work to engineer away

Toil is work that is **all** of:

- **Manual** and **repetitive**
- **Automatable** — a machine could do it
- Reactive/interrupt-driven, with **no lasting value**
- **Scales with the service** — 2x users means 2x work

Examples: hand-restarting pods, rotating certs by hand, copy-pasting deploy commands. Google SRE caps toil at ~50% of time; the rest goes to engineering it away.

<!-- The subtle part of the definition is the last clause: toil grows linearly with the service, so left alone it eventually consumes the whole team — that is the ops death spiral from module 1 wearing a new hat. Ask students what the course has already automated away: manual testing (CI, modules 4–5), server setup (containers + IaC, modules 6–8), deployment (module 10). The whole course is a toil-elimination arc. -->

---

<!-- _class: section-divider -->

# Part 4: When Things Break Anyway

---

## On-call, humanely

- **Rotation**: shared schedule, primary + secondary, handoff notes
- **Escalation**: primary does not ack in N minutes, page the secondary, then the manager
- Every page must be **urgent, actionable, user-impacting** (module 11) — and link a runbook
- Track pages per shift; too many means the *system* needs fixing, not the humans
- Compensate on-call time; protect sleep — tired responders cause worse incidents

<!-- Connect straight back to module 11's alert-fatigue slide: alert quality is what makes on-call humane, and pages-per-shift is the metric that tells you whether your alerting philosophy is working. The escalation chain exists so a missed page is a process event, not a catastrophe. -->

---

## Incident response: roles, not heroes

- **Incident Commander (IC)**: owns coordination and decisions — **does not debug**
- **Comms lead**: posts regular status updates; shields responders from "any update?"
- Subject-matter experts: do the actual investigation and mitigation
- **Severity levels** (SEV1 = critical user impact... SEV3 = minor) set the response: who is paged, how often updates go out
- Mitigate first, understand later — restore service, then find the cause

<!-- The counterintuitive rule is that the IC keeps their hands off the keyboard: coordination is a full-time job during a real incident, and the biggest failure mode is everyone debugging while nobody decides. The comms role exists because unanswered stakeholders escalate into the incident channel and consume responder attention. Severity levels pre-negotiate proportionality so nobody argues about it at 3 a.m. -->

---

## Blameless postmortems

- After an incident: write what happened, why, and what will change — **without naming culprits**
- Why blameless? Blame **destroys information flow**: punished people hide details, and you lose the truth forever
- **Contributing factors** over "root cause" — real incidents have several interacting causes
- If a human error "caused" it: ask why the **system** allowed that error to matter
- **Action items** with owners and deadlines — else it is a confession, not a postmortem

<!-- The logic chain to make explicit: accurate postmortems require full information, full information requires honesty, and honesty dies the moment blame appears. "Human error" is where analysis should start, not stop — the follow-up question is always why the system made the error easy and the consequence large. The lab has students write a full postmortem of a staged outage using this structure. -->

---

## Chaos engineering (briefly)

- Deliberately inject failure to **verify** resilience assumptions — an experiment, not vandalism
- Principles: steady-state hypothesis, minimal blast radius, run in prod carefully, halt on surprise
- **Game days**: scheduled team exercises — break something on purpose, practice the response
- Netflix's Chaos Monkey made "instances die randomly" a design constraint

<!-- Position chaos engineering as testing for reliability claims: "we survive an app restart" is a hypothesis until you kill the app and watch. The lab's game day is a miniature version — stop the container, watch the alert fire, respond, write it up. Emphasize blast-radius discipline: chaos without a rollback plan is just an outage. -->

---

## The journey of devops-demo-app

| Modules | What happened to the app |
| --- | --- |
| 1–3 | A repo, a PR workflow, a healthcheck script |
| 4–5 | CI: lint + tests on every push |
| 6 | A Dockerfile and Compose — runs anywhere |
| 7–8 | Kubernetes with probes; infrastructure as code |
| 9 | Config and secrets externalized |
| 10 | Canary-deployed, instantly rollback-able |
| 11 | Scraped, graphed, alerted on |
| 12 | Scanned, SLO'd, postmortem-ready |

<!-- Give this slide a full minute — it is the course in one table. The same 30-line app went from "works on my machine" to a monitored, canary-deployed, security-scanned Kubernetes service with an SLO, and every step was automation and feedback loops, not heroics. That is the thesis of module 1, demonstrated. -->

---

## Summary

- **DevSecOps** shifts security left: secret scanning, SCA, SAST, image scanning, DAST — each catches a different class, wired into CI with **least-privilege** tokens
- Supply chain: lockfiles, typosquatting awareness, signing/provenance (SLSA, cosign)
- **SRE**: operations as software engineering
- **SLI** measures, **SLO** targets, **SLA** contracts; **error budget = 1 − SLO** is the peace treaty between velocity and reliability
- Engineer away **toil**; run humane on-call; respond with **roles**; learn with **blameless postmortems**; verify with **game days**

<!-- Final retrieval practice for the course: give scenarios and ask which tool or concept applies — a leaked token (secret scanning + rotation), a vulnerable base image (Trivy + rebuild), error budget exhausted (release freeze), an engineer fat-fingers a prod command (blameless postmortem asking why the system allowed it). -->

---

## Next up

**The Capstone Project**

- No more modules — now you put it all together
- Brief: `capstone/brief.md` — build the full path to production for a service, end to end: CI, container, Kubernetes, delivery strategy, observability, security gates, SLO and postmortem template
- Everything you need, you have already done once

Lab 12 first: scan the image, harden CI, define your SLO, and run a game day.

<!-- Send-off: the capstone is deliberately a repeat of the course with the training wheels off — every requirement in the brief maps to a lab they have completed. Encourage students to treat their devops-demo-app repo as the reference implementation they built for themselves. -->
