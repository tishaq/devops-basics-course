---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 04: Continuous Integration"
---

<!-- _class: lead -->

# Continuous Integration

## Module 04

Integrate early, integrate often — and let a machine prove your code works on every change.

---

## Where we are in the course

| Module | Topic |
| --- | --- |
| 01-03 | DevOps culture, Git workflows, Linux & networking |
| **04** | **Continuous Integration** |
| 05 | Testing & Quality Gates |
| 06 | Containers with Docker |

- From now on, every lab builds on your `devops-demo-app` repository from module 2
- Today we make a robot run your tests so you never have to remember to

<!-- Orient students: modules 1-3 gave them a repo, a PR workflow, and shell skills. Today those come together. Emphasize that from this point forward the course is cumulative — their module 2 repository is the lab environment for everything that follows. -->

---

<!-- _class: section-divider -->

# Section 1: What CI Actually Is

---

## Continuous Integration, defined

> Continuous Integration is the practice of merging all developers' working copies to a shared mainline **at least daily**, with every merge verified by an **automated build and test**.

- Two halves, both required:
  1. A **team habit**: small changes, integrated to `main` frequently
  2. An **automated check**: build + test runs on every single change
- CI is a *practice*, not a product you can buy

<!-- Stress the definition. Many teams say "we do CI" because a server exists, but their branches live for three weeks. The practice is the frequent integration; the server is just the enforcement mechanism. Both halves must be present. -->

---

## "We have Jenkins" is not CI

- Having a CI server while keeping long-lived feature branches is **cargo-culting**: copying the visible artifact without the underlying practice
- Symptoms of fake CI:
  - Branches that live for weeks before merging
  - The build is red for days and nobody cares
  - Tests are skipped "to get the release out"
- Litmus test: *does every developer integrate to the shared mainline at least once a day, and does a red build stop the line?*

<!-- The cargo cult metaphor: Pacific islanders built bamboo control towers hoping planes would land. Teams install Jenkins hoping quality will land. Ask the class: how long does the average branch live at your workplace? That answer says more about CI adoption than any tool does. -->

---

## The cost curve of late integration

| Integration frequency | Merge conflict size | Debug difficulty |
| --- | --- | --- |
| Hourly | Trivial | "It was my last commit" |
| Daily | Small | Minutes to bisect |
| Weekly | Painful | Hours of archaeology |
| Monthly | "Integration hell" | Days; blame unclear |

- The pain of merging grows **super-linearly** with time between merges
- Two branches drift apart in *both* directions — each conflicts with the other's assumptions, not just its lines

<!-- Walk through the table row by row. The key insight is the non-linearity: waiting twice as long costs more than twice the pain, because both branches moved and the conflicts are semantic, not just textual. This is why "integrate at least daily" is in the definition rather than being a nice-to-have. -->

---

## Integration hell, illustrated

```text
main:      A---B---C---D---E---F---G
                \
your branch:     X---Y---Z---... (3 weeks, 40 commits)

Merge day: 27 conflicting files, tests broken in ways
           neither branch caused alone.
```

- Small, frequent merges convert one huge unpredictable event into many tiny boring ones
- Boring is what we want from integration

<!-- Anecdote time: invite a student to share their worst merge story. Then flip it — with daily integration, that story cannot happen, because the divergence never accumulates. "Boring" is the highest compliment in operations. -->

---

## What CI buys you

- **Fast feedback**: you learn a change is broken minutes after pushing, while context is fresh
- **A deployable mainline**: `main` is always in a known-good state
- **Courage to refactor**: the test suite catches regressions, so you can improve code without fear
- **Shared truth**: "works on my machine" is replaced by "works on the CI runner"

- Foreshadowing: a mainline that is *always deployable* is the precondition for Continuous Delivery (module 10)

<!-- Connect back to module 1's DORA metrics: CI directly improves lead time and change failure rate. The deployable mainline point matters most — CD in module 10 is impossible without it. Refactoring courage resonates with developers; lean on it. -->

---

<!-- _class: section-divider -->

# Section 2: Anatomy of a CI Pipeline

---

## The five stages of a basic pipeline

```text
trigger --> checkout --> install deps --> build --> test --> (artifact)
```

1. **Trigger** — an event: push, pull request, schedule, manual
2. **Checkout** — fetch the exact commit being verified
3. **Dependencies** — install libraries the build needs
4. **Build** — compile / bundle (for our Node app: nothing to compile)
5. **Test** — run the automated test suite
6. **Artifact** — package the output for later stages (optional today)

<!-- Every CI system, from Jenkins to GitHub Actions, implements this same skeleton with different vocabulary. Have students map each stage to what they do manually today: git pull, npm install, npm test. CI is automation of exactly that ritual. -->

---

## Pipelines run on a clean machine — that's the point

- CI runs on a **fresh, disposable environment** every time
- No leftover `node_modules`, no globally installed tools, no "it worked yesterday" state
- If the pipeline passes, *anyone* can reproduce the build from the repo alone
- Corollary: **everything the build needs must be declared in the repo** (scripts, lockfiles, config)

<!-- This is the philosophical core: CI proves the repository is self-sufficient. If a build only works because of something installed on a laptop, CI exposes that immediately. This idea returns with force in module 6, where containers make the clean environment portable. -->

---

## The CI server landscape

| Tool | Hosting | Config | Notes |
| --- | --- | --- | --- |
| GitHub Actions | SaaS (GitHub) | YAML in repo | Tight GitHub integration |
| GitLab CI | SaaS / self-hosted | YAML in repo | Built into GitLab |
| Jenkins | Self-hosted | Groovy / UI | Oldest, most plugins |
| CircleCI | SaaS | YAML in repo | Early Docker support |

- Concepts transfer almost 1:1 between them
- **This course uses GitHub Actions** — your repo already lives on GitHub

<!-- Reassure students: learning one system deeply teaches them all. The vocabulary shifts (pipeline/workflow, stage/job) but the model is identical. We choose Actions purely for zero setup friction — their module 2 repo is already on GitHub. -->

---

<!-- _class: section-divider -->

# Section 3: GitHub Actions, Precisely

---

## The vocabulary

| Term | Meaning |
| --- | --- |
| **Workflow** | A YAML file in `.github/workflows/`; the whole automated process |
| **Event / trigger** | What starts a workflow (`push`, `pull_request`, `schedule`, ...) |
| **Job** | A group of steps that runs on one runner; jobs run in parallel by default |
| **Step** | A single command or action inside a job; steps run sequentially |
| **Runner** | The machine that executes a job (e.g. `ubuntu-latest`) |
| **Action** | A reusable step published by someone (e.g. `actions/checkout`) |

<!-- This table is the exam-relevant slide. Drill the hierarchy: workflow contains jobs, jobs contain steps, each job gets its own runner. Jobs are parallel and isolated; steps within a job share a filesystem and run in order. Quiz question material lives here. -->

---

## Your first workflow file

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test
```

<!-- Read this file aloud line by line — students will write exactly this in the lab. Point out the two trigger types: push to main covers direct merges, pull_request covers proposed changes. The uses keyword pulls a published action; run executes a shell command. -->

---

## Events: when does it run?

```yaml
on:
  push:
    branches: [main]   # after a merge lands on main
  pull_request:        # on every PR commit, against the merge result
  schedule:
    - cron: "0 6 * * 1"  # optional: Mondays 06:00 UTC
  workflow_dispatch:     # optional: a "Run workflow" button
```

- `pull_request` is the gate *before* merge; `push` to `main` verifies *after*
- You almost always want **both**

<!-- Explain why both triggers: pull_request tests the proposed merge, but main can still break via stacked merges or admin pushes, so verifying post-merge matters. Mention that pull_request actually builds a temporary merge commit of the PR against its base. -->

---

## Steps vs actions

```yaml
steps:
  - uses: actions/checkout@v4        # an action: reusable, published
  - uses: actions/setup-node@v4      # an action, configured via `with:`
    with:
      node-version: 20
  - run: npm test                    # a plain shell command
```

- `uses:` — invoke a packaged action from the marketplace (pin a major version like `@v4`)
- `run:` — run a shell command on the runner
- Steps in a job share the same workspace and run top to bottom; if one fails, the job fails

<!-- Clarify the two step flavors, since the syntax confuses beginners. Note version pinning: @v4 tracks the major release; security-sensitive teams pin full commit SHAs. Failing fast is default behavior: a failed step aborts remaining steps in the job. -->

---

## Matrix builds: one job, many variants

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

- Expands into **three parallel jobs**, one per Node version
- Catches "works on Node 20, breaks on Node 18" before your users do

<!-- The matrix multiplies a job across a parameter grid. Show how the expression syntax injects the matrix value into the setup step. You can matrix across OSes too (runs-on with matrix.os). In the lab they will add exactly this matrix. -->

---

## Caching dependencies

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm          # caches ~/.npm keyed on package-lock.json
```

- Runners are disposable, so `npm install` starts from zero every run
- `setup-node`'s built-in cache restores the npm download cache between runs
- Keyed on the lockfile hash: change dependencies, get a fresh cache
- Our demo app has zero dependencies — but the habit matters for real projects

<!-- Explain the tension: clean machines are good for correctness but slow for dependency-heavy projects. Caching is the escape hatch — it caches downloads, not node_modules, so installs stay correct but faster. Honest note: our sample app won't feel the difference; real apps save minutes. -->

---

## Secrets in Actions

```yaml
steps:
  - run: ./deploy.sh
    env:
      API_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

- Stored under repo **Settings → Secrets and variables → Actions**
- Encrypted at rest; **masked** (`***`) if they appear in logs
- Never commit secrets to the repo — CI logs are visible to everyone with read access
- Caution: workflows triggered by forks don't receive secrets (by design)

<!-- We don't need secrets this week, but plant the concept now — modules 9 and 12 go deep on secrets management. The masking is best-effort, not bulletproof: encoded or split secrets can leak. Rule of thumb: a secret in a log is a compromised secret. -->

---

## Status checks + branch protection

- Every workflow run reports a **status check** on the commit / PR: green check or red X
- Branch protection (module 2) can mark a check as **required**:
  - PRs cannot merge until the required check passes
  - This is the moment CI grows teeth
- The merge button literally greys out — no human discipline required

<!-- This closes the loop with module 2's branch protection lab. Until a check is required, CI is advisory and people merge red anyway. Required checks turn the practice into a mechanism. In the lab, students flip this switch on their own repo. -->

---

<!-- _class: section-divider -->

# Section 4: Fast Feedback & Pipeline Hygiene

---

## Keep the pipeline under 10 minutes

- Feedback value decays fast: a failure you learn about in 3 minutes is a quick fix; in 45 minutes it's an interruption to a *different* task
- Common speed tactics:
  - Cache dependencies
  - Run jobs in parallel (lint and test side by side — module 5)
  - Split slow suites; move the slowest tests to a nightly run
- If developers start batching pushes "to avoid waiting", the pipeline is too slow

<!-- The 10-minute figure comes from extreme programming tradition and still holds. The behavioral signal is the tell: when people avoid pushing, the feedback loop has failed. Watch for that smell on real teams. -->

---

## Fail fast

- Order steps so **cheap checks run before expensive ones**
  - Lint (seconds) before tests (minutes) before builds (longer)
- A job stops at the first failed step — put the likely failures early
- Parallel jobs give you all the bad news at once instead of one failure per push

<!-- Two complementary tactics: ordering within a job (cheapest first) and parallelism across jobs (all results at once). Module 5 adds a separate lint job precisely so lint and test report independently. -->

---

## Flaky tests poison trust

- A **flaky test** passes or fails without code changes (timing, network, shared state)
- The failure mode is social, not technical:
  - Red stops meaning "broken" and starts meaning "click re-run"
  - Real failures hide in the noise; eventually the team ignores CI entirely
- Policy: a flaky test gets **fixed or quarantined the day it is detected** — never left to flicker

<!-- This is a culture slide. One tolerated flaky test teaches the whole team to re-run on red, and from that moment CI is decorative. Module 5 covers the technical causes and the quarantine workflow in detail; today plant the zero-tolerance norm. -->

---

## Artifacts: build once, promote many

- An **artifact** is the pipeline's output: a package, a bundle, a container image
- Anti-pattern: rebuild from source for staging, then rebuild *again* for production
  - Two builds are never provably identical (dependency drift, timestamps)
- Principle: **build once**, then *promote* the same artifact through environments
- Module 6 makes our artifact a Docker image; module 10 promotes it through environments

<!-- This is deliberate foreshadowing. Today our "artifact" is just a green tested commit. In module 6 it becomes an immutable image; in module 10, deployment means moving that exact image between environments. Plant the principle now so the later modules feel inevitable. -->

---

## Badges: make the build status public

```markdown
![CI](https://github.com/YOUR-USER/devops-demo-app/actions/workflows/ci.yml/badge.svg)
```

- Renders a live **passing / failing** badge in your README
- Small thing, real effect: the build status is ambient, visible information
- A README with a red badge is socially uncomfortable — that's the feature

<!-- Badges seem cosmetic but they externalize the build state — visitors, teammates, and future-you see it without opening the Actions tab. Students add one in the lab. Mention that open-source maintainers check badges before accepting dependencies. -->

---

## Summary

- CI = integrate to shared mainline **at least daily** + automated build & test on **every change** — a practice, not a product
- Late integration costs grow super-linearly: many small merges beat one huge one
- GitHub Actions hierarchy: **workflow → jobs (parallel) → steps (sequential)**, executed on disposable **runners**
- Matrix builds test many variants; caching keeps clean builds fast
- Required status checks + branch protection give CI teeth
- Keep it under 10 minutes, fail fast, and never tolerate flaky tests

<!-- Recap by asking the class to reconstruct the Actions vocabulary table from memory. Re-state the litmus test: daily integration and a red build that stops the line. If they remember only one thing, it should be that CI is the habit, not the server. -->

---

## Next up

- **Lab 04**: in your `devops-demo-app` repo — write `ci.yml`, watch a PR check run, break a test on purpose, add a Node version matrix, make the check required, and put a badge in your README
- **Module 05: Testing & Quality Gates** — what should the pipeline actually *check*? Test pyramid, coverage, linting, and turning checks into enforced gates

<!-- Preview the lab flow and reassure them it's incremental: one YAML file, then progressively harden it. Tease module 5 with a question: "CI runs your tests — but are your tests any good?" That's next week's topic. -->
