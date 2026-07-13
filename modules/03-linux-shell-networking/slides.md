---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 03: Linux, Shell & Networking Essentials"
---

<!-- _class: lead -->

# Linux, Shell & Networking Essentials

## Module 03

The operating-system literacy your code depends on — because production is Linux, even when your laptop is not.

---

<!-- _class: section-divider -->

# Part 1: Why Developers Need Ops Literacy

---

## Your code runs on Linux

- You may develop on macOS or Windows — but your service almost certainly **runs** on Linux
- Over 90% of public cloud workloads run Linux; every major container platform assumes it
- **Containers ARE Linux**: a Docker container (module 6) is just Linux processes with namespaces and cgroups — there is no container without these OS concepts
- Kubernetes (module 7) schedules Linux processes onto Linux nodes

<!-- Set the stakes: everything in modules 6-12 stands on today's material. A container is not a VM — it is a normal Linux process wearing isolation glasses, so debugging one means ps, signals, ports, and permissions. Anecdote: the most common "Docker bug" students hit in module 6 is actually the localhost vs 0.0.0.0 distinction taught today. -->

---

## The filesystem: one tree, standard rooms

| Path | What lives there |
| --- | --- |
| `/etc` | System and service configuration |
| `/var/log` | Log files (`/var/log/syslog`, app logs) |
| `/usr` | Installed programs and libraries |
| `/tmp` | Scratch space, wiped on reboot |
| `/proc` | Virtual: the kernel's live view of processes (`/proc/<PID>/`) |
| `/home` | User home directories |

Everything is a file — even processes and devices have file representations.

<!-- The Filesystem Hierarchy Standard means you can land on any unfamiliar Linux box and know where to look: config in /etc, logs in /var/log. /proc is worth a live demo: cat /proc/self/status shows the shell's own process info. "Everything is a file" pays off later — container limits in module 6 are literally files in /sys/fs/cgroup. -->

---

<!-- _class: section-divider -->

# Part 2: Processes, Signals, Users

---

## Processes: PIDs and parents

- Every running program is a **process** with a numeric **PID**
- Each process has a **parent** (PPID); the tree roots at PID 1 (`init`/`systemd` — or *your app*, inside a container)
- Inspect:

```bash
ps aux                 # all processes, with owner, CPU, memory
ps -ef | grep node     # find your node processes
top                    # live view; htop is the friendlier variant
```

<!-- Foreshadow: inside a container your app often IS PID 1, which changes signal behavior and is why module 6 discusses init handling. Live demo idea: pstree in one terminal while starting node server.js in another, showing the shell as the parent. -->

---

## Signals: how Linux talks to processes

| Signal | Number | Meaning | Catchable? |
| --- | --- | --- | --- |
| SIGTERM | 15 | "Please shut down" | Yes — clean up first |
| SIGKILL | 9 | Die immediately | **No** — kernel removes you |
| SIGINT | 2 | Ctrl+C in terminal | Yes |
| SIGHUP | 1 | Terminal closed / reload config | Yes |

```bash
kill <PID>        # sends SIGTERM (default)
kill -9 <PID>     # SIGKILL — last resort
```

<!-- The SIGTERM/SIGKILL distinction is the most operationally important row: SIGTERM is a request the process can catch to finish requests and close connections; SIGKILL is unceremonious and can drop in-flight work or corrupt state. Kubernetes sends SIGTERM, waits a grace period (default 30s), then SIGKILLs — which is exactly why the sample app has a SIGTERM handler. -->

---

## Graceful shutdown — our app does it

From `server.js` in the sample app:

```javascript
// Kubernetes sends SIGTERM before killing a pod; exit cleanly (module 7).
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
```

- On SIGTERM: stop accepting new connections, finish in-flight requests, exit 0
- Without this: dropped requests and 502s on every deploy
- You will trigger this handler yourself in today's lab

<!-- Connect code to concept: server.close() stops the listener but lets active requests complete — the difference between a zero-downtime deploy and a spike of user-facing errors at every rollout. In the lab students kill the server both ways and watch the log line appear (SIGTERM) or not (SIGKILL). -->

---

## Users and permissions: rwx

```text
-rwxr-x---  1 alice devs  212 Jul 13 10:00 healthcheck.sh
   |  |  |
 owner group other
```

- Three triads — **r**ead (4), **w**rite (2), e**x**ecute (1) — for owner / group / other
- `chmod +x file` (or `chmod 750 file`), `chown alice:devs file`
- `sudo` = run one command as root; root (UID 0) bypasses all permission checks

<!-- Teach reading the string left to right: type bit, then three triads. Octal is worth 2 minutes since chmod 644 / 755 appear constantly in scripts and docs. Directories twist the meanings: x on a directory means "may enter/traverse". -->

---

## Why not run as root

- A process has the permissions of its user — a compromised root process owns the machine
- **Principle of least privilege**: an app that serves HTTP needs no right to edit `/etc` or read other users' data
- Ports below 1024 need root (or a capability) to bind — one reason apps use 3000/8080 behind a proxy
- Containers inherit this: default Docker containers run as root **inside**, and hardening them (module 6, module 12) starts with a non-root user

<!-- Key story: several real-world container escapes and web app breaches were survivable only because the compromised process was non-root, so the attacker was boxed in. Foreshadow module 12, where DevSecOps scanners flag containers that run as root automatically. The 1024 rule explains a pattern students have seen without knowing why: apps on 3000/8080 with nginx or a load balancer on 80/443 in front. -->

---

<!-- _class: section-divider -->

# Part 3: The Shell — Commands, Pipes, Scripts

---

## The core toolkit

```bash
cd /var/log            # change directory
ls -la                 # list, long format, incl. hidden
cat app.log            # print whole file
less app.log           # page through (q to quit, / to search)
tail -f app.log        # follow a growing log — live
grep ERROR app.log     # filter lines
grep -r "TODO" src/    # recursive search
find . -name "*.log"   # find files by name
```

- `tail -f` + `grep` is the classic incident-response combo

<!-- These eight commands cover 80% of daily server work. Emphasize less over cat for big files (a 2 GB log will scroll for minutes), and tail -f as the "watch it happen live" tool students use in today's log exercise. -->

---

## Pipes and redirection

```bash
command > file      # stdout to file (overwrite)
command >> file     # stdout to file (append)
command 2> err.log  # stderr to file
command 2>&1        # merge stderr into stdout
cmd1 | cmd2         # pipe: stdout of cmd1 -> stdin of cmd2
```

```bash
grep " 404" app.log | wc -l          # count 404s
find . -name "*.log" | xargs grep -l ERROR   # which logs contain errors
```

- Small tools, composed — the Unix philosophy

<!-- The pipeline idea IS the DevOps idea in miniature: small single-purpose stages composed into a flow. Note the stdout/stderr split matters in module 4: CI systems capture both, and a script that hides errors in stdout is a script that fails silently. -->

---

## Environment variables and PATH

```bash
export PORT=4000        # set for this shell and children
node server.js          # reads process.env.PORT -> listens on 4000
PORT=5000 node server.js  # set for ONE command only
echo $PATH              # colon-separated dirs searched for commands
which node              # which binary will actually run
```

- Env vars are **the** configuration mechanism for containers and CI (modules 6, 9: twelve-factor config)
- Child processes inherit the parent's environment

<!-- The one-command prefix form (PORT=5000 node server.js) is used in today's lab. Plant the twelve-factor seed: the same image runs in dev and prod differing only by environment — which is why the sample app reads PORT from the environment rather than a config file. -->

---

## Shell scripting: the safe skeleton

```bash
#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://localhost:3000/health}"

if curl -fsS "$URL" > /dev/null; then
  echo "OK: $URL is healthy"
else
  echo "FAIL: $URL is not responding" >&2
  exit 1
fi
```

- `set -e` exit on error; `-u` error on unset vars; `-o pipefail` fail if any pipe stage fails
- Always quote variables: `"$URL"`

<!-- Walk each line: shebang picks the interpreter; the set line is the standard "unofficial strict mode" that turns silent failures into loud ones. This exact pattern becomes the lab's healthcheck.sh, which in turn becomes a container HEALTHCHECK in module 6 — one script, three modules of mileage. -->

---

## Exit codes: how automation knows

- Every command exits with a code: **0 = success, non-zero = failure**
- Check the last command's code: `echo $?`
- Chaining: `a && b` (b only if a succeeded), `a || b` (b only if a failed)
- CI pipelines (module 4) are exit-code machines: any non-zero step fails the build
- `curl -f` makes HTTP errors (4xx/5xx) produce a non-zero exit code

<!-- This tiny convention is the contract underlying ALL automation: GitHub Actions, Docker HEALTHCHECK, Kubernetes probes — every one of them just asks "was the exit code zero?". The curl -f flag is the bridge between HTTP status and exit status, and it is why the lab script can gate on /health. -->

---

<!-- _class: section-divider -->

# Part 4: Networking Essentials

---

## IP addresses and ports

- An **IP address** identifies a host; a **port** (1-65535) identifies a service on it
- `127.0.0.1` (localhost) = this machine, via the loopback interface
- Ports below 1024 are privileged; apps commonly use 3000, 8080, 5432...
- One port, one listener: two processes cannot bind the same port/interface pair — hence `EADDRINUSE`

<!-- Analogy that sticks: IP is the street address, port is the apartment number. EADDRINUSE from lab 01's troubleshooting now gets its proper explanation, and the fix (lsof -i, kill, or change PORT) is practiced today. -->

---

## TCP vs UDP — a working level

| | TCP | UDP |
| --- | --- | --- |
| Connection | Handshake, stateful | None — fire and forget |
| Delivery | Guaranteed, ordered | Best effort |
| Cost | Higher latency/overhead | Minimal |
| Used by | HTTP(S), SSH, databases | DNS queries, metrics (statsd), video |

- Everything in this course rides TCP — except DNS lookups, which are usually UDP

<!-- Working level means: know which one a protocol uses and what that implies for debugging. TCP problems look like timeouts and resets; UDP problems look like silent loss. Fun fact for the room: DNS falls back to TCP for large responses — a classic source of "it works except sometimes" bugs. -->

---

## DNS: names to addresses

```bash
dig example.com                 # full answer, with TTL
dig +short example.com          # just the A record(s)
nslookup example.com            # the older, ubiquitous alternative
```

- Resolution order: local cache → configured resolver (`/etc/resolv.conf`) → recursive lookup to authoritative servers
- **TTL** controls caching — and why DNS changes "take time to propagate"
- "It's always DNS" is a meme because half of mysterious outages involve name resolution

<!-- Have students read a real dig answer: name, TTL, record type, address. The TTL explains deploy-day pain: a 3600s TTL means up to an hour of clients hitting the old IP. Kubernetes services (module 7) get internal DNS names, so this is not just internet trivia. -->

---

## HTTP anatomy with curl -v

```bash
curl -v "http://localhost:3000/health"
```

```text
> GET /health HTTP/1.1
> Host: localhost:3000
> User-Agent: curl/8.6.0
< HTTP/1.1 200 OK
< Content-Type: application/json
{"status":"ok","uptimeSeconds":42}
```

- `>` lines = request (method, path, headers); `<` lines = response (status, headers), then body
- Methods: GET, POST, PUT, PATCH, DELETE, HEAD

<!-- curl -v is the single best HTTP teaching tool: the whole protocol is right there in plain text. Point at the Host header (how one IP serves many sites) and Content-Type (how the client knows JSON from HTML). Students run this against all three app endpoints in the lab. -->

---

## Status code classes

| Class | Meaning | Examples |
| --- | --- | --- |
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirection | 301 Moved Permanently, 302 Found, 304 Not Modified |
| 4xx | Client error — **your request** | 400, 401, 403, 404, 429 |
| 5xx | Server error — **their code** | 500, 502 Bad Gateway, 503 Unavailable |

- First digit first: it tells you *whose problem it is*
- Monitoring (module 11) alerts on 5xx rates; 4xx spikes often mean a bad client deploy

<!-- The debugging heuristic to drill: 4xx means look at the request, 5xx means look at the server. 502/503 deserve a special mention — they usually come from the proxy or load balancer in front of a dead backend, which is what a failed graceful shutdown produces. -->

---

## localhost vs 0.0.0.0 — critical for containers

- Binding to `127.0.0.1`: reachable **only from the same machine**
- Binding to `0.0.0.0`: listen on **all interfaces** — reachable from outside
- Node's `server.listen(PORT)` with no host binds all interfaces — fine for containers
- The classic module-6 bug: an app bound to 127.0.0.1 **inside** a container is unreachable from the host, because the host is "outside"

<!-- This slide prevents the single most common Docker beginner failure. Inside a container, 127.0.0.1 means "this container", not "my laptop". Our sample app is safe because listen(PORT) defaults to all interfaces — but students WILL meet frameworks (Flask, some dev servers) that default to 127.0.0.1 and mysteriously "not work in Docker". -->

---

## Who is listening? And SSH

```bash
lsof -i :3000        # what process owns port 3000 (macOS & Linux)
ss -tlnp             # all TCP listeners (Linux; netstat -tlnp is legacy)
```

- **SSH**: encrypted remote shell — `ssh user@host`
- **Key auth** over passwords: `ssh-keygen -t ed25519` → public key to server's `~/.ssh/authorized_keys` (or GitHub settings)
- Same key mechanism you used for GitHub in lab 02

<!-- lsof -i :PORT is the daily driver for "port already in use" and "is my app actually up". On SSH: passwords are brute-forceable and phishable; keys are neither, which is why cloud providers and GitHub default to them. Students already did ssh-keygen for lab 02 — connect the dots. -->

---

<!-- _class: section-divider -->

# Part 5: Wrap-Up

---

## Summary

- Production is Linux; containers **are** Linux processes — this module is the foundation for modules 6-7
- Filesystem: config in `/etc`, logs in `/var/log`, live kernel state in `/proc`
- Processes have PIDs and parents; SIGTERM asks, SIGKILL forces — graceful shutdown protects in-flight requests
- Least privilege: read `rwx`, use `chmod/chown`, never run services as root
- Shell: pipes compose small tools; `set -euo pipefail`; exit codes are automation's contract
- Networking: ports, TCP vs UDP, DNS + TTL, HTTP status classes, `curl -v`, and the localhost vs 0.0.0.0 trap

<!-- Close with the connective tissue: exit codes feed CI (module 4), the healthcheck script becomes a Docker HEALTHCHECK (module 6), SIGTERM handling becomes pod termination (module 7), /metrics becomes Prometheus food (module 11). Nothing today was trivia. -->

---

## Next up

- **Lab 03**: in your `devops-demo-app` repo — hunt PIDs and send signals, run on alternate ports, dissect HTTP with `curl -v`, wrangle logs with grep/tail/wc, and ship a `scripts/healthcheck.sh` through a pull request
- **Module 04: CI with GitHub Actions** — your repository grows a pipeline: every push builds and tests automatically, and the required status check on `main` finally gets filled

<!-- Remind students the lab deliberately reuses the module 2 PR workflow — the habits compound. Tease module 4 as the payoff moment: the branch protection slot they configured in lab 02 gets its first real automated check. -->
