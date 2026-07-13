# Midterm Exam — Modules 1-6

**Time allowed:** 90 minutes. **Total:** 100 points.
**Covers:** What is DevOps? (1), Git & Collaboration Workflows (2), Linux, Shell & Networking Essentials (3), Continuous Integration (4), Testing & Quality Gates (5), Containers with Docker (6).
**Rules:** Closed book, individual work. Answer multiple-choice questions with a single letter unless stated otherwise. Short-answer questions should be answered in 2-5 sentences. Show your reasoning on scenario questions — partial credit is given.

---

## Section A — Multiple Choice (15 questions, 3 points each, 45 points)

**A1.** In the CALMS model, the "L" stands for:

- A. Logging
- B. Lean
- C. Latency
- D. Lifecycle

**A2.** Which of the following is NOT one of the four DORA metrics?

- A. Deployment frequency
- B. Change failure rate
- C. Code coverage percentage
- D. Time to restore service

**A3.** A company creates a new "DevOps team" that sits between developers and operations and handles all deployments. According to DevOps principles, this is:

- A. The recommended adoption path
- B. An anti-pattern: it adds a third silo instead of removing the wall between two
- C. Required for compliance in most industries
- D. Only appropriate for teams of fewer than ten people

**A4.** In trunk-based development, feature branches should be:

- A. Long-lived, merged at the end of each release cycle
- B. Avoided entirely; all commits go directly to main with no review
- C. Short-lived (hours to a couple of days) and merged to main frequently
- D. Created only by senior engineers

**A5.** The key difference between `git merge` and `git rebase` when integrating branch B into branch A is:

- A. Merge preserves B's history shape and adds a merge commit; rebase rewrites B's commits on top of A for a linear history
- B. Rebase is faster because it transfers fewer objects
- C. Merge permanently deletes branch B
- D. There is no difference in the resulting history

**A6.** A process ignores `SIGTERM` and continues running. Which signal will the kernel enforce, without giving the process a chance to clean up?

- A. SIGINT
- B. SIGHUP
- C. SIGKILL
- D. SIGUSR1

**A7.** Your service works when accessed from inside its container but is unreachable from the host even though the port is published. The most likely cause is:

- A. The service binds to 127.0.0.1 (localhost) instead of 0.0.0.0
- B. The container has too little memory
- C. The image base is Alpine instead of Debian
- D. TCP was used instead of UDP

**A8.** An HTTP response with status code 503 belongs to which class, and what does the class indicate?

- A. 2xx — success
- B. 3xx — redirection
- C. 4xx — the client made an error
- D. 5xx — the server failed to fulfil a valid request

**A9.** Continuous integration, correctly practiced, primarily means:

- A. Owning a CI server such as Jenkins or GitHub Actions
- B. Integrating everyone's work into the shared mainline at least daily, verified by an automated build and tests
- C. Deploying to production after every commit
- D. Running tests manually before each release

**A10.** In GitHub Actions terminology, the correct hierarchy from largest to smallest is:

- A. Step > Job > Workflow
- B. Workflow > Step > Job
- C. Workflow > Job > Step
- D. Job > Workflow > Step

**A11.** A test that passes or fails depending on the time of day or the order tests run in is called:

- A. A regression test
- B. A flaky test
- C. A smoke test
- D. A canary test

**A12.** According to the test pyramid, the bulk of your automated tests should be:

- A. End-to-end tests, because they are the most realistic
- B. Manual exploratory tests
- C. Unit tests, because they are fast, isolated, and cheap to run
- D. An equal split across all levels

**A13.** In a Dockerfile, the main practical difference between `CMD` and `ENTRYPOINT` is:

- A. CMD runs at build time, ENTRYPOINT at run time
- B. ENTRYPOINT defines the fixed executable; CMD supplies default arguments that `docker run` arguments replace
- C. They are aliases with identical behavior
- D. CMD is required, ENTRYPOINT is deprecated

**A14.** Which Dockerfile ordering makes the best use of the layer cache for a Node.js app?

- A. `COPY . .` then `RUN npm install`
- B. `RUN npm install` then `COPY package.json .` then `COPY . .`
- C. `COPY package.json .` then `RUN npm install` then `COPY . .`
- D. Ordering has no effect on caching

**A15.** The `EXPOSE 3000` instruction in a Dockerfile:

- A. Publishes port 3000 on the host automatically
- B. Is documentation of the listening port; publishing still requires `-p` (or equivalent) at run time
- C. Opens port 3000 in the host firewall
- D. Redirects traffic from port 80 to 3000

---

## Section B — Short Answer (5 questions, 6 points each, 30 points)

**B1.** Name the four DORA metrics and state which two measure *throughput* and which two measure *stability*.

**B2.** Explain why long-lived feature branches conflict with continuous integration, and describe one practice that lets teams merge incomplete work to main safely.

**B3.** Your CI pipeline takes 25 minutes. Give three concrete techniques to reduce feedback time, and state why pipeline speed matters for team behavior.

**B4.** Explain the difference between an image and a container, and why "containers are ephemeral" affects where application state should live.

**B5.** A teammate proposes enforcing all quality checks only as client-side pre-commit hooks, with no CI enforcement. Give two reasons this is insufficient, and state where the authoritative gate should live.

---

## Section C — Scenario Questions (25 points)

**C1. (10 points)** A team releases every two weeks through the following manual process: code freeze on Friday, a QA engineer tests over three days, an ops engineer deploys Sunday night from a wiki checklist, and roughly one release in four causes an incident requiring a hotfix the following week.

a) Classify this team against each of the four DORA metrics (rough level is fine: low/medium/high/elite). (4 pts)
b) Propose the first three changes you would make, in order, and justify the order. (6 pts)

**C2. (8 points)** You are given this Dockerfile for the course sample app:

```dockerfile
FROM node:latest
COPY . /app
WORKDIR /app
RUN npm install
CMD node server.js
```

Identify four distinct problems (hygiene, security, caching, or reproducibility) and give the corrected instruction for each.

**C3. (7 points)** A pull request's CI check failed. The workflow has jobs `lint` and `test`; `test` failed only on Node 18 in the matrix, passing on 20 and 22. The failing assertion involves a date-formatting function. Describe, step by step, how you would investigate and resolve this, including what you would check first and how you would prevent recurrence.

---

# Answer Key

## Section A

| Q | Answer | Explanation |
| --- | --- | --- |
| A1 | B | CALMS = Culture, Automation, Lean, Measurement, Sharing. |
| A2 | C | The DORA four are deployment frequency, lead time for changes, change failure rate, and time to restore; coverage is not among them. |
| A3 | B | Inserting a deployment-owning team between dev and ops recreates the wall of confusion as a new silo. |
| A4 | C | Trunk-based development relies on short-lived branches merged frequently to keep integration cheap. |
| A5 | A | Merge records a merge commit preserving both histories; rebase replays commits for a linear history. |
| A6 | C | SIGKILL cannot be caught or ignored; the kernel terminates the process immediately with no cleanup. |
| A7 | A | Binding to 127.0.0.1 inside the container makes the service invisible to the container's external interface; it must bind 0.0.0.0. |
| A8 | D | 5xx codes mean the server failed on a valid request; 503 specifically is "service unavailable". |
| A9 | B | CI is the practice of frequent mainline integration verified by automation — not the ownership of a CI server. |
| A10 | C | A workflow contains jobs; each job contains steps executed on a runner. |
| A11 | B | Nondeterministic pass/fail behavior defines a flaky test. |
| A12 | C | Unit tests form the pyramid's base because they are fast, isolated, and cheap; e2e tests are the small tip. |
| A13 | B | ENTRYPOINT fixes the executable; CMD provides default arguments overridable at `docker run`. |
| A14 | C | Copying the manifest and installing dependencies before copying source lets source-only changes reuse the dependency layer. |
| A15 | B | EXPOSE is metadata; `-p host:container` (or compose `ports`) actually publishes. |

Section A scoring: 3 points per correct answer, no penalty for wrong answers.

## Section B

**B1.** Throughput: deployment frequency and lead time for changes. Stability: change failure rate and time to restore service. (2 pts for naming all four, 4 pts for correct classification.)

**B2.** Long-lived branches delay integration, so conflicts and incompatibilities accumulate and surface late as "integration hell", exactly what CI exists to prevent; merge pain grows nonlinearly with divergence time. Feature flags (or branch-by-abstraction / keystone-style dark launches) let incomplete work merge to main while remaining disabled in production. (3 pts conflict explanation, 3 pts valid practice.)

**B3.** Any three of: cache dependencies (e.g. `actions/setup-node` cache); parallelize independent jobs (lint alongside test) or shard the test suite; fail fast by running the fastest checks first and cancelling superseded runs; run only affected tests on PRs with the full suite on main; use faster/larger runners. Why it matters: slow pipelines push developers to batch changes, context-switch away, and ignore or bypass the pipeline, which degrades both flow and trust in red builds. (4 pts techniques, 2 pts rationale.)

**B4.** An image is an immutable, layered template; a container is a running (or stopped) instance created from it with a thin writable layer. Because that writable layer is discarded when the container is removed — and orchestrators replace containers freely — durable state must live outside the container, in volumes or external services such as databases or object storage. (3 pts distinction, 3 pts state implication.)

**B5.** Client-side hooks are trivially bypassed (`--no-verify`) and are not guaranteed to be installed or identical on every machine, so they cannot be trusted as enforcement; they also do nothing for changes made through other tooling or by newcomers. The authoritative gate must be CI checks required by branch protection on the shared repository; local hooks remain useful only as a fast-feedback convenience. (2 pts per reason, 2 pts for CI as source of truth.)

## Section C

**C1.**
a) Deployment frequency: fortnightly — low. Lead time for changes: at least two weeks from commit to production (freeze plus QA plus scheduled deploy) — low. Change failure rate: about 25% — low (elite teams sustain 0-15%). Time to restore: a hotfix "the following week" implies days — low. (1 pt each.)
b) A strong ordering, with justification (accept alternatives with sound reasoning): (1) automate the deployment itself — turn the wiki checklist into a script/pipeline, because a repeatable deploy is the prerequisite for everything else and removes the riskiest manual step; (2) build CI with automated tests to shrink the three-day manual QA cycle, attacking both lead time and change failure rate; (3) with deploys cheap and verified, increase release cadence (weekly, then on demand) so batches shrink and each release carries less risk. (2 pts per change with justification.)

**C2.** Any four, 2 pts each:

1. Unpinned base image: `FROM node:latest` is unreproducible → `FROM node:20-alpine` (any pinned, slim tag acceptable).
2. Cache-hostile ordering: copying all source before `npm install` reruns dependency installation on every source change → `COPY package.json ./` then `RUN npm install` then `COPY . .` (also acceptable: noting this app has no runtime deps, but the ordering habit still applies).
3. Runs as root: no `USER` instruction → add `USER node` after files are in place.
4. Shell-form CMD: `CMD node server.js` wraps the process in a shell, so signals like SIGTERM don't reach Node and graceful shutdown breaks → `CMD ["node", "server.js"]`.
5. (Also acceptable) No `.dockerignore`, so `node_modules`/`.git` inflate the build context; no `EXPOSE 3000` documentation.

**C3.** Expected shape (7 pts, judgment-based): read the failing job's log to get the exact assertion and input (1); reproduce locally under Node 18, e.g. with nvm, to rule out flakiness or runner issues (2); diagnose the real cause — date/locale/ICU behavior differing between Node versions, or use of an API unavailable in 18 (2); fix by making the function deterministic (explicit locale/timezone/format or a version-safe API) rather than deleting the test or dropping 18 from the matrix without a decision (1); prevent recurrence by keeping the matrix aligned with supported runtimes, documenting the engine range in `package.json` `engines`, and pinning deterministic inputs in tests (1). Award partial credit for coherent alternative approaches.

## Grade Bands

| Points | Grade |
| --- | --- |
| 90-100 | A |
| 80-89 | B |
| 70-79 | C |
| 60-69 | D |
| Below 60 | F |
