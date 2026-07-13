# Quiz 06: Containers with Docker

Answer all questions. For multiple choice, select the single best answer. For short answer, two or three sentences are enough. The answer key follows the horizontal rule — attempt every question first.

**Q1.** Which statement correctly distinguishes an image from a container?

A. An image is a running process; a container is its saved snapshot.
B. An image is an immutable, layered template; a container is a running instance of it with a thin writable layer on top.
C. They are synonyms used by different container runtimes.
D. Containers are stored in registries; images exist only at runtime.

**Q2.** How do containers differ fundamentally from virtual machines?

A. Containers emulate hardware more efficiently than hypervisors do.
B. Containers each boot a minimal guest kernel, which is faster than a full one.
C. Containers share the host's kernel and isolate processes using namespaces and cgroups, so no guest OS boots at all.
D. There is no fundamental difference; containers are just smaller VM images.

**Q3.** Short answer: in a Node.js project's Dockerfile, why should `COPY package.json ./` followed by `RUN npm ci` come *before* `COPY . .`? Explain in terms of layer caching what happens on a typical source-code-only commit.

**Q4.** A Dockerfile ends with `CMD ["node", "server.js"]`. What happens when a user runs `docker run myimage node --test`?

A. The container runs `node server.js` first, then `node --test`.
B. The container runs `node --test`; the arguments completely replace the CMD.
C. The container fails to start because CMD is immutable.
D. The container appends the arguments, running `node server.js node --test`.

**Q5.** Your Dockerfile contains `EXPOSE 3000`, but `curl localhost:3000` from the host fails while the container runs. What is the most likely explanation?

A. `EXPOSE` only documents the port; the container was started without `-p 3000:3000` to actually publish it.
B. `EXPOSE` must be the last instruction in the Dockerfile.
C. The base image does not support networking.
D. `curl` cannot reach containers; only `wget` can.

**Q6.** A containerized web app publishes its port with `-p 3000:3000`, yet connections from the host are reset. Inside the container the app logs that it is listening on `127.0.0.1:3000`. What is wrong?

A. The host port and container port must differ.
B. The app is bound to the container's loopback interface, so published traffic arriving on the container's external interface never reaches it; it must bind `0.0.0.0`.
C. Port 3000 is a privileged port and requires root.
D. The container needs a volume to accept connections.

**Q7.** Why does the lab's Dockerfile include `USER node`?

A. Node.js programs refuse to run as root.
B. It makes the image smaller by removing root's home directory.
C. Containers run as root by default; dropping to an unprivileged user means an attacker who compromises the app does not hold root, leaving container isolation as a second wall rather than the only one.
D. It is required for `EXPOSE` to work.

**Q8.** Short answer: your team deploys `myapp:latest` to production, and a rollback is requested two days later. Explain why the `:latest` tag makes this hard, and what tagging practice prevents the problem.

**Q9.** In a `docker-compose.yml`, what does the `healthcheck` section accomplish that `restart: unless-stopped` alone does not?

A. Nothing; they are equivalent.
B. It detects a container whose process is running but whose service is not actually working (e.g. deadlocked or erroring), by probing real behavior such as `GET /health` — restart policies only react to the process exiting.
C. It restarts the container faster.
D. It publishes the port automatically.

**Q10.** Which files most clearly belong in `.dockerignore` for a Node.js project, and why?

A. `package.json` and `server.js`, to speed up the build.
B. `node_modules` and `.git` — host-installed modules may not match the image OS, and git history (with potential secrets) does not belong in an image; both also bloat the build context.
C. The Dockerfile itself, to prevent recursion.
D. Nothing; `.dockerignore` is only for monorepos.

---

## Answer Key

**Q1 — B.** The image is the immutable build product (a stack of layers plus metadata); a container instantiates it at runtime, adding only a disposable writable layer — one image can back many independent containers.

**Q2 — C.** A VM virtualizes hardware and boots a full guest OS with its own kernel; a container is an isolated process on the shared host kernel, with namespaces controlling visibility and cgroups controlling resource use — which is why containers start in milliseconds.

**Q3 — Sample answer.** A changed layer invalidates every layer after it, so with manifests copied and dependencies installed first, a source-only commit leaves the `package.json` and `npm ci` layers cached and re-runs only the cheap `COPY . .`; reversed, every commit would invalidate and re-run the expensive dependency install.

**Q4 — B.** Arguments after the image name in `docker run` replace `CMD` entirely (unlike `ENTRYPOINT`, to which they are appended), so the container runs the test suite instead of the server.

**Q5 — A.** `EXPOSE` is metadata that documents intent and publishes nothing; only the runtime flag `-p host:container` (or equivalent compose `ports:`) maps a host port to the container.

**Q6 — B.** Published traffic is delivered to the container's external interface, so a loopback-bound server never sees it; the app must listen on `0.0.0.0` (all interfaces), as `server.listen(PORT)` with no host argument does.

**Q7 — C.** Containers default to root; running as the unprivileged `node` user applies least privilege so a compromised app is not one runtime or kernel bug away from root on the host — at zero cost for an app on an unprivileged port.

**Q8 — Sample answer.** Tags are mutable pointers, so `:latest` moved with every push and nobody can say which image was running two days ago, and "the previous latest" no longer exists as a name; tagging every build with the immutable git SHA (e.g. `myapp:3f9c2d1`) makes the running version traceable and rollback a simple redeploy of the prior SHA.

**Q9 — B.** A restart policy only fires when the process exits, but a process can be alive and useless (deadlocked, erroring on every request); a health check probes actual service behavior on a schedule and marks the container `unhealthy`, surfacing failures the process state hides.

**Q10 — B.** `node_modules` may contain binaries built for the host OS rather than the image's, and `.git` carries full history and potentially secrets; excluding both keeps the image correct and clean and shrinks the build context that `COPY . .` can reach.
