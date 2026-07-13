# Lab 03: Processes, Ports, Logs, and a Health Check Script

## What you will do

Working inside the `devops-demo-app` repository you created in lab 02, you will: hunt down the server's PID and observe the difference between SIGTERM and SIGKILL firsthand; run the app on an alternate port via the `PORT` environment variable; dissect HTTP exchanges with `curl -v` and inspect real DNS records with `dig`; generate traffic and analyze the resulting log file with `grep`, `tail`, and `wc`; write and test a defensive shell script, `scripts/healthcheck.sh`; and ship that script to `main` through a pull request, practicing the module 2 workflow.

Estimated time: 75-110 minutes.

## Prerequisites

- [ ] Lab 02 completed: your own `devops-demo-app` repository exists on GitHub with branch protection on `main` and the `/version` endpoint merged
- [ ] A local clone of that repository, up to date (`git switch main && git pull`)
- [ ] Node.js 18+ and curl working (verified in lab 01)
- [ ] `lsof` available (preinstalled on macOS and most Linux; on Debian/Ubuntu: `sudo apt install lsof`)
- [ ] `dig` available (macOS: preinstalled; Debian/Ubuntu: `sudo apt install dnsutils`)
- [ ] A place to record outputs as you go: create `~/lab03-answers.md` in your home directory (deliberately outside the repo, so it is submitted separately and never committed)

## Steps

All commands run from the root of your `devops-demo-app` clone. Create your answers file first: `touch ~/lab03-answers.md` (kept in your home directory so it does not pollute the repo).

### Step 1: Processes and signals

Start the server in terminal 1:

```bash
node server.js
```

Expected output:

```text
devops-demo-app listening on port 3000
```

In terminal 2, find the process two different ways and record both outputs:

```bash
lsof -i :3000
```

Expected output (PID will differ):

```text
COMMAND   PID    USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
node    41217 tishaq   18u  IPv6  0x1f2e      0t0  TCP *:hbci (LISTEN)
```

```bash
ps -ef | grep "[n]ode server.js"
```

Expected output (the `[n]` trick keeps grep from matching itself):

```text
  501 41217   947   0  7:15PM ttys002    0:00.09 node server.js
```

Send a **SIGTERM** (the polite signal — the default for `kill`):

```bash
kill 41217    # use YOUR pid
```

Look at terminal 1. The app's SIGTERM handler runs and you see the graceful-shutdown log line before the process exits:

```text
SIGTERM received, shutting down
```

Now contrast with **SIGKILL**. Restart the server in terminal 1 (`node server.js`), find the new PID, and kill it ungracefully:

```bash
kill -9 <new-pid>
```

Terminal 1 shows the process simply gone — no "SIGTERM received" line, because SIGKILL cannot be caught; the kernel removed the process before any handler could run. Record in your answers file: both terminal-1 outcomes, and one sentence on why the difference matters during a production deploy.

### Step 2: Run on a different port

The app reads the `PORT` environment variable (look at line 6 of `server.js`). Run it on 4000 for a single invocation:

```bash
PORT=4000 node server.js
```

Expected output:

```text
devops-demo-app listening on port 4000
```

From terminal 2, confirm both facts — it answers on 4000 and nothing answers on 3000:

```bash
curl -s http://localhost:4000/health
curl -s http://localhost:3000/health || echo "nothing on 3000, as expected"
```

Expected output:

```text
{"status":"ok","uptimeSeconds":7}
nothing on 3000, as expected
```

Stop the server (Ctrl+C). Record the outputs. This one-variable portability is the twelve-factor configuration idea you will lean on in modules 6 and 9.

### Step 3: HTTP anatomy and DNS

Start the server again on the default port. Run a verbose curl against `/health` and read the full exchange:

```bash
curl -v http://localhost:3000/health
```

Expected output (abbreviated):

```text
> GET /health HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/8.6.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Content-Type: application/json
<
{"status":"ok","uptimeSeconds":12}
```

In your answers file, identify from your own output: the HTTP method, the path, two request headers, the status code and its class (2xx), and the response `Content-Type`. Then check a missing route and note the different status class:

```bash
curl -v http://localhost:3000/nope 2>&1 | grep "< HTTP"
```

Expected output:

```text
< HTTP/1.1 404 Not Found
```

Record: is 404 a client-error class or server-error class, and whose problem does that suggest?

Now DNS. Query a real domain and read the answer section:

```bash
dig example.com
```

Expected output (abbreviated; addresses and TTL will vary):

```text
;; ANSWER SECTION:
example.com.        3600    IN      A       93.184.215.14
```

Record: the A record's IP address and its TTL, plus one sentence on what the TTL means for how quickly a DNS change would reach clients. Try `dig +short example.com` too and note the compact form.

### Step 4: Log wrangling

With the server running in terminal 1, restart it so its stdout goes to a file instead of the terminal:

```bash
node server.js > app.log 2>&1 &
```

The trailing `&` backgrounds it; `2>&1` folds stderr into the same file. Now generate traffic — 20 good requests and 5 bad ones — from the same terminal:

```bash
for i in $(seq 1 20); do curl -s "http://localhost:3000/?name=Student$i" > /dev/null; done
for i in $(seq 1 5); do curl -s "http://localhost:3000/missing-$i" > /dev/null; done
```

Watch the last lines arrive live, then answer questions with the classic tools:

```bash
tail -5 app.log
```

Expected output (timestamps will differ):

```text
2026-07-13T19:40:11.102Z GET /missing-1 404
2026-07-13T19:40:11.145Z GET /missing-2 404
2026-07-13T19:40:11.190Z GET /missing-3 404
2026-07-13T19:40:11.233Z GET /missing-4 404
2026-07-13T19:40:11.279Z GET /missing-5 404
```

Count total requests logged, and count only the 404s:

```bash
grep -c "GET" app.log
grep " 404" app.log | wc -l
```

Expected output:

```text
25
5
```

Record both numbers and the exact commands in your answers file. Then clean up: bring the server to the foreground and stop it, and delete the log (it must not be committed):

```bash
kill %1
rm app.log
```

Optional but good practice: add `*.log` to your `.gitignore` on the branch you create in step 5.

### Step 5: Write scripts/healthcheck.sh

Create a feature branch (module 2 habits — short-lived, well named):

```bash
git switch main && git pull
git switch -c feat/healthcheck-script
mkdir -p scripts
```

Create `scripts/healthcheck.sh` with exactly this content:

```bash
#!/usr/bin/env bash
# Health check for devops-demo-app.
# Usage: healthcheck.sh [url]   (default: http://localhost:3000/health)
set -euo pipefail

URL="${1:-http://localhost:3000/health}"

if curl -fsS --max-time 5 "$URL" > /dev/null; then
  echo "OK: ${URL} is healthy"
else
  echo "FAIL: ${URL} is not responding or returned an error status" >&2
  exit 1
fi
```

Make it executable and confirm the permission bits changed:

```bash
chmod +x scripts/healthcheck.sh
ls -l scripts/healthcheck.sh
```

Expected output (note the `x` bits):

```text
-rwxr-xr-x  1 tishaq  staff  312 Jul 13 19:55 scripts/healthcheck.sh
```

Test it both ways — this is the important part. With the server **up** (start `node server.js` in terminal 1):

```bash
./scripts/healthcheck.sh
echo $?
```

Expected output:

```text
OK: http://localhost:3000/health is healthy
0
```

Now stop the server (Ctrl+C in terminal 1) and run it again with the server **down**:

```bash
./scripts/healthcheck.sh
echo $?
```

Expected output:

```text
FAIL: http://localhost:3000/health is not responding or returned an error status
1
```

Record both exit codes. That 0-versus-1 contract is exactly what CI steps (module 4), Docker `HEALTHCHECK` (module 6), and Kubernetes probes (module 7) consume. Note the script's flags: `-f` turns HTTP 4xx/5xx into a non-zero curl exit; `-sS` silences the progress bar but keeps errors; `--max-time 5` prevents hanging forever.

### Step 6: Ship it through a pull request

```bash
git add scripts/healthcheck.sh
git commit -m "feat: add healthcheck script for /health endpoint"
git push -u origin feat/healthcheck-script
gh pr create --title "feat: add healthcheck script" \
  --body "Adds scripts/healthcheck.sh: curls /health with -fsS and a 5s timeout, exits 0 when healthy and 1 otherwise. Groundwork for CI (module 4) and container healthchecks (module 6). Tested with server up (exit 0) and down (exit 1)."
```

Review the diff on GitHub (check the file mode shows `100755` — the executable bit travels with the commit), then **squash and merge**, delete the branch, and sync:

```bash
git switch main && git pull
git log --oneline -2
```

Expected output (hashes differ):

```text
9c7d3e2 feat: add healthcheck script (#2)
3f2a1c9 feat: add /version endpoint (#1)
```

## Deliverables

1. Your merged pull request adding `scripts/healthcheck.sh` (submit the PR URL); the file on `main` must be executable (mode `100755` visible in the PR's file view).
2. Your `lab03-answers.md` containing: the two PID-finding outputs and the SIGTERM vs SIGKILL observations (step 1); the port-4000 outputs (step 2); the annotated `curl -v` findings, the 404 classification, and the dig record with TTL (step 3); the log-analysis commands with both counts (step 4); and the two recorded exit codes (step 5).

## Troubleshooting

**`lsof -i :3000` prints nothing even though the server is running.**
Either the server is on a different port (did you leave `PORT=4000` exported? check `echo $PORT`), or it crashed — look at terminal 1. On some Linux systems plain `lsof` needs the process owner or root: try `ss -tlnp | grep 3000` instead.

**`kill <PID>` says "No such process".**
The PID changed (every restart gets a new one) or you copied the grep process's PID from an unbracketed `ps | grep` — re-run `lsof -i :3000` and use the PID from the `node` line only.

**The healthcheck script prints OK even when the server returns 404 or 500.**
You almost certainly omitted `-f` from curl. Without it, curl exits 0 on any completed HTTP exchange regardless of status. Check your script against the listing in step 5 character by character, or run `bash -x scripts/healthcheck.sh` to trace it.

**`./scripts/healthcheck.sh` says "Permission denied".**
The execute bit is missing. Run `chmod +x scripts/healthcheck.sh` and verify with `ls -l` that you see `-rwxr-xr-x`. If it happens after cloning on another machine, the bit was never committed — re-add and commit the file after chmod.

**`kill %1` says "no such job".**
Job numbers are per-terminal: `%1` only exists in the terminal where you backgrounded the server with `&`. Run it there, or fall back to PID-based kill via `lsof -i :3000`.

**`dig: command not found`.**
Install it: `sudo apt install dnsutils` (Debian/Ubuntu) or `sudo dnf install bind-utils` (Fedora). On macOS dig ships with the OS. In a pinch, `nslookup example.com` answers the same question with less detail.
