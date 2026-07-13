# Quiz 04: Continuous Integration

Answer all questions. For multiple choice, select the single best answer. For short answer, two or three sentences are enough. The answer key is at the end — no peeking until you have committed to your answers.

**Q1.** A team has a Jenkins server that builds and tests every commit, but feature branches routinely live for two to three weeks before merging. Is this team practicing Continuous Integration?

A. Yes — an automated build and test on every commit is the definition of CI.
B. Yes — as long as the build is green, branch lifetime does not matter.
C. No — CI requires integrating to the shared mainline at least daily; the server alone is not the practice.
D. No — CI requires using GitHub Actions rather than Jenkins.

**Q2.** In GitHub Actions terminology, which statement is correct?

A. A workflow contains steps, which contain jobs; jobs run sequentially by default.
B. A workflow contains jobs, which contain steps; jobs run in parallel by default and steps run sequentially.
C. A job contains workflows, which contain steps; everything runs in parallel.
D. Steps and jobs are synonyms; both run on the same runner.

**Q3.** Short answer: why does a well-configured CI workflow usually trigger on *both* `pull_request` and `push` to `main`, rather than only on `pull_request`?

**Q4.** What does the `runs-on: ubuntu-latest` line in a job definition specify?

A. The operating system that the application must be deployed to.
B. The runner — the machine that will execute the job's steps.
C. The Docker base image for the application.
D. The version of the Actions YAML syntax.

**Q5.** A workflow defines `strategy: matrix: node-version: [18, 20, 22]` on its single `test` job. How many jobs run per workflow execution, and how?

A. One job that installs all three Node versions in sequence.
B. Three jobs, run one after another on the same runner.
C. Three parallel jobs, each on its own runner with one Node version.
D. One job; the matrix only affects which version is cached.

**Q6.** Short answer: explain the difference between a status check and a *required* status check, and name the GitHub feature that turns the former into the latter.

**Q7.** The cost of integrating two branches grows super-linearly with the time since they diverged. Which of the following best explains why?

A. Git's merge algorithm slows down exponentially with commit count.
B. Both branches accumulate changes that invalidate each other's assumptions, producing semantic conflicts beyond what merge tools detect.
C. CI runners charge more for older branches.
D. GitHub rate-limits pull requests on old branches.

**Q8.** Which of these is the strongest sign that a CI pipeline is too slow?

A. The pipeline uses more than one job.
B. Developers batch up several changes into one push "to avoid waiting for the build".
C. The pipeline runs on every pull request.
D. The badge in the README is green.

**Q9.** A test in your suite fails roughly one run in ten with no code changes. According to fast-feedback principles, what should the team do?

A. Configure CI to automatically re-run failures up to three times and treat an eventual pass as green.
B. Delete the test immediately — flaky tests have no value.
C. Fix or quarantine the test the day the flakiness is detected, because tolerated flakes destroy trust in red builds.
D. Move the test so it only runs on the developer's machine.

**Q10.** Short answer: what does "build once, promote many" mean, and what problem does rebuilding an artifact separately for each environment cause?

---

## Answer Key

**Q1 — C.** CI is defined by frequent (at least daily) integration to a shared mainline verified by automated build and test; operating a build server while branches live for weeks is the tooling without the practice.

**Q2 — B.** The hierarchy is workflow → jobs → steps: jobs are isolated, run on their own runners, and execute in parallel by default, while steps within a job share a workspace and run in order.

**Q3 — Sample answer.** `pull_request` gates a change before merge by testing the proposed merge result, but `main` can still break afterwards (stacked merges, direct or admin pushes), so `push` to `main` verifies the mainline's actual state after every landing.

**Q4 — B.** `runs-on` selects the runner — the (GitHub-hosted or self-hosted) machine that executes the job; it says nothing about deployment targets or application images.

**Q5 — C.** A matrix expands the job definition into one job per parameter value — here three jobs, each on its own fresh runner with its own Node version, running in parallel.

**Q6 — Sample answer.** A status check merely reports pass/fail on a commit and can be ignored, whereas a required status check blocks the PR merge button until it passes; branch protection rules are the feature that marks a check as required.

**Q7 — B.** Divergence happens in both directions, so each branch breaks the other's assumptions, and semantic conflicts (code that merges cleanly but no longer works) grow faster than textual ones — merge tools cannot catch them.

**Q8 — B.** When developers change their behavior to avoid the pipeline, integration frequency drops and CI erodes; that behavioral signal is the classic symptom of a pipeline exceeding the roughly ten-minute feedback budget.

**Q9 — C.** The zero-tolerance policy — fix or quarantine the same day — exists because a tolerated flake teaches the team to re-run on red, after which genuine failures hide in the noise; auto-retrying (A) institutionalizes the noise instead of removing it.

**Q10 — Sample answer.** Build the artifact one time in CI and promote that exact artifact through staging and production; rebuilding per environment means the thing you tested is not provably the thing you shipped, since two builds can differ through dependency drift, toolchain changes, or timestamps.
