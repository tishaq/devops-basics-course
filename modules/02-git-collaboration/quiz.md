# Quiz 02: Git & Collaboration Workflows

Answer all 10 questions without consulting the handout. Multiple-choice questions have exactly one correct answer. Short-answer questions need 1-3 sentences.

**Q1.** In Git's data model, a commit stores:
A. A diff against the previous commit
B. A full snapshot of the project tree plus metadata and parent pointer(s)
C. Only the files that changed since the last tag
D. A compressed archive of the working directory including ignored files

**Q2.** A Git branch is best described as:
A. A copy of the entire repository directory
B. A movable pointer (ref) to a commit
C. A protected namespace on the remote server
D. A diff queue awaiting merge

**Q3.** Which is a genuinely appropriate use case for Git Flow rather than a misuse?
A. A web service that deploys to production several times a day
B. A team practicing trunk-based development with feature flags
C. A desktop product shipping versioned installers with several supported parallel releases
D. A repository whose main branch is always deployable

**Q4.** Explain in one or two sentences why long-lived feature branches conflict with continuous delivery, referencing batch size.
(Short answer.)

**Q5.** According to DORA research summarized in Accelerate, which version-control practice correlates with higher delivery performance?
A. Maintaining separate develop and main branches with scheduled release merges
B. Trunk-based development with short-lived branches merged at least daily
C. One release branch per customer
D. Requiring all commits to be rebased onto a weekly integration branch

**Q6.** What is the "golden rule" of rebasing, and what goes wrong when it is broken?
(Short answer.)

**Q7.** A team squash-merges every pull request into main. Which statement is TRUE?
A. The individual commits from the branch are preserved on main
B. main gains exactly one commit per PR, which makes reverting a whole change trivial
C. Squash merging creates a merge commit with two parents
D. Squash merging is destructive to the main branch history

**Q8.** Which commit message correctly follows the Conventional Commits specification for a backwards-compatible new feature?
A. `Added version endpoint`
B. `feat: add /version endpoint`
C. `FEATURE - version endpoint (WIP)`
D. `fix!: add /version endpoint`

**Q9.** Under semantic versioning, merging a `feat:` (non-breaking) change into a project currently at version 1.4.2 should produce which next version?
A. 2.0.0
B. 1.5.0
C. 1.4.3
D. 1.4.2-feat.1

**Q10.** Name three concrete practices that make pull requests get reviewed faster and better, drawing on the module's guidance.
(Short answer.)

---

## Answer Key

**Q1.** B. Git stores content-addressed snapshots with author, message, and parent pointers; diffs are computed on demand between snapshots, not stored.

**Q2.** B. A branch is a lightweight movable pointer to a commit (literally a small file containing a SHA), which is why creating branches is instantaneous and free.

**Q3.** C. Git Flow's release and hotfix branches were designed for explicitly versioned software with parallel supported releases; for continuously delivered services its long-lived branches reintroduce large batches.

**Q4.** Long-lived branches accumulate days or weeks of unintegrated work, so the eventual merge is a large batch that is harder to review, test, and debug — exactly the big-bang release problem continuous delivery exists to eliminate.

**Q5.** B. Accelerate reports that teams with short-lived branches (roughly a day or two), few active branches, and no code freezes score higher on all four DORA metrics.

**Q6.** Never rebase commits that others may have based work on (i.e., pushed shared branches). Rebasing rewrites commit IDs, so everyone who pulled the old commits now has a divergent history that must be painfully reconciled, usually via force-push cleanup.

**Q7.** B. Squash merging collapses the branch into a single commit on main, so each PR is one revertable, bisectable unit; branch-local commits are discarded, and no two-parent merge commit is created.

**Q8.** B. The format is `type: description` with `feat` denoting a backwards-compatible feature; option D's `!` would incorrectly mark a breaking change and misuses the `fix` type.

**Q9.** B. A non-breaking feature bumps the MINOR component and resets PATCH, so 1.4.2 becomes 1.5.0; MAJOR (2.0.0) is reserved for breaking changes and PATCH (1.4.3) for bug fixes.

**Q10.** Any three of: keep PRs small (one logical change, roughly under 200-400 changed lines); write a description explaining why, not just what; self-review the diff before requesting review; respond to review comments within hours; reviewers prioritize reviews over starting new work; mark non-blocking comments as nits to separate them from blocking issues.
