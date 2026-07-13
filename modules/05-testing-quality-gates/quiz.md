# Quiz 05: Testing & Quality Gates

Answer all questions. For multiple choice, select the single best answer. For short answer, two or three sentences are enough. The answer key follows the horizontal rule — attempt every question first.

**Q1.** According to the test pyramid, why should a codebase have many more unit tests than end-to-end tests?

A. Unit tests are the only kind that can run in CI.
B. Unit tests are fast, cheap, and pinpoint the failing code, so most confidence should come from that layer; E2E tests are slow, brittle, and vague about causes.
C. End-to-end tests cannot detect real bugs.
D. Unit tests achieve higher coverage percentages by definition.

**Q2.** A team's suite consists mostly of browser-driven UI tests, takes 50 minutes, and one page change breaks dozens of tests. What is this shape called, and what is the standard remedy?

A. The test diamond; add more E2E tests to stabilize it.
B. The testing trophy; nothing is wrong.
C. The ice-cream cone; push tests down the stack into integration and unit layers.
D. The pyramid; increase the CI timeout.

**Q3.** Which of the following most likely makes a unit test flaky?

A. Asserting on the return value of a pure function.
B. Asserting that a computation completes within 50 milliseconds.
C. Using `assert.strictEqual` instead of `assert.equal`.
D. Running the test on Node 22 instead of Node 20.

**Q4.** Short answer: our sample app increments a module-level `requestCount` variable on every call to `handleRequest`. Explain why a test asserting `requestCount === 1` after one call could pass when run alone but fail in the full suite, and name the flakiness category this belongs to.

**Q5.** Your tests call `greet('Ada')` but never call `greet()` without arguments. Line coverage of `greet` is high, yet something important is untested. Which metric exposes this, and why?

A. Function coverage, because `greet` was never invoked.
B. Branch coverage, because the `!name` guard's true path was never taken even though most lines executed.
C. Line coverage, because uncovered lines always indicate untested branches.
D. Statement coverage, because assertions were missing.

**Q6.** Short answer: what does it mean to use code coverage "as a ratchet," and what developer behavior does a mandated 100% coverage target tend to produce instead?

**Q7.** Which statement correctly separates the jobs of ESLint and Prettier?

A. ESLint checks layout; Prettier finds bugs.
B. ESLint finds likely-bug patterns and quality issues (e.g. `eqeqeq`, `no-unused-vars`); Prettier mechanically normalizes formatting (quotes, wrapping) — and automating formatting eliminates style debates in review.
C. They are interchangeable; teams should pick exactly one.
D. Prettier only works on TypeScript; ESLint only works on JavaScript.

**Q8.** A team runs lint and tests in a pre-commit hook but not in CI, arguing the hook makes CI redundant. What is the strongest objection?

A. Pre-commit hooks cannot run ESLint.
B. Hooks run only on developer machines and can be skipped with `git commit --no-verify`, so they are advisory; only CI with required status checks is an enforceable source of truth.
C. Hooks are slower than CI.
D. CI is required by GitHub's terms of service.

**Q9.** Which of the following is a quality gate, as defined in this module?

A. A team norm of running the linter before pushing, when there is time.
B. A wiki page listing code style guidelines.
C. A required CI status check that fails the pull request when `npx eslint .` exits non-zero.
D. A reviewer who usually notices unused variables.

**Q10.** Short answer: in Lab 05 you added a CI step that starts `node server.js` in the background and curls `/health`. Name one class of failure this smoke test catches that the unit test suite in `app.test.js` structurally cannot, and explain why the unit tests miss it.

---

## Answer Key

**Q1 — B.** The pyramid allocates effort by economics: the unit layer gives fast, precise, cheap feedback, so it should carry most of the confidence, while the expensive, vague E2E layer stays thin.

**Q2 — C.** A fat top of UI/E2E tests over a thin unit base is the ice-cream cone anti-pattern, and the remedy is converting that coverage into faster, more precise tests lower in the stack.

**Q3 — B.** Timing assertions depend on machine load and speed — fine on a fast laptop, failing on a busy CI runner — which is the classic "time" category of flakiness; the other options are deterministic.

**Q4 — Sample answer.** Other tests in the suite also call `handleRequest`, so the shared module-level counter is already above zero by the time this test runs, making the result depend on which tests ran before it; this is order-dependence (shared state between tests).

**Q5 — B.** Branch coverage tracks whether each decision outcome was taken; `greet('Ada')` executes most lines but never takes the guard's true branch, which line coverage largely hides and branch coverage exposes.

**Q6 — Sample answer.** A ratchet sets the CI coverage threshold at the current honest value and only ever raises it as real tests are added, preventing regression; a 100% mandate, per Goodhart's law, incentivizes assertion-free tests written solely to move the number.

**Q7 — B.** Linting is about correctness and code quality; formatting is about layout — and because a formatter's output is mechanical, adopting one removes style bikeshedding from code review entirely.

**Q8 — B.** Anything skippable on a developer machine is a courtesy, not a gate; defense in depth uses hooks for fast local feedback while CI, enforced through required checks, remains the authoritative and unbypassable verdict.

**Q9 — C.** A quality gate must be automated, enforced, and objective; only the required CI check meets all three, while norms, documents, and attentive reviewers all rely on human discretion.

**Q10 — Sample answer.** It catches startup and wiring failures — for example `server.js` crashing on boot, failing to bind the port, or mis-wiring the HTTP layer to `handleRequest` — because the unit tests import functions from `app.js` directly and never execute `server.js` or open a socket at all.
