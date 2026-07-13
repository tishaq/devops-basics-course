# Lab 05: Linting, Coverage, and a Smarter Pipeline

## What you will do

You will add ESLint with a modern flat config to your `devops-demo-app` repository, watch it catch a real rule violation, measure test coverage with Node's built-in runner, and then upgrade your CI workflow from module 4 into two parallel jobs — `lint` and `test` — with a smoke test that starts the actual server in CI and curls `/health`. Finally you will make `lint` a required check, so from now on neither broken tests *nor* lint violations can reach `main`.

Estimated time: 75-110 minutes.

## Prerequisites

- [ ] Completed Lab 04: your `devops-demo-app` repo has `.github/workflows/ci.yml` with the Node 18/20/22 matrix, the checks are required on `main`, and the README badge is green.
- [ ] Node.js 18 or newer and npm installed locally (`node --version`, `npm --version`).
- [ ] Tests pass locally: `npm test`.
- [ ] You can create branches and open PRs in your repository.

## Steps

### 1. Install ESLint and create the flat config

Start from a fresh branch:

```bash
cd devops-demo-app
git switch main
git pull
git switch -c lab05-quality-gates
```

Install ESLint as a development dependency. This creates `node_modules/`, adds a `devDependencies` section to `package.json`, and generates `package-lock.json`:

```bash
npm install --save-dev eslint
```

The `@eslint/js` package (ESLint's own recommended ruleset) is installed automatically alongside `eslint`, so no further installs are needed.

Create `eslint.config.js` in the repository root with exactly this content. Our app is CommonJS (`require`/`module.exports`), so we set `sourceType: 'commonjs'` and declare the Node.js globals the app uses:

```javascript
'use strict';

const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'prefer-const': 'error',
      eqeqeq: 'error',
    },
  },
];
```

Two notes on the config:

- `sourceType: 'commonjs'` tells ESLint these are CommonJS scripts, which also makes `require`, `module`, `exports`, `__dirname`, and `__filename` available.
- `js.configs.recommended` turns on ESLint's curated baseline (things like `no-undef` and `no-dupe-keys`); our `rules` block layers three stricter rules on top.

If your repo does not already have a `.gitignore` entry for `node_modules`, add one now:

```bash
echo "node_modules/" >> .gitignore
```

### 2. Run the linter, break it on purpose, fix it

Your `package.json` already has a lint script (`"lint": "npx eslint ."`). Run it:

```bash
npx eslint .
```

Expected output: nothing. ESLint follows the Unix convention of staying silent on success (exit code 0 — verify with `echo $?`).

Now introduce a violation. Add an unused variable near the top of `app.js`:

```javascript
const debugMode = true;   // add this line — nothing uses it
```

Run the linter again:

```bash
npx eslint .
```

Expected output:

```text
/Users/you/devops-demo-app/app.js
  5:7  error  'debugMode' is assigned a value but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

The exit code is now 1 — which is exactly what will make a CI job fail. Delete the `debugMode` line, re-run `npx eslint .`, and confirm silence.

### 3. Measure coverage with the built-in runner

No extra tools needed — Node's test runner has an experimental coverage reporter:

```bash
node --test --experimental-test-coverage
```

After the usual test results, a coverage table appears:

```text
ℹ tests 6
ℹ pass 6
ℹ fail 0
ℹ start of coverage report
ℹ ------------------------------------------------------------------
ℹ file        | line % | branch % | funcs % | uncovered lines
ℹ ------------------------------------------------------------------
ℹ app.js      |  91.18 |    88.89 |  100.00 | 24-28
ℹ app.test.js | 100.00 |   100.00 |  100.00 |
ℹ ------------------------------------------------------------------
ℹ all files   |  95.65 |    94.44 |  100.00 |
ℹ ------------------------------------------------------------------
ℹ end of coverage report
```

(Your exact percentages and line numbers may differ slightly by Node version.)

Look at the `uncovered lines` column for `app.js` and open those lines in your editor: they are the `/metrics` branch of `handleRequest` — no test ever requests `/metrics`. **Copy your coverage table into your lab write-up** (deliverable 2), and add one sentence identifying what the uncovered lines are.

Optional stretch: write a test in `app.test.js` that calls `handleRequest('/metrics')` and asserts `status === 200`, then re-run coverage and watch the number move. This is the ratchet from the lecture, in miniature.

### 4. Split CI into parallel lint and test jobs

Replace the entire contents of `.github/workflows/ci.yml` with:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint

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

What changed since module 4:

- A new `lint` job runs **in parallel** with `test` — you get lint and test results at the same time (fail fast, module 4).
- The lint job runs `npm ci`, the CI-appropriate install command: it installs exactly what `package-lock.json` specifies and fails if the lockfile is out of sync. This is why committing the lockfile matters.
- `cache: npm` makes `setup-node` cache npm downloads keyed on the lockfile — our one dev dependency installs fast anyway, but the habit is right.
- The `test` job needs no `npm ci`: the app has zero runtime dependencies and `node --test` needs nothing installed.

### 5. Add a smoke-test step

Unit tests never start the server; a green suite proves nothing about `node server.js` actually booting. Add a smoke test as a final step of the `test` job. Append this step to the `test` job's `steps:` list (after the `npm test` step, same indentation):

```yaml
      - name: Smoke test /health
        run: |
          node server.js &
          curl --fail --retry 10 --retry-delay 1 --retry-connrefused \
            http://localhost:3000/health
          kill %1
```

How it works:

- `node server.js &` starts the app in the background on the runner (default port 3000).
- `curl --fail` exits non-zero on HTTP errors, failing the step; `--retry 10 --retry-delay 1 --retry-connrefused` retries for up to ~10 seconds while the server starts, including on connection-refused (which curl does not retry by default).
- `kill %1` stops the background server so the step exits cleanly.

Commit everything and open a PR:

```bash
git add eslint.config.js package.json package-lock.json .gitignore .github/workflows/ci.yml
git commit -m "Add ESLint gate and /health smoke test to CI"
git push -u origin lab05-quality-gates
```

On the PR you should now see **four** checks, all green:

```text
CI / lint (pull_request)      — Successful
CI / test (18) (pull_request) — Successful
CI / test (20) (pull_request) — Successful
CI / test (22) (pull_request) — Successful
```

Click into a `test` job's log and find the smoke-test step — you should see the server's startup line and the health JSON:

```text
devops-demo-app listening on port 3000
{"status":"ok","uptimeSeconds":0}
```

Optional but recommended: before merging, re-add the `debugMode` line from step 2, push, and watch the `lint` job fail while all three `test` jobs stay green — that is exactly the independent, parallel feedback we wanted. Revert it (`git revert --no-edit HEAD`, push) and merge the PR once everything is green.

### 6. Make lint a required check

In your repository on GitHub:

1. Go to **Settings → Branches** and edit the protection rule for `main`.
2. Under **Require status checks to pass before merging**, add the check named `lint` alongside the existing `test (18)`, `test (20)`, and `test (22)`.
3. Save.

Your quality gates are now: tests pass on three Node versions, the server actually boots and answers `/health`, and the code is lint-clean — all enforced, none skippable.

## Deliverables

Submit the following in your lab write-up:

1. The URL of a green workflow run showing both the `lint` job and all three matrix `test` jobs.
2. Your coverage table from step 3, pasted as text, plus one sentence identifying what the uncovered lines of `app.js` are.
3. A screenshot or URL of your branch protection settings showing `lint` in the required checks list.
4. One or two sentences: why does the smoke test catch a class of failure that the unit tests cannot?

## Troubleshooting

**`npx eslint .` reports "'require' is not defined" or "'module' is not defined".**
Your config is missing `sourceType: 'commonjs'`, or the config file is not being picked up. Confirm the file is named exactly `eslint.config.js` and sits in the repository root, and that `languageOptions` is spelled correctly.

**The `lint` job fails with "npm ci can only install with an existing package-lock.json".**
You forgot to commit `package-lock.json` in step 5. Run `git add package-lock.json`, commit, and push. Never add the lockfile to `.gitignore`.

**ESLint flags `eslint.config.js` itself or files in `node_modules`.**
ESLint ignores `node_modules` by default, so violations there mean the directory was committed to git — remove it (`git rm -r --cached node_modules`) and add it to `.gitignore`. If a rule fires inside `eslint.config.js`, fix it like any other file; the config lints itself.

**The smoke-test step fails with "curl: (7) Failed to connect" even after retries.**
Check the step's log for the server's startup line. If `node server.js` crashed immediately, the real error is printed just above curl's output — fix that first. Also confirm you did not set a `PORT` env var in the workflow that differs from the URL in the curl command.

**The smoke-test step passes curl but the job hangs until timeout.**
The background server was never killed, so the step's shell never exits. Make sure the `kill %1` line is present and is part of the same multi-line `run: |` block as `node server.js &`.

**Coverage output shows no table, just test results.**
The `--experimental-test-coverage` flag requires Node 18.15 or newer, and the flag must come after `--test`. Check `node --version` and the exact command: `node --test --experimental-test-coverage`.
