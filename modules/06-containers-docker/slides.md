---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 06: Containers with Docker"
---

<!-- _class: lead -->

# Containers with Docker

## Module 06

Package the application *and* its environment into one immutable, portable artifact.

---

## Where we are

- Modules 4-5: every change to your repo is tested, linted, and smoke-tested by CI
- The remaining gap: CI proves the *code* — but the machine it eventually runs on still has its own Node version, OS, and configuration
- Today we package the environment itself, so "works on my machine" becomes "ships as my machine"

<!-- Frame the module as closing the last gap from module 5's teaser. The pipeline verifies code in a clean environment, but production machines are not that environment. Containers make the verified environment itself the deliverable. -->

---

<!-- _class: section-divider -->

# Section 1: Why Containers Exist

---

## "Works on my machine"

- Classic failure: app works in dev, breaks in prod. Why?
  - Different Node version (18 vs 20)
  - Missing system library or tool
  - Different environment variables, file paths, OS
- This is **dependency drift**: environments diverge silently over time
- Traditional fixes — wiki setup docs, "golden" VMs, install scripts — all decay
- Container answer: ship the app **with** its entire userspace environment

<!-- Ask for war stories — everyone has one. The key word is "silently": nobody decides to let environments drift; it happens through unrelated upgrades and manual fixes. Documentation decays because nothing enforces it. Containers make the environment an artifact under version control. -->

---

## VMs vs containers

| | Virtual machine | Container |
| --- | --- | --- |
| Virtualizes | Hardware (full guest OS) | Operating system (shares host kernel) |
| Isolation via | Hypervisor | Namespaces + cgroups |
| Boot time | Minutes | Milliseconds-seconds |
| Size | Gigabytes | Megabytes |
| Density per host | Handfuls | Hundreds |

- A container is **not** a lightweight VM — it is an isolated *process* (or process tree) on the host's kernel

<!-- The most important row is the first: a VM carries a whole guest OS with its own kernel; a container shares the host kernel and isolates at the process level. That single difference explains every other row — boot time, size, density. -->

---

## Namespaces + cgroups (conceptually)

- **Namespaces** control what a process can *see*:
  - Its own process tree (PID 1 inside is your app), network stack, filesystem mounts, hostname
- **cgroups** control what a process can *use*:
  - CPU shares, memory limits, I/O bandwidth
- Docker's job: wrap these kernel features in a usable workflow — build, ship, run
- No hardware emulation anywhere — that is why startup is nearly instant

<!-- One line each: namespaces = visibility, cgroups = resources. Students don't need syscall-level detail, but they should stop thinking "mini VM". Mention that Docker on macOS/Windows runs a hidden Linux VM to provide the kernel — containers are a Linux kernel feature. -->

---

<!-- _class: section-divider -->

# Section 2: Images, Containers, Registries

---

## Image vs container

- **Image**: an immutable, layered template — filesystem + metadata (env vars, default command). Built once, never changes.
- **Container**: a *running instance* of an image, plus a thin writable layer on top
- Analogy for developers: image is to container as **class is to object** (or program to process)

```bash
docker run devops-demo-app:v1     # instance 1
docker run devops-demo-app:v1     # instance 2 — same image, independent state
```

<!-- Drill this distinction — it is the number one beginner confusion and a guaranteed quiz question. One image, many containers, each with its own writable layer. Deleting a container never touches the image. -->

---

## Images are stacks of layers

```dockerfile
FROM node:20-alpine      # layers from the base image
WORKDIR /app             # + a layer
COPY package.json ./     # + a layer
COPY . .                 # + a layer
CMD ["node","server.js"] # + metadata (no filesystem change)
```

- Each instruction produces a **layer**; layers are content-addressed and **shared** between images
- Ten images on `node:20-alpine` store the base layers **once**
- Layers are the key to build caching — coming up shortly

<!-- Layers explain both storage efficiency and build speed. Content-addressing means identical layers are stored and pulled exactly once. Understanding layers now makes the caching demo in the lab click. -->

---

## Registries

- A **registry** stores and distributes images — "GitHub for images"
  - **Docker Hub**: the default public registry (`node`, `nginx`, `postgres` live there)
  - **GHCR** (GitHub Container Registry): `ghcr.io/your-user/your-image`, integrates with your repo
- The workflow: `docker build` locally or in CI → `docker push` to a registry → any machine can `docker pull` and run
- This is module 4's **artifact** idea made real: the image is the thing we build once and promote

<!-- Connect explicitly to build-once-promote-many from module 4. The registry is the artifact store. In module 7, Kubernetes pulls this exact image from a registry — the lab's optional GHCR push sets that up. -->

---

<!-- _class: section-divider -->

# Section 3: The Dockerfile

---

## Dockerfile instructions, precisely

| Instruction | Effect |
| --- | --- |
| `FROM` | Base image to build on (always first) |
| `WORKDIR` | Set (and create) the working directory for later steps |
| `COPY` | Copy files from build context into the image |
| `RUN` | Execute a command at **build** time (new layer) |
| `ENV` | Set an environment variable (build + runtime) |
| `EXPOSE` | *Document* the listening port (metadata only!) |
| `USER` | Switch the user for subsequent steps and runtime |
| `CMD` / `ENTRYPOINT` | What runs when the container **starts** |

<!-- The two easy-to-misread rows: RUN executes at build time and bakes the result into a layer, while CMD executes at container start; EXPOSE publishes nothing — it is pure documentation. Both misconceptions appear on the quiz. -->

---

## Our app's Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Dependency layer first (this app has zero runtime deps,
# so no RUN npm ci is needed -- but keep the ordering habit)
COPY package.json ./

# Source code last: it changes most often
COPY . .

ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
```

<!-- Walk through top to bottom. Alpine base keeps it small; the two-stage COPY looks redundant for a zero-dependency app but rehearses the pattern every real Node project needs. USER node drops root before the process starts. This exact file is written in the lab. -->

---

## Layer caching: order matters

- Docker rebuilds a layer only if its inputs changed — **and every layer after it**
- Therefore: put **rarely-changing** things early, **frequently-changing** things late

```dockerfile
COPY package.json ./     # changes rarely
RUN npm ci               # expensive -- cached while package.json is unchanged
COPY . .                 # changes on every commit -- cheap to redo
```

- Anti-pattern: `COPY . .` first, then install — every source edit re-installs **all** dependencies

<!-- This is the single highest-value Dockerfile optimization. In a real project the dependency install is minutes; with correct ordering it reruns only when dependencies change. The lab demonstrates cache hits and misses empirically by touching app.js vs package.json. -->

---

## CMD vs ENTRYPOINT

- **CMD**: the *default* command — fully replaced by any arguments to `docker run`

```bash
docker run devops-demo-app:v1              # runs: node server.js
docker run devops-demo-app:v1 node --test  # runs the tests instead
```

- **ENTRYPOINT**: the *fixed* executable; `docker run` arguments are **appended** to it
- Common combo: `ENTRYPOINT` = the program, `CMD` = its default flags
- Prefer **exec form** (`["node","server.js"]`) over shell form — no wrapping shell, so signals like SIGTERM reach your process (our graceful shutdown depends on it!)

<!-- The exec-form point is not pedantry: shell form runs /bin/sh -c "node server.js", the shell gets PID 1, and SIGTERM never reaches Node — our server.js SIGTERM handler (and module 7's graceful pod termination) silently stops working. -->

---

## .dockerignore and image hygiene

```text
node_modules
.git
*.md
```

- `.dockerignore` trims the **build context** — what gets sent to the builder and what `COPY . .` can grab
  - Never bake `node_modules` (wrong-OS binaries) or `.git` (history, potential secrets) into an image
- Size hygiene:
  - Small bases: `node:20-alpine` (~130 MB) vs `node:20` (~1 GB)
  - **Multi-stage builds**: compile in a fat builder stage, `COPY --from=` only the output into a slim final stage

<!-- Two habits: exclude junk from the context, and start from small bases. Multi-stage matters most for compiled languages and bundled frontends; our interpreted zero-dependency app doesn't need one, but students must recognize the pattern. Smaller images also mean fewer CVEs — module 12. -->

---

## Run as non-root: `USER node`

- By default, containers run as **root** — inside the container, but still root
- If an attacker exploits your app, container isolation is the *only* wall left; a kernel or runtime bug then means root on the host
- The `node` base images ship a ready-made unprivileged `node` user — use it
- Costs nothing for our app (no privileged ports, no system writes needed)

<!-- Defense in depth again. Root-in-container is not root-on-host by default, but it is one bug away from it. Since dropping privileges costs one Dockerfile line, there is no excuse. Module 12's image scanners flag root-running containers for exactly this reason. -->

---

## Tagging strategy

- A tag is a **mutable pointer** to an image — `:latest` is just a tag like any other, and it *moves*
- "What is running in prod?" must have an exact answer:

```bash
docker tag devops-demo-app:v1 \
  devops-demo-app:$(git rev-parse --short HEAD)
# devops-demo-app:3f9c2d1  -- forever traceable to a commit
```

- Rule: **never rely on `:latest` in production** — tag with the git SHA (plus a human-friendly version)
- Immutable tags are what make module 10's rollbacks trivial: redeploy the old SHA

<!-- The mental model fix: tags are pointers, not versions. :latest today and :latest tomorrow can be different images, which destroys reproducibility and rollback. SHA tagging links every running container to an exact commit — provenance for free. -->

---

<!-- _class: section-divider -->

# Section 4: Running & Operating Containers

---

## docker run and friends

```bash
docker run -d --name demo -p 3000:3000 -e PORT=3000 devops-demo-app:v1
#           |    |          |            |
#           |    |          |            +-- set env var inside container
#           |    |          +-- publish host:container port
#           |    +-- a name for referencing the container
#           +-- detached (background)

docker logs -f demo        # follow stdout/stderr
docker exec -it demo sh    # shell inside the running container
docker stop demo           # SIGTERM, grace period, then SIGKILL
```

<!-- Live-demo these if possible. docker stop sends SIGTERM first — our app logs "SIGTERM received, shutting down", proving the exec-form CMD delivers signals. logs and exec are the two everyday debugging tools. -->

---

## Ports: EXPOSE vs -p, and 0.0.0.0

- A container has its **own network namespace** — its ports are invisible to the host by default
- `EXPOSE 3000` in the Dockerfile: **documentation only**, publishes nothing
- `-p 3000:3000` at run time: actually maps host port → container port
- From module 3: a server bound to `127.0.0.1` inside the container is unreachable *even with* `-p` — the mapped traffic arrives on the container's external interface
- Our app calls `server.listen(PORT)` with no host argument → binds `0.0.0.0` (all interfaces)

<!-- Bridge back to module 3's interfaces discussion. The classic symptom: image builds, container runs, curl from host gets connection reset — because the app bound loopback. Our sample app is safe by default, but students will hit this with other frameworks that default to 127.0.0.1. -->

---

## Container health checks

- "Running" only means the process exists — it can be deadlocked or erroring on every request
- A **health check** probes actual behavior on a schedule:

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
  interval: 10s
  timeout: 3s
  retries: 3
```

- Status becomes `starting` → `healthy` / `unhealthy` in `docker ps`
- Our `/health` endpoint: written for smoke tests (module 5), reused here, reused again by Kubernetes probes (module 7)

<!-- The /health endpoint completes its journey: unit-testable function, CI smoke test, Docker health check, and next module Kubernetes liveness/readiness probes. One endpoint, four consumers — that's why services expose health routes. -->

---

## docker compose: multi-container local dev

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
```

- One declarative file (`docker-compose.yml`) instead of memorized `docker run` flags
- `docker compose up -d`, `docker compose ps`, `docker compose down`
- Real value appears with **multiple** services: app + database + cache, one command, shared network, services address each other by name

<!-- Compose is docker run flags as reviewable, versioned YAML — declarative beats imperative (a theme that peaks with Kubernetes and Terraform). One service undersells it; sketch adding a postgres service in three lines and note module 11 adds Prometheus and Grafana as compose services. -->

---

## Containers are ephemeral: volumes

- A container's writable layer **dies with the container** — `docker rm` deletes it all
- Design rule: containers are **cattle, not pets** — anything worth keeping must live outside
- **Volumes** are Docker-managed persistent storage mounted into containers:

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

- Our app is stateless (by design) — no volumes needed; state lives in databases

<!-- Ephemerality is a feature: it forces state to be explicit. Stateless apps scale horizontally and restart freely — which is exactly what Kubernetes assumes in module 7. The postgres example shows the pattern students will need the moment they add a real database. -->

---

## Summary

- Containers solve dependency drift by shipping the app **with** its userspace; isolation via namespaces (visibility) + cgroups (resources), sharing the host kernel — not mini VMs
- **Image** = immutable layered template; **container** = running instance; registries distribute images
- Dockerfile: order layers rarely-changing → frequently-changing; exec-form `CMD`; `USER node`; `.dockerignore`
- `EXPOSE` documents, `-p` publishes; apps must bind `0.0.0.0`
- Tag with the git SHA — `:latest` is a moving pointer, not a version
- Health checks probe behavior; compose declares the local stack; containers are ephemeral — persistent state goes in volumes

<!-- Quick-fire review: image vs container, RUN vs CMD, EXPOSE vs -p, why non-root, why not :latest. These five contrasts are the module's skeleton and most of the quiz. -->

---

## Next up

- **Lab 06**: in your `devops-demo-app` repo — write the Dockerfile and `.dockerignore`, build and run the image, poke it with `logs` and `exec`, prove layer caching empirically, tag with your git SHA, bring it up under compose with a health check, optionally push to GHCR, and merge it all through your (still green) CI pipeline
- **Module 07: Container Orchestration with Kubernetes** — one container on one machine is a demo; Kubernetes runs and heals many containers across many machines, and it starts by pulling the exact image you build this week

<!-- Emphasize lab continuity: the Dockerfile lands via PR, and modules 4-5's gates must stay green — DevOps changes ride the same pipeline as code. Tease module 7: everything this week (image, SIGTERM handling, /health) is precisely what Kubernetes consumes. -->
