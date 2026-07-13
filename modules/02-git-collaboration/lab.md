# Lab 02: Your Repository, Your Workflow

## What you will do

**This lab is the foundation for every later lab in the course.** The repository you create today is the one that gains a CI pipeline in module 4, quality gates in module 5, a Dockerfile in module 6, and Kubernetes manifests in module 7 — so complete every step. You will: create your own GitHub repository named `devops-demo-app`, copy the course sample app into it, protect `main`, then practice the full professional workflow — feature branch, a real code change (`/version` endpoint) with a test, pull request, review, squash merge — followed by manufacturing and resolving a merge conflict, and tagging release `v1.0.0`.

Estimated time: 90-120 minutes.

## Prerequisites

- [ ] Lab 01 completed (git, Node.js 18+, and curl verified; course repo cloned)
- [ ] A GitHub account
- [ ] Git configured with your identity: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`
- [ ] Authentication to GitHub working: either SSH keys set up, or the `gh` CLI logged in (`gh auth login`), or a personal access token for HTTPS pushes

## Steps

### Step 1: Create your own GitHub repository

On GitHub, click **New repository** (or use `gh repo create`). Settings:

- Name: `devops-demo-app`
- Visibility: public (simplest for later modules; private works if you prefer)
- Do **not** initialize with a README, .gitignore, or license — you want an empty repository

With the CLI:

```bash
gh repo create devops-demo-app --public
```

Expected output:

```text
✓ Created repository <your-username>/devops-demo-app on GitHub
```

### Step 2: Copy the sample app into a fresh local repository

From the directory that contains your `devops-basics-course` clone (from lab 01):

```bash
mkdir devops-demo-app
cd devops-demo-app
git init -b main
cp ../devops-basics-course/sample-app/server.js .
cp ../devops-basics-course/sample-app/app.js .
cp ../devops-basics-course/sample-app/app.test.js .
cp ../devops-basics-course/sample-app/package.json .
cp ../devops-basics-course/sample-app/README.md .
```

Create a `.gitignore` (later modules add dependencies and local env files, so start the habit now):

```bash
cat > .gitignore <<'EOF'
node_modules/
.env
EOF
```

Verify the app works in its new home:

```bash
npm test
```

Expected output ends with:

```text
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### Step 3: First commit and push to main

```bash
git add .
git status
```

Expected: 6 new files staged (`.gitignore`, `README.md`, `app.js`, `app.test.js`, `package.json`, `server.js`).

```bash
git commit -m "chore: initial import of devops-demo-app"
git remote add origin git@github.com:<your-username>/devops-demo-app.git
git push -u origin main
```

Expected output (abbreviated):

```text
To github.com:<your-username>/devops-demo-app.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

(If you use HTTPS instead of SSH, the remote URL is `https://github.com/<your-username>/devops-demo-app.git`.)

### Step 4: Protect main

On GitHub: your repository → **Settings** → **Branches** → **Add branch protection rule** (or **Add ruleset**):

- Branch name pattern: `main`
- Enable **Require a pull request before merging**
- Enable **Require approvals** (1) — note: on a solo repository GitHub will not let you approve your own PR, so if you have no lab partner, leave approvals at 0 or merge without an approval; the PR itself is still required
- Enable **Block force pushes**

Verify the protection works by trying to push directly to main:

```bash
echo "# test" >> README.md
git commit -am "test: should be rejected"
git push
```

Expected output — the push fails:

```text
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
```

Undo the local test commit:

```bash
git reset --hard origin/main
```

### Step 5: Ship a /version endpoint through a real PR

Create a short-lived feature branch:

```bash
git switch -c feat/add-version-endpoint
```

Edit `app.js`. First, add one line near the top of the file, after the `let requestCount = 0;` line:

```javascript
const pkg = require('./package.json');
```

Then add a `/version` case to the `switch` inside `handleRequest`, directly after the `/metrics` case and before `default:`:

```javascript
    case '/version':
      return { status: 200, body: { version: pkg.version } };
```

Edit `app.test.js` and add this test at the end of the file, matching the existing style:

```javascript
test('version route returns the package version', () => {
  const result = handleRequest('/version');
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.version, require('./package.json').version);
});
```

Run the tests:

```bash
npm test
```

Expected output ends with:

```text
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

Sanity-check the running server too:

```bash
node server.js &
curl http://localhost:3000/version
kill %1
```

Expected curl output:

```text
{"version":"1.0.0"}
```

Commit (Conventional Commits style) and push:

```bash
git add app.js app.test.js
git commit -m "feat: add /version endpoint returning package version"
git push -u origin feat/add-version-endpoint
```

### Step 6: Open, review, and squash-merge the PR

Open the pull request:

```bash
gh pr create --title "feat: add /version endpoint" \
  --body "Adds GET /version returning the version from package.json, with a test. Useful later for verifying which build is deployed."
```

(Or use the "Compare & pull request" button GitHub shows after the push.)

Review it as a reviewer would, even solo: open the **Files changed** tab, read the diff line by line, and leave at least one comment (for example, a `nit:` or a question). If you have a lab partner, review each other's PRs and approve.

Merge using **Squash and merge** (button dropdown on the PR page), keeping the PR title as the commit subject. Then update your local main and confirm the squashed history:

```bash
git switch main
git pull
git log --oneline -3
```

Expected output — one squash commit for the whole PR (hashes will differ):

```text
3f2a1c9 feat: add /version endpoint (#1)
8b04d77 chore: initial import of devops-demo-app
```

Delete the merged branch on GitHub (button on the PR) and locally:

```bash
git branch -d feat/add-version-endpoint
```

### Step 7: Manufacture and resolve a merge conflict

Create two branches that edit the same line. First branch — change the default greeting in `app.js` (the `return 'Hello, world!';` line inside `greet`):

```bash
git switch -c feat/greeting-hi main
```

Edit the line to:

```javascript
    return 'Hi, world!';
```

```bash
git commit -am "feat: change default greeting to Hi"
git switch -c feat/greeting-hey main
```

Now on the second branch, edit the same line to:

```javascript
    return 'Hey, world!';
```

```bash
git commit -am "feat: change default greeting to Hey"
```

Merge the first branch into the second to trigger the conflict:

```bash
git merge feat/greeting-hi
```

Expected output:

```text
Auto-merging app.js
CONFLICT (content): Merge conflict in app.js
Automatic merge failed; fix conflicts and then commit the result.
```

Open `app.js`; you will find:

```text
<<<<<<< HEAD
    return 'Hey, world!';
=======
    return 'Hi, world!';
>>>>>>> feat/greeting-hi
```

Resolve by editing the block to the final intended state — keep `'Hey, world!'` — and delete all three marker lines. **Important:** the tests assert the greeting is `Hello, world!`, so also update the two affected assertions in `app.test.js` (`'Hello, world!'` becomes `'Hey, world!'` in the default-greeting test — and note the by-name tests still pass since they do not use the default). Run `npm test` to prove the resolution is correct, then:

```bash
git add app.js app.test.js
git commit -m "merge: resolve greeting conflict in favor of Hey"
```

You have now resolved a real conflict. Since this greeting change was only an exercise, do not merge these branches to main — clean up:

```bash
git switch main
git branch -D feat/greeting-hi feat/greeting-hey
```

### Step 8: Tag v1.0.0

Your main branch now contains the initial app plus the `/version` endpoint — a releasable state. Create an annotated tag and push it:

```bash
git switch main
git pull
git tag -a v1.0.0 -m "First course release: base app plus /version endpoint"
git push origin v1.0.0
```

Expected output:

```text
To github.com:<your-username>/devops-demo-app.git
 * [new tag]         v1.0.0 -> v1.0.0
```

Optionally, on GitHub create a **Release** from the tag (Releases → Draft a new release → choose `v1.0.0`) with a one-paragraph release note.

## Deliverables

Submit the following three links (in a `lab02.md` or via your course submission form):

1. The URL of your `devops-demo-app` repository (with `.gitignore` present and branch protection enabled on `main` — a screenshot of the protection rule is a plus).
2. The URL of your merged `/version` pull request, showing at least one review comment and a squash merge.
3. The URL of the `v1.0.0` tag or release (`https://github.com/<you>/devops-demo-app/releases/tag/v1.0.0`).

## Troubleshooting

**`git push` fails with "Permission denied (publickey)" or repeated password prompts.**
Your GitHub authentication is not set up. Either add an SSH key (https://docs.github.com/en/authentication/connecting-to-github-with-ssh) or run `gh auth login` and let the CLI configure credentials; note that GitHub no longer accepts account passwords for HTTPS pushes — you need a token or SSH.

**The push to main was NOT rejected in step 4.**
Your protection rule is not matching. Check that the rule's branch pattern is exactly `main`, the rule is saved and enabled, and (if using rulesets) the ruleset's enforcement status is "Active", not "Evaluate". Repository admins can also bypass rules — check the "Do not allow bypassing" / bypass list setting.

**`npm test` fails after adding the /version code with "Cannot find module './package.json'".**
You are running tests from outside the repository directory, or `package.json` was not copied in step 2. Run `ls package.json` in the repo root; re-copy it if missing, and always run `npm test` from the repository root.

**GitHub will not let me approve my own pull request.**
Expected — authors cannot approve their own PRs. Either pair with a classmate to review each other's PRs, or set required approvals to 0 in the protection rule; the "require a pull request" part still enforces the workflow.

**During the conflict exercise, `git merge` reported "Already up to date" instead of a conflict.**
Both branches must be created from `main` and must each edit the same line. If you created `feat/greeting-hey` from `feat/greeting-hi` (rather than from `main`), the second branch already contains the first branch's commit and there is nothing to merge. Delete the branches and redo step 7, making sure each `git switch -c <branch> main` ends with `main`.

**`git switch` is not recognized.**
Your Git predates 2.23. Either upgrade Git, or substitute `git checkout -b <branch>` for `git switch -c <branch>` and `git checkout <branch>` for `git switch <branch>`.
