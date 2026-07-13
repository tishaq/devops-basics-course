# Lab 04: Your First CI Pipeline with GitHub Actions

## What you will do

You will add a GitHub Actions workflow to your `devops-demo-app` repository so that every push and pull request automatically runs the test suite. You will watch a check pass on a PR, deliberately break a test to see the pipeline catch it, expand the workflow into a matrix build across three Node.js versions, make the check required so red PRs cannot merge, and add a live status badge to your README.

Estimated time: 60-90 minutes.

## Prerequisites

- [ ] Completed Lab 02: you have your own GitHub repository named `devops-demo-app` containing the sample app, with branch protection enabled on `main` and a PR-based workflow.
- [ ] Completed Lab 03: your repo contains `scripts/healthcheck.sh` and you are comfortable in the shell.
- [ ] Git configured locally and able to push to your repository.
- [ ] Node.js 18 or newer installed locally (`node --version`).
- [ ] Tests pass locally: `npm test` exits cleanly in your repo.

## Steps

### 1. Create the workflow file

Workflows live in a magic directory: `.github/workflows/` at the repository root. Start from an up-to-date `main` and create a branch:

```bash
cd devops-demo-app
git switch main
git pull
git switch -c lab04-ci
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml` with exactly this content:

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

Read it back against the vocabulary from the lecture: one **workflow** named `CI`, two **triggers** (pushes to `main`, and every pull request), one **job** named `test` on an `ubuntu-latest` **runner**, and three **steps** — two reusable **actions** and one shell command.

YAML is whitespace-sensitive: indent with spaces only, two per level.

### 2. Push the branch, open a PR, and watch the check run

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow running tests on push and PR"
git push -u origin lab04-ci
```

Open a pull request (via the URL git prints, or `gh pr create` if you use the GitHub CLI). At the bottom of the PR page a checks panel appears within a few seconds:

```text
Some checks haven't completed yet
  * CI / test (pull_request)  — In progress...
```

Click **Details** to watch the live log. You should see the runner spin up, check out your commit, install Node 20, and run the tests:

```text
> devops-demo-app@1.0.0 test
> node --test

✔ greet returns default greeting without a name (0.4ms)
✔ greet greets by name (0.1ms)
✔ greet trims whitespace (0.1ms)
✔ root route returns a greeting (0.6ms)
✔ health route reports ok (0.2ms)
✔ unknown routes return 404 (0.1ms)
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

The PR check turns into a green check mark: `CI / test (pull_request) — Successful`.

Do **not** merge yet — the next step deliberately breaks the build on this same PR.

### 3. Break a test on purpose, then fix it

Seeing the pipeline fail is the point of this step — a gate you have never seen closed is a gate you cannot trust.

Edit `app.js` and change the default greeting so a test fails:

```javascript
function greet(name) {
  if (!name || typeof name !== 'string') {
    return 'Hello, wrold!';   // deliberate typo
  }
  return `Hello, ${name.trim()}!`;
}
```

Confirm it fails locally first, then push:

```bash
npm test          # observe: fail 1
git add app.js
git commit -m "Deliberately break greeting to observe CI failure"
git push
```

The PR check re-runs and turns into a red X. In the log:

```text
✖ greet returns default greeting without a name (1.2ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  'Hello, wrold!' !== 'Hello, world!'
ℹ tests 6
ℹ pass 5
ℹ fail 1
```

**Copy the URL of this failed run** (from the Details page, it looks like `https://github.com/YOUR-USER/devops-demo-app/actions/runs/1234567890`) — it is a deliverable.

Now revert the sabotage and confirm green:

```bash
git revert --no-edit HEAD
git push
```

The check re-runs and returns to green.

### 4. Add a matrix over Node versions

One Node version proves little; your users (and your future Kubernetes base images) may run others. Replace the `jobs:` section of `.github/workflows/ci.yml` so the whole file reads:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

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

Commit and push:

```bash
git add .github/workflows/ci.yml
git commit -m "Test across Node 18, 20, and 22 with a matrix"
git push
```

The PR checks panel now shows **three** parallel checks:

```text
CI / test (18) (pull_request) — Successful
CI / test (20) (pull_request) — Successful
CI / test (22) (pull_request) — Successful
```

Merge the PR now (it should be fully green), then pull `main` locally:

```bash
git switch main
git pull
```

Notice on the repository's **Actions** tab that merging also triggered the `push` run against `main` — that is your second trigger doing its job.

### 5. Make the CI check required

Time to give the pipeline teeth. In your repository on GitHub:

1. Go to **Settings → Branches** and edit the branch protection rule for `main` you created in Lab 02.
2. Enable **Require status checks to pass before merging** (and **Require branches to be up to date before merging**).
3. In the search box, add the checks named `test (18)`, `test (20)`, and `test (22)`. (A check must have run at least once to appear in the list — yours ran in step 4.)
4. Save the rule.

From now on, a PR with a red check has its merge button disabled. If you want to prove it to yourself, repeat step 3's sabotage on a new branch and observe the greyed-out merge button before reverting.

### 6. Add the status badge to your README

Create one final branch:

```bash
git switch -c lab04-badge
```

Add this line near the top of `README.md`, directly under the `# devops-demo-app` heading (replace `YOUR-USER` with your GitHub username):

```markdown
![CI](https://github.com/YOUR-USER/devops-demo-app/actions/workflows/ci.yml/badge.svg)
```

Push, open a PR — and note that your new required checks now guard even this documentation change — then merge when green:

```bash
git add README.md
git commit -m "Add CI status badge to README"
git push -u origin lab04-badge
```

After merging, your repository's front page shows a live **passing** badge.

## Deliverables

Submit the following in your lab write-up:

1. The URL of a green workflow run on `main` showing all three matrix jobs (from your repository's Actions tab).
2. The URL (or a screenshot) of the deliberately failed run from step 3, showing the red X and the assertion error.
3. The URL of your repository's README displaying the CI badge.
4. One or two sentences: what happens now if someone opens a PR with a failing test, and why?

## Troubleshooting

**The workflow never runs after pushing.**
The file must be on the branch you pushed and located exactly at `.github/workflows/ci.yml` (note: `workflows`, plural, inside `.github`). Run `git ls-files .github` to verify the path was committed. Also confirm Actions are enabled under Settings → Actions → General.

**"Invalid workflow file" error on the Actions tab.**
YAML indentation is wrong or a tab character crept in. Compare against the listing in step 1 character by character; use spaces only. The error message includes the line number of the problem.

**`npm test` fails on the runner with "node: --test is not a valid option".**
The runner is using a Node version older than 18. Check that `actions/setup-node` is present, spelled correctly, and that `node-version` is indented under `with:`.

**My check does not appear in the required-checks search box (step 5).**
GitHub only lists checks that have completed at least once on the repository. Make sure the matrix run from step 4 finished, then reload the settings page and search for `test` — the entries are named `test (18)`, `test (20)`, `test (22)`, not `CI`.

**The badge shows "no status" or a 404 image.**
The badge URL must reference the workflow *file name* (`ci.yml`), not the workflow's display name, and the workflow must have run at least once on the default branch. Double-check your username in the URL.
