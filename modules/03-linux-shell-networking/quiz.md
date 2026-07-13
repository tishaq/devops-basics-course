# Quiz 03: Linux, Shell & Networking Essentials

Answer all 10 questions without consulting the handout. Multiple-choice questions have exactly one correct answer. Short-answer questions need 1-3 sentences.

**Q1.** What is the key operational difference between SIGTERM and SIGKILL?
A. SIGTERM is faster; SIGKILL waits for the process to finish its work
B. SIGTERM can be caught so the process can clean up; SIGKILL cannot be caught and removes the process immediately
C. SIGKILL only works on child processes; SIGTERM works on any process
D. There is no difference; they are two names for signal 15

**Q2.** Kubernetes terminates a pod by sending SIGTERM, waiting a grace period, then sending SIGKILL. In one or two sentences, explain what a well-behaved HTTP service should do when it receives the SIGTERM, and what users experience if it does not.
(Short answer.)

**Q3.** The permission string `-rwxr-x---` on a file means:
A. Everyone can read and execute; only the owner can write
B. Owner: read/write/execute; group: read/execute; others: no access
C. Owner: read/write/execute; group: no access; others: read/execute
D. The file is a directory readable by its group

**Q4.** Why should a network service run as an unprivileged user rather than root? Mention the principle involved.
(Short answer.)

**Q5.** A server logs each request as a line containing the status code (for example `GET /missing 404`). Which pipeline counts how many 404 responses are in `app.log`?
A. `cat app.log > grep 404 > wc`
B. `grep " 404" app.log | wc -l`
C. `wc -l app.log | grep 404`
D. `tail -f app.log | count 404`

**Q6.** In a shell script, what does the line `set -euo pipefail` do?
(Short answer — cover all three flags.)

**Q7.** A curl request returns `HTTP/1.1 503 Service Unavailable`. Which statement is the best first interpretation?
A. The client sent a malformed request and should fix its headers
B. The requested resource has moved permanently to a new URL
C. A server-side problem — often a proxy or load balancer with no healthy backend
D. Authentication failed and credentials must be supplied

**Q8.** An app inside a container binds to `127.0.0.1:3000`. Requests from the host to the container's published port fail, but `curl localhost:3000` run inside the container succeeds. Why, and what is the fix?
(Short answer.)

**Q9.** Which command shows which process is listening on port 3000?
A. `ps aux | grep 3000`
B. `lsof -i :3000`
C. `dig :3000`
D. `chmod 3000`

**Q10.** A CI step runs `./scripts/healthcheck.sh` and the pipeline marks the step failed. What must the script have done, and why does `curl -f` matter inside such a script?
A. Printed the word "error" to stdout; `-f` formats output for CI
B. Exited with a non-zero code; `-f` makes curl return non-zero on HTTP 4xx/5xx instead of exiting 0
C. Taken longer than 60 seconds; `-f` enables fast mode
D. Written to stderr; `-f` redirects stderr to stdout

---

## Answer Key

**Q1.** B. SIGTERM (15) is a catchable request to shut down, allowing cleanup such as finishing in-flight requests; SIGKILL (9) is uncatchable — the kernel removes the process before any handler can run.

**Q2.** On SIGTERM the service should stop accepting new connections, finish in-flight requests, release resources, and exit 0 (as the sample app does with `server.close()`). If it ignores the signal, the grace period expires, SIGKILL drops in-flight requests, and users see errors such as 502s during every deploy.

**Q3.** B. Reading the three triads after the file-type dash: owner `rwx`, group `r-x`, others `---` — octal 750.

**Q4.** A process carries its user's permissions, so a compromised root process controls the entire machine while a compromised unprivileged process is confined to what that user can access. This is the principle of least privilege — grant only the access the service actually needs.

**Q5.** B. `grep " 404" app.log` selects the matching lines and `wc -l` counts them; the other options misuse redirection or invoke commands that do not exist.

**Q6.** `-e` aborts the script when any command fails; `-u` treats expansion of an undefined variable as an error (catching typos); `-o pipefail` makes a pipeline's exit status reflect the first failing stage rather than only the last command. Together they turn silent failures into immediate, visible ones.

**Q7.** C. 503 is in the 5xx server-error class, and in practice it usually comes from a proxy or load balancer that has no healthy backend to route to; 4xx would indicate a client-side problem.

**Q8.** Binding `127.0.0.1` restricts the listener to the loopback interface, and inside a container loopback means "this container" — traffic arriving from the host comes through a different interface and is refused. Fix: bind `0.0.0.0` (all interfaces), which Node's `server.listen(PORT)` without a host argument does by default.

**Q9.** B. `lsof -i :3000` lists the process holding the port (on Linux, `ss -tlnp` is the equivalent); `ps | grep 3000` matches PIDs and arguments containing "3000", not ports.

**Q10.** B. Automation reads exit codes: 0 means pass, non-zero means fail, so the script must have exited non-zero. Without `-f`, curl exits 0 on any completed HTTP exchange even if the status is 500, which would make the health check pass when the service is broken.
