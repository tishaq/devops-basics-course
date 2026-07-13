---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 05: Testing & Quality Gates"
---

<!-- _class: lead -->

# Testing & Quality Gates

## Module 05

CI runs your checks on every change — this week we decide what is worth checking, and make it non-negotiable.

---

## Where we are

- Module 4 gave you a pipeline: every push and PR runs `npm test` on three Node versions, and the check is required
- Open question from last week: *the pipeline runs your tests — but are your tests any good?*
- Today: the test pyramid, coverage, linting and formatting, and turning all of it into **enforced quality gates**

<!-- Recap module 4 in one breath: workflow, jobs, required checks. Then pose the gap: a pipeline is only as valuable as the checks inside it. Six passing unit tests prove very little about a running service. Today we fill the pipeline with checks that earn their keep. -->

---

<!-- _class: section-divider -->

# Section 1: The Test Pyramid

---

## Three layers, three trade-offs

```text
        /  E2E  \        few   - slow, brittle, high confidence
       / integr. \       some  - medium cost, real interactions
      /   unit    \      many  - fast, cheap, pinpoint failures
```

| Layer | Scope | Speed | When it fails, you know... |
| --- | --- | --- | --- |
| Unit | One function/module | ms | *exactly* which function broke |
| Integration | Components together | seconds | a seam between parts broke |
| End-to-end | Whole system, real I/O | minutes | *something* broke, somewhere |

<!-- The pyramid is about economics, not dogma. Each layer trades speed and diagnostic precision for realism. Unit tests fail with a filename and line; an e2e failure starts an investigation. You want most of your confidence to come from the cheap, precise layer. -->

---

## Why shape matters: the ice-cream cone

- The **anti-pattern**: many manual/E2E tests, few unit tests — the pyramid upside down
- How teams get there: "just test it through the UI, that's what users see"
- Consequences:
  - Suite takes 40+ minutes → violates module 4's 10-minute budget
  - One UI change breaks 30 tests
  - Failures say "something is wrong" but never *what*
- Fixing the cone means pushing tests **down** the stack

<!-- The ice-cream cone emerges from reasonable-sounding local decisions. Ask who has seen a 45-minute UI suite. Connect explicitly to module 4: a cone-shaped suite cannot deliver fast feedback no matter how good the CI server is. -->

---

## What makes a good unit test

- **Fast** — milliseconds; thousands should run in seconds
- **Isolated** — no network, no disk, no database, no shared state with other tests
- **Deterministic** — same code, same result, every single run
- Our app is already testable by design:

```javascript
// app.js exports pure-ish logic, no HTTP required to test it
const result = handleRequest('/?name=Linus');
assert.strictEqual(result.body.message, 'Hello, Linus!');
```

<!-- Point at the sample app: app.js (logic) is split from server.js (HTTP wiring) precisely so logic is testable without sockets. That separation is a design choice — testability is an architecture property, not a testing-tool property. The three adjectives are quiz material. -->

---

## Integration and smoke tests for services

- **Integration test**: exercise real components together — e.g. start the HTTP server, make a real request
- **Smoke test**: minimal "is it alive?" check — start the service, hit one endpoint, expect 200

```bash
node server.js &
curl --fail http://localhost:3000/health
# {"status":"ok","uptimeSeconds":0}
```

- Cheap insurance against failures unit tests can't see: broken startup, port binding, wiring between `server.js` and `app.js`

<!-- Our unit tests never actually start the server — server.js could be broken and the suite would stay green. The smoke test closes that gap for one curl's worth of effort. In the lab, this exact check goes into CI. The /health endpoint exists for exactly this purpose, and returns in modules 6 and 7 as Docker and Kubernetes probes. -->

---

## Flaky tests: the causes

A **flaky test** passes or fails with no code change. The usual suspects:

| Cause | Example |
| --- | --- |
| **Time** | Asserting on `Date.now()`, sleeps, timeouts tuned to a fast laptop |
| **Network** | Calling a real external API that is sometimes slow or down |
| **Order-dependence** | Test B passes only if test A ran first and left state behind |

- Note our app's trap: `requestCount` in `app.js` is **module-level shared state** — a test asserting an exact count depends on test order

<!-- Make it concrete with our own code: requestCount increments across all tests in the process, so asserting requestCount === 1 works alone and fails in a suite. That is order-dependence hiding in a 34-line app. Time and network flakes dominate in real codebases. -->

---

## Flaky tests: the quarantine strategy

1. **Detect** — a test fails, a re-run passes: flag it immediately
2. **Quarantine** — move it out of the blocking suite (skip with a tracking ticket)
3. **Fix or delete** — within a fixed time budget (e.g. one week)

- Never: auto-retry-until-green as a permanent policy — that institutionalizes the noise
- From module 4: one tolerated flake teaches the team that red means "re-run", and CI trust dies

<!-- Quarantine is a triage protocol, not a graveyard — the ticket and deadline are what distinguish it from silently skipping tests forever. Auto-retry is tempting and common; explain why it treats the symptom while the disease (nondeterminism) spreads. -->

---

<!-- _class: section-divider -->

# Section 2: Coverage — Measuring Without Worshipping

---

## What coverage measures

- **Line coverage**: % of lines executed at least once during the test run
- **Branch coverage**: % of decision outcomes taken (both the `if` **and** the `else`)
- Branch is stricter and more honest:

```javascript
function greet(name) {
  if (!name || typeof name !== 'string') {   // 2 branches
    return 'Hello, world!';
  }
  return `Hello, ${name.trim()}!`;
}
// greet('Ada') alone: 100% of the happy-path lines,
// but the guard branch was never taken
```

<!-- Walk through the example: calling greet('Ada') executes most lines, but the !name guard never fires — line coverage looks fine while branch coverage exposes the untested path. This is why the quiz asks about the difference. -->

---

## Coverage tells you what you *didn't* test

- High coverage does **not** mean good tests:

```javascript
test('covers everything, asserts nothing', () => {
  handleRequest('/');
  handleRequest('/health');
  handleRequest('/nope');   // 90%+ coverage, zero assertions
});
```

- Low coverage **does** mean something: that code has never been exercised by any test
- Coverage is a **detector of gaps**, not a certificate of quality

<!-- The assertion-free test is the killer demo: near-total coverage, zero verification. Coverage counts execution, not checking. Its honest use is negative — "this error handler has never run under test" is actionable information. -->

---

## 100% is a vanity target

- Chasing 100% forces tests on trivial or defensive code — tests that assert nothing useful but must be maintained forever
- Goodhart's law: *when a measure becomes a target, it ceases to be a good measure*
  - Teams gaming coverage write assertion-free tests to move the number
- Better: coverage as a **ratchet** — the threshold only ever goes **up**
  - Start at today's honest number (say 72%), fail CI below it, raise it as real tests land
  - Prevents regression without incentivizing junk tests

<!-- The ratchet reframes coverage from goal to floor. Nobody writes junk tests to keep a floor they already clear; the number climbs only when genuine tests are added. Contrast with a mandated 100% — ask what kind of tests that incentivizes. -->

---

## Coverage with zero new dependencies

- Node's built-in test runner ships an experimental coverage reporter:

```bash
node --test --experimental-test-coverage
```

```text
ℹ start of coverage report
ℹ file        | line % | branch % | funcs % | uncovered lines
ℹ app.js      |  96.87 |    92.31 |  100.00 | 26-27
ℹ app.test.js | 100.00 |   100.00 |  100.00 |
ℹ end of coverage report
```

- The `uncovered lines` column is the actionable part — go read those lines

<!-- No istanbul/nyc needed for our purposes — the platform does it. Have students predict before the lab which lines of app.js are uncovered (the /metrics branch — no test hits it). The uncovered-lines column turns an abstract percentage into a to-do list. -->

---

<!-- _class: section-divider -->

# Section 3: Static Analysis, Linting & Formatting

---

## Static analysis: finding bugs without running code

- **Static analysis** examines source code without executing it
- The family:
  - **Linters** (ESLint) — bug patterns, suspicious constructs, style rules
  - **Type checkers** (TypeScript, `tsc --noEmit`) — static analysis specialized in type errors
  - **Security scanners** — known-vulnerable patterns and dependencies (module 12)
- Complements tests: analyzes **all** paths, including ones no test executes

<!-- Position static analysis as the other half of verification: tests check behavior on paths you exercised; static analysis checks structure on every path. Type checkers belong in this family — students who know TypeScript already use static analysis daily without the name. -->

---

## ESLint: what it catches

```javascript
const unused = computeExpensiveThing();   // no-unused-vars: dead or forgotten code

if (count == '3') { ... }                  // eqeqeq: '3' == 3 is true — coercion bug

let name = 'Ada';                          // prefer-const: never reassigned,
return greet(name);                        // so say so
```

- Each rule encodes a **class of bug or confusion** learned by the community
- Modern ESLint config: **flat config** — `eslint.config.js`, an exported array of config objects

<!-- Go rule by rule: unused vars usually mean a typo or forgotten refactor; == coercion is a classic JS landmine; prefer-const documents intent. Mention flat config explicitly since older tutorials show .eslintrc — the lab uses the current format. -->

---

## Linting vs formatting — different jobs

| | Linter (ESLint) | Formatter (Prettier) |
| --- | --- | --- |
| Concern | Correctness & code quality | Layout: whitespace, quotes, wrapping |
| Example | `eqeqeq`, `no-unused-vars` | line width 80, single quotes |
| Failure mode | Possible bug | Inconsistent style |
| Fixable | Sometimes (`--fix`) | Always, by definition |

- **Auto-formatting kills bikeshedding**: nobody argues tabs-vs-spaces when a machine reformats on save
- Code review time goes to logic, not layout — the formatter already won every style argument

<!-- Bikeshedding: Parkinson's committee approves the nuclear plant in minutes but debates the bike shed for hours, because everyone can have an opinion about trivia. Style comments in review are the bike shed. A formatter ends those arguments permanently by making them moot. -->

---

<!-- _class: section-divider -->

# Section 4: Quality Gates — Making It Enforced

---

## What a quality gate is

> A **quality gate** is an automated check that must pass before a change proceeds — no human discretion involved.

Three defining properties:

1. **Automated** — a machine evaluates it, identically every time
2. **Enforced** — failing the gate *blocks* the merge (required checks, module 4)
3. **Objective** — pass/fail criteria are explicit and visible to everyone

- A convention that a human might waive under deadline pressure is not a gate

<!-- The word "gate" is literal: closed until the check opens it. Contrast with "we usually run the linter before merging" — that is a custom, and customs lose to deadlines every time. The whole point is removing discretion from the path to main. -->

---

## The gates we are assembling

| Gate | Tool | Status |
| --- | --- | --- |
| Tests pass | `node --test` in CI | Module 4 |
| Lint clean | ESLint job in CI | **This week** |
| Service boots & responds | Smoke test in CI | **This week** |
| Coverage above threshold | Coverage ratchet | Discussed today |
| No high-severity vulnerabilities | Dependency & image scanning | Module 12 |

- Each gate becomes a **required status check** — the same enforcement lever, reused

<!-- This table is the course roadmap for quality. The mechanism never changes — required status checks from module 4 — only the set of checks grows. Module 12 adds security gates; module 6's Docker build itself becomes a gate too. -->

---

## Pre-commit hooks vs CI: defense in depth

```text
editor save  -->  pre-commit hook  -->  CI pipeline
(format)          (lint staged files)   (lint + test + smoke, enforced)
fastest                fast              authoritative
```

- **Hooks** catch problems in seconds, before a commit exists — great developer experience
- But hooks are **advisory**: they run on the developer's machine, can be skipped (`git commit --no-verify`), and can drift per machine
- **CI is the source of truth**: it runs in a controlled environment and cannot be bypassed when checks are required

<!-- Layered defense: catch early for speed, enforce centrally for integrity. The --no-verify escape hatch is the key argument — anything a developer can skip is a convenience, not a gate. Never let a team believe hooks alone protect main. -->

---

## Code review: the human quality gate

- From module 2: PRs + branch protection already require a human approval
- Machines and humans check **different things**:
  - Machines: tests, lint, formatting, coverage — tireless, instant, pedantic
  - Humans: design, naming, "should this exist at all?", knowledge sharing
- Every check you automate **frees review attention** for the things only humans can judge
- A reviewer commenting on missing semicolons is a process failure, not diligence

<!-- Close the loop with module 2. The division of labor is the insight: automation is not about replacing review but upgrading it. If reviewers police formatting, you are paying senior-engineer prices for a linter's job. -->

---

## Our CI pipeline after this week

```yaml
jobs:
  lint:                    # new: fast, fails in seconds
    steps: [checkout, setup-node, npm ci, npm run lint]
  test:                    # from module 4, matrix 18/20/22
    steps: [checkout, setup-node, npm test,
            start server + curl /health]   # new: smoke test
```

- `lint` and `test` run **in parallel** — all the bad news at once (module 4: fail fast)
- Both become **required checks**

<!-- Preview of the lab's end state. Note the design choices: lint as a separate job so it reports independently and fast; smoke test appended to the test job because it needs the same runner anyway. Parallel jobs deliver complete feedback in one push. -->

---

## Summary

- Test pyramid: many fast unit tests, some integration, few E2E — the ice-cream cone inverts it and destroys feedback speed
- Good unit tests are **fast, isolated, deterministic**; flakes (time, network, order) get quarantined same-day
- Coverage detects **gaps**; branch beats line; use it as a **ratchet**, never chase 100%
- Linting finds bug classes statically; formatting is a solved argument — automate both
- A quality gate = automated + enforced + objective; CI is the source of truth, hooks are a courtesy
- Code review is the human gate — spend it on what machines can't judge

<!-- Run the summary as quick-fire questions: name the three unit test adjectives, the three flake causes, the three gate properties. The parallel threes make it memorable. Remind them the quiz draws directly from these. -->

---

## Next up

- **Lab 05**: in your `devops-demo-app` repo — add ESLint with a flat config, break and fix a lint rule, measure coverage with the built-in runner, split CI into parallel `lint` + `test` jobs, add a `/health` smoke test to the pipeline, and make lint a required check
- **Module 06: Containers with Docker** — your pipeline proves the code works; next we package the *environment* it works in, so it runs identically everywhere

<!-- Lab pitch: by the end, their pipeline has real teeth — lint, tests on three Node versions, and a live smoke test, all required. Tease module 6 with the remaining gap: CI proves the code, but the runtime environment still varies. Containers fix that. -->
