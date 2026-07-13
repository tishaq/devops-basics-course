---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 02: Git & Collaboration Workflows"
---

<!-- _class: lead -->

# Git & Collaboration Workflows

## Module 02

How teams share one codebase without stepping on each other — and why your branching strategy shapes your delivery speed.

---

<!-- _class: section-divider -->

# Part 1: Git's Model, Refreshed

---

## Commits are snapshots, not diffs

- Each commit stores a full **snapshot** of the project tree (deduplicated via content-addressed objects)
- A commit = tree + author + timestamp + message + **parent pointer(s)**
- The commit ID is a SHA-1 hash of all of that — change anything, get a new ID
- Diffs are *computed* between snapshots when you ask, not stored

<!-- The snapshot model is the single most clarifying fact about Git — most confusion (rebase, cherry-pick, detached HEAD) dissolves once students stop thinking in diffs. Worth saying: because the hash covers the parent pointer too, history is tamper-evident, like a blockchain before blockchains were a buzzword. -->

---

## History is a DAG

```text
A---B---C---F   (main)
     \     /
      D---E     (feature)
```

- Commits form a **directed acyclic graph**: each commit points to its parent(s)
- A merge commit (F) has two parents
- **Refs** are just movable pointers to commits: branches (`main`), tags (`v1.0.0`), `HEAD` (where you are now)
- A branch is a 41-byte file containing a SHA — branching is free

<!-- Demystify branches: run `cat .git/refs/heads/main` live if teaching hands-on — students are often shocked it is just a hash in a text file. This is why Git branching is instant while older VCSs (SVN, Perforce) made branching feel expensive, which in turn shaped the heavyweight branching strategies we will critique shortly. -->

---

## Local vs remote

- Your clone is a **full repository** — complete history, works offline
- `origin` is just a named remote; `origin/main` is your last-known snapshot of the server's `main`
- `git fetch` updates remote-tracking refs; `git pull` = fetch + merge (or rebase)
- `git push` publishes your commits — the only step that needs the network

| Command | Touches network? |
| --- | --- |
| commit, branch, merge, rebase, log | No |
| fetch, pull, push, clone | Yes |

<!-- The distributed model matters for DevOps: every developer has a full backup, and CI servers clone the same history everyone else has. Common beginner confusion to address: origin/main does not update by itself — it is a cached pointer that moves only on fetch/pull/push. -->

---

<!-- _class: section-divider -->

# Part 2: Branching Strategies — an Honest Comparison

---

## Git Flow (2010)

- Vincent Driessen's model: long-lived `develop` + `main`, plus `feature/*`, `release/*`, `hotfix/*` branches
- Structured and explicit — appealing for versioned, boxed software with parallel supported releases
- Costs: long-lived branches drift apart, **big merges**, releases are ceremonies
- Driessen himself added a 2020 note: for web apps delivered continuously, consider simpler flows

<!-- Be fair to Git Flow: it was designed in 2010 for software with explicit versioned releases (installers, mobile apps with review queues), and it still fits that world. The problem is cargo-culting it onto continuously delivered services, where its ceremony adds lead time without adding safety. Quote Driessen's own reflection note at the top of the original blog post. -->

---

## Why Git Flow fights continuous delivery

- Work sits unmerged on `develop` and `feature/*` for days or weeks — **large batches**
- Merging `develop` to `main` bundles many changes: exactly the big-bang release pattern module 1 warned about
- Two long-lived branches means two places CI must run and two histories to reason about
- Integration pain is deferred, not removed — "merge hell" at release time

<!-- Connect explicitly back to module 1's batch-size death spiral: Git Flow institutionalizes large batches at the version-control layer. DORA's research (Accelerate, ch. 4) found that teams with short-lived branches and frequent merges to trunk perform better on all four metrics. -->

---

## GitHub Flow

1. Branch off `main`
2. Commit, push, open a **pull request**
3. Review + automated checks
4. Merge to `main`
5. Deploy `main` (often automatically)

- One long-lived branch, short-lived feature branches
- Simple to teach, maps directly onto PR-based platforms

<!-- GitHub Flow is what most modern teams actually run and what this course uses in every lab from today on. Its one hidden assumption: main must always be deployable, which requires the automated checks of modules 4-5 — flag that dependency now. -->

---

## Trunk-based development

- Everyone integrates to `main` (the trunk) at least daily
- Branches, if used at all, live **hours to ~2 days**, never weeks
- Incomplete features hidden behind **feature flags**, not branches
- DORA research: trunk-based practices with short-lived branches correlate with elite delivery performance
- Google and Meta famously develop this way at enormous scale

<!-- Positioning: GitHub Flow with branches kept under a day or two IS trunk-based development for practical purposes — the labs practice exactly that. The scary part for students is "commit unfinished work to main?!" — the answer is feature flags plus a strong test suite, foreshadowing modules 4, 5, and 10 (flags reappear in CD strategies). -->

---

## Strategy comparison

| | Git Flow | GitHub Flow | Trunk-based |
| --- | --- | --- | --- |
| Long-lived branches | 2 (main, develop) | 1 | 1 |
| Branch lifetime | Weeks | Days | Hours-2 days |
| Batch size | Large | Small | Smallest |
| Fits | Versioned/boxed releases | Web services | High-performing CD teams |
| Merge pain | High | Low | Lowest |

Course position: GitHub Flow with trunk-based discipline (small, short-lived branches).

<!-- Give students the one-table takeaway and the course's explicit stance. Honest caveat to voice: trunk-based development demands investment in automated tests and flags; a team with no CI adopting it naively just ships bugs faster. Strategy must match the team's safety net — which is why modules 4-5 come next. -->

---

<!-- _class: section-divider -->

# Part 3: Integrating Changes — Merge, Rebase, Squash

---

## Merge

```bash
git switch main
git merge feat/add-version-endpoint
```

- Creates a merge commit with two parents; both histories preserved exactly
- Non-destructive — never rewrites anything
- Cost: history becomes a thicket of crossing lines on busy repos

<!-- Merge is the safe default and the only option that never rewrites history. Show a `git log --graph --oneline` of a busy repo to illustrate the readability cost — the "guitar hero" graph usually gets a laugh and makes the point. -->

---

## Rebase

```bash
git switch feat/add-version-endpoint
git rebase main
```

- **Replays** your commits on top of the new `main` tip — linear history, no merge commit
- Rewrites commit IDs: the replayed commits are new objects
- **Golden rule: never rebase commits that others may have based work on** (i.e., pushed shared branches)
- Great for keeping *your own* unpushed/unmerged branch current

<!-- The golden rule deserves board space: rebasing a shared branch forks reality for everyone who pulled it, and the resulting force-push cleanup is a rite of passage nobody enjoys. Safe zone: your own feature branch before or during PR review (with force-with-lease), never main. -->

---

## Squash merge

```bash
# on GitHub: "Squash and merge" button
git merge --squash feat/add-version-endpoint
```

- Collapses the whole branch into **one commit** on `main`
- `main` history: one commit per PR — clean, revertable, bisectable
- Loses intra-branch history (the 12 "wip" commits vanish — often a feature)

| Use | When |
| --- | --- |
| Merge commit | Preserving exact history matters |
| Rebase + fast-forward | Team wants linear history, disciplined commits |
| Squash | PRs are the unit of change (course default) |

<!-- Squash-merge is the pragmatic default for PR-based teams: contributors can commit messily on branches, while main stays one-commit-per-PR, which makes `git revert` of a bad change trivial — a capability that pays off in module 10's rollback discussions. The lab uses squash-merge; students see the effect on history firsthand. -->

---

## Handling conflicts

```text
<<<<<<< HEAD
const GREETING = 'Hello';
=======
const GREETING = 'Hi';
>>>>>>> feat/change-greeting
```

- A conflict = Git cannot auto-reconcile two edits to the same lines — a **human decision**, not an error
- Resolve: edit the file to the intended final state, remove markers, `git add`, then continue (`git merge --continue` / `git rebase --continue`)
- Prevention beats cure: small branches, merged often, touch fewer overlapping lines

<!-- Normalize conflicts — beginners treat the markers as a catastrophe. Walk the anatomy: HEAD's version on top, incoming below, and your job is to write what the file SHOULD say, which sometimes is neither side verbatim. The lab manufactures a deliberate conflict so the first one happens in a safe setting. -->

---

<!-- _class: section-divider -->

# Part 4: Collaboration Quality — PRs, Commits, Protection

---

## Pull requests: small is fast

- A PR bundles: a diff, a conversation, and a merge gate
- Research and industry guidance (Google's code review docs, SmartBear's studies): review effectiveness drops sharply past ~400 changed lines
- Small PRs get reviewed **sooner** and **better**; review latency, not coding, dominates lead time on many teams
- Aim: PRs under ~200-400 lines, one logical change each

<!-- SmartBear's Cisco study found defect-detection ability falls off beyond 400 LOC per review, and Google's engineering practices docs push "small CLs" hard. Tie to DORA lead time: on many teams a change spends more time awaiting review than being written — small PRs attack the real bottleneck. -->

---

## Review culture that works

- Review the **code, not the person**: "this loop re-reads the file each iteration" vs "you wrote slow code"
- Distinguish blocking issues from preferences — prefix nits: `nit: rename i to index?`
- Respond to reviews within hours, not days — latency compounds across the team
- Author's duties: self-review the diff first, write a PR description that explains **why**
- Approvals mean shared ownership: "we shipped it," not "they wrote it"

<!-- Culture callback to module 1: review is a feedback loop (Second Way) — its value decays with latency. Anecdote that resonates: teams that adopt a "review before starting new work" norm routinely halve their lead time with zero new tooling. Good review comments state the problem and, where possible, suggest a direction. -->

---

## Commit hygiene: atomic commits

- One commit = one logical change that builds and passes tests
- Enables `git revert` of exactly one change, `git bisect` to hunt regressions, readable `git log`
- Anti-pattern: `fix stuff` / `wip` / `asdf` on `main`
- Message format: imperative subject ≤ 50 chars, blank line, body explaining **why**

<!-- Sell the payoff, not the rule: bisect can find a regression in log2(n) steps, but only if every commit builds. The "imperative mood" convention matches Git's own generated messages ("Merge branch...", "Revert..."). Squash-merging gives some hygiene for free on main even when branch commits are messy. -->

---

## Conventional Commits

```text
feat: add /version endpoint
fix: trim whitespace in greeting name
docs: document PORT environment variable
chore: add .gitignore for node_modules
feat!: drop support for Node 16
```

- Spec: `type(scope): description` — common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`
- `!` or `BREAKING CHANGE:` footer marks breaking changes
- Machine-readable: tools can auto-generate changelogs and compute the next **semver** bump (feat = minor, fix = patch, breaking = major)

<!-- The killer feature is automation: semantic-release and similar tools read these prefixes to version and changelog automatically — a taste of module 4's automation mindset applied to metadata. The course labs use Conventional Commits from today onward, so muscle memory starts now. -->

---

## Protecting main

- **Branch protection rules** (GitHub: Settings → Branches, or Rulesets):
  - Require a pull request before merging
  - Require approvals (≥ 1)
  - Require status checks to pass — *in module 4, your CI pipeline becomes this check*
  - Block force pushes and deletions
- Turns "please don't push to main" from a polite request into a physical impossibility

<!-- This is policy-as-configuration: the platform enforces the workflow so no one relies on memory or goodwill — the same philosophy as automating deploys. Today students require PRs; in module 4 the "required status check" slot gets filled by their GitHub Actions pipeline, which is a satisfying payoff moment. -->

---

## .gitignore, tags, and releases

- `.gitignore`: keep generated and machine-local files out — `node_modules/`, build output, `.env` (secrets — module 9!), editor droppings
- **Annotated tags** mark releases: `git tag -a v1.0.0 -m "First release"` then `git push origin v1.0.0`
- **Semver**: MAJOR.MINOR.PATCH — breaking / feature / fix
- Platform "Releases" attach notes and artifacts to a tag; tags later trigger release pipelines (module 4)

<!-- Two rules of thumb: if a file can be regenerated, ignore it; if it contains a secret, ignore it and never commit it (module 9 covers proper secret handling — .env leaks are a classic breach vector). Use annotated tags, not lightweight ones, for releases: they carry author, date, and message, and CI systems can key off the v* pattern. -->

---

<!-- _class: section-divider -->

# Part 5: Wrap-Up

---

## Summary

- Git: commits are snapshots in a DAG; branches are cheap pointers; your clone is a full repo
- Branching strategy sets your batch size: Git Flow suits versioned releases; GitHub Flow / trunk-based (short-lived branches) suits continuous delivery and correlates with elite DORA performance
- Merge preserves, rebase linearizes (never on shared branches), squash gives one-commit-per-PR
- Small PRs + fast, respectful review = the human feedback loop of delivery
- Conventional Commits, branch protection, `.gitignore`, and semver tags round out professional hygiene

<!-- Quick oral quiz to close: "Your branch is 3 weeks old and 4,000 lines — what went wrong and when?" The answer touches nearly every slide: batch size, review effectiveness, conflict probability, and lead time. -->

---

## Next up

- **Lab 02** — the foundation for every later lab: create your own `devops-demo-app` repository on GitHub, copy in the sample app, protect `main`, ship a `/version` endpoint through a real PR with squash-merge, manufacture and resolve a conflict, and tag `v1.0.0`
- **Module 03: Linux, Shell & Networking Essentials** — processes and signals, permissions, pipes, HTTP anatomy, and ports: the ops literacy your containers will demand

<!-- Stress the stakes: the repository created in lab 02 is the one that gets CI in module 4, a Dockerfile in module 6, and Kubernetes manifests in module 7 — skipping this lab blocks everything downstream. Preview module 3 as "the stuff that makes Docker make sense later." -->
