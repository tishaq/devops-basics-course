# Lab 01: Toolchain Check, First Run, and Value-Stream Mapping

## What you will do

This lab has no heavy tooling — that starts in module 2. Today you will (1) verify the prerequisites you need for the whole course, (2) run the course sample application, `devops-demo-app`, locally and exercise its endpoints, (3) perform a value-stream mapping exercise on a fictional team with a painful release process, and (4) assess that team against the four DORA metrics. You will submit your findings as a single markdown file, `lab01.md`.

Estimated time: 60-90 minutes.

## Prerequisites

- [ ] A terminal (macOS Terminal, Linux shell, or WSL2 on Windows)
- [ ] Git installed
- [ ] Node.js version 18 or newer installed (the sample app uses the built-in `node:test` runner, which requires 18+)
- [ ] curl installed (preinstalled on macOS and most Linux distributions)
- [ ] A text editor
- [ ] You have read the module 01 handout (the value-stream exercise assumes you know the DORA metric definitions)

## Steps

### Step 1: Verify your toolchain

Run each command and record the output in your `lab01.md`.

```bash
git --version
```

Expected output (any version 2.x is fine):

```text
git version 2.44.0
```

```bash
node --version
```

Expected output — the major version must be 18 or higher:

```text
v20.11.1
```

If your Node.js is older than 18, install a current LTS release from https://nodejs.org/ or via your version manager (`nvm install --lts`) before continuing.

```bash
curl --version | head -n 1
```

Expected output (version will vary):

```text
curl 8.6.0 (x86_64-apple-darwin23.0) libcurl/8.6.0 ...
```

### Step 2: Clone the course repository and run the tests

```bash
git clone <course-repo-url> devops-basics-course
cd devops-basics-course/sample-app
npm test
```

Expected output (abbreviated) — all 6 tests pass:

```text
✔ greet returns default greeting without a name
✔ greet greets by name
✔ greet trims whitespace
✔ root route returns a greeting
✔ health route reports ok
✔ unknown routes return 404
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

Note that `npm test` needed no `npm install` first: the app has zero dependencies and the test runner is built into Node.js. This is deliberate — the course spends its time on delivery machinery, not application code.

### Step 3: Run the app and exercise all three endpoints

Start the server in one terminal:

```bash
node server.js
```

Expected output:

```text
devops-demo-app listening on port 3000
```

In a **second** terminal, call each endpoint and record the exact responses in `lab01.md`:

```bash
curl "http://localhost:3000/"
```

Expected output:

```text
{"message":"Hello, world!"}
```

```bash
curl "http://localhost:3000/?name=Ada"
```

Expected output:

```text
{"message":"Hello, Ada!"}
```

```bash
curl "http://localhost:3000/health"
```

Expected output (uptime will vary):

```text
{"status":"ok","uptimeSeconds":42}
```

```bash
curl "http://localhost:3000/metrics"
```

Expected output (numbers will vary):

```text
demo_app_requests_total 4
demo_app_uptime_seconds 55
```

Look back at the first terminal: the server logs one line per request, for example:

```text
2026-07-13T19:04:12.345Z GET /health 200
```

Stop the server with `Ctrl+C`. You will meet this app again in every module: it gains a CI pipeline in module 4, a Dockerfile in module 6, and its `/metrics` endpoint is scraped by Prometheus in module 11.

### Step 4: Value-stream mapping exercise

Read this fictional scenario carefully, then map it.

> **Scenario: Team Kestrel.** Team Kestrel builds an internal invoicing service. Their process for a typical change is:
>
> 1. A developer writes the code: about **4 hours** of work. The change then waits an average of **2 days** for a teammate to review it.
> 2. Code review itself takes **30 minutes**, and typically one round of rework: **1 hour** of coding, then another **1 day** wait for re-review (**15 minutes**).
> 3. Merged changes wait for the next **release train, which departs every 2 weeks** (average wait: **7 days**).
> 4. Before the train departs, QA manually regression-tests the release candidate: **2 days** of testing, during which the release is frozen.
> 5. The release ticket then waits in the ops queue for an average of **1 day** before an ops engineer picks it up.
> 6. The ops engineer follows a 40-step manual runbook to deploy: **3 hours**, performed after 6 p.m. because deploys are considered risky.
>
> Team Kestrel deploys **once every 2 weeks**. In the last year (26 deployments), 8 deployments caused a production incident requiring a hotfix or rollback. When an incident occurs, diagnosing and restoring service takes on average **6 hours**, largely because each release contains two weeks of accumulated changes.

In `lab01.md`, produce a value-stream map as a markdown table with one row per step and three columns: **Step**, **Active work time**, **Wait time before/after**. Then compute:

1. **Total active work time** (sum of the work column).
2. **Total elapsed lead time** from "developer starts coding" to "running in production" (work + waits).
3. **Process efficiency** = active work time / total elapsed time, as a percentage.
4. The **single largest contributor of wait time**, and one concrete improvement you would propose for it.

Worked check on your arithmetic: the active work time is 4h + 0.5h + 1h + 0.25h + 16h (2 QA days at 8h) + 3h = 24.75 hours. If your elapsed-time total is not far above 11 calendar days, re-read the scenario — you have missed a wait.

### Step 5: DORA assessment of Team Kestrel

In `lab01.md`, add a table scoring Team Kestrel on each DORA metric. For each metric: state the team's value (derive it from the scenario), then classify it as low, medium, high, or elite using the benchmark table from the handout.

| Metric | Team Kestrel value | Classification |
| --- | --- | --- |
| Deployment frequency | ? | ? |
| Lead time for changes | ? | ? |
| Change failure rate | ? (compute from 8 incidents in 26 deploys) | ? |
| Time to restore service | ? | ? |

Finish with a short paragraph (5-10 sentences): give the team an overall classification, identify which CALMS pillars are weakest, and name the first two changes you would make and why. There is no single right answer, but your reasoning must reference the scenario's numbers.

## Deliverables

Submit a single file, `lab01.md`, containing:

1. The recorded output of `git --version`, `node --version`, and `curl --version` (step 1).
2. The recorded responses from all four curl calls plus one server log line (step 3).
3. Your value-stream map table, the four computed figures, and your proposed improvement (step 4).
4. Your completed DORA table and assessment paragraph (step 5).

## Troubleshooting

**`node --version` says v16 or older, or `npm test` fails with "bad option: --test".**
The built-in test runner requires Node.js 18+. Install a current LTS from https://nodejs.org/ or run `nvm install --lts && nvm use --lts`, then reopen your terminal and re-verify.

**`curl http://localhost:3000/` returns "Connection refused".**
The server is not running or exited. Check the first terminal for errors, confirm you ran `node server.js` from inside `sample-app/`, and confirm the startup line "devops-demo-app listening on port 3000" appeared.

**"Error: listen EADDRINUSE: address already in use :::3000".**
Something else is listening on port 3000 (often a previous copy of the server). Find and stop it with `lsof -i :3000` and `kill <PID>`, or run the app on another port: `PORT=3001 node server.js` (then curl port 3001). Ports and this exact technique are covered properly in module 3.

**`curl "http://localhost:3000/?name=Ada"` returns "Hello, world!" instead of "Hello, Ada!".**
Your shell ate the query string because the URL was not quoted. Always quote URLs containing `?` or `&`.

**On Windows, commands behave differently or `node` is not found.**
Use WSL2 (Ubuntu) rather than PowerShell or cmd for this course; all labs assume a Unix-like shell. Install Node.js inside WSL2, not just on Windows.
