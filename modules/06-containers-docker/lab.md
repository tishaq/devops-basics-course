# Lab 06: Containerize the App

## What you will do

You will write a Dockerfile and `.dockerignore` for your `devops-demo-app`, build an image and run it as a container, inspect it with `docker logs` and `docker exec`, prove layer caching empirically, tag the image with your git commit SHA, and define the service in Docker Compose with a health check. As a stretch goal you can push the image to GitHub Container Registry. Everything lands in your repository through a pull request — and the CI gates from modules 4 and 5 must stay green.

Estimated time: 90-120 minutes.

## Prerequisites

- [ ] Completed Lab 05: your repo has `eslint.config.js`, and CI runs required `lint` and `test (18/20/22)` checks with the `/health` smoke test.
- [ ] Docker Desktop (or Docker Engine on Linux) installed and running: `docker version` shows both Client and Server sections.
- [ ] `docker run hello-world` succeeds.
- [ ] Local repo clean and current: `git switch main && git pull`, `npm test` passes.

## Steps

### 1. Write the Dockerfile

Create a branch:

```bash
cd devops-demo-app
git switch -c lab06-docker
```

Create a file named `Dockerfile` (no extension) in the repository root:

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Copy the dependency manifest first. This app has zero runtime
# dependencies, so there is no RUN npm ci step -- but keeping the
# manifest in its own early layer is the ordering habit that makes
# dependency installs cacheable in every real project.
COPY package.json ./

# Source code changes most often, so it goes last.
COPY . .

ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
```

Note the exec-form `CMD` (JSON array): it makes `node` PID 1 inside the container, so `docker stop`'s SIGTERM reaches our graceful-shutdown handler in `server.js`. Shell form (`CMD node server.js`) would wrap the process in a shell and swallow the signal.

### 2. Create .dockerignore

Create `.dockerignore` in the repository root:

```text
node_modules
.git
*.md
```

This keeps host-installed `node_modules` (from Lab 05's ESLint install), the entire git history, and documentation out of the build context — so `COPY . .` cannot bake them into the image.

### 3. Build the image and run a container

Build, tagging the image `devops-demo-app:v1`:

```bash
docker build -t devops-demo-app:v1 .
```

Expected output (abbreviated; the first build downloads the base image):

```text
[+] Building 12.4s (10/10) FINISHED
 => [1/4] FROM docker.io/library/node:20-alpine
 => [2/4] WORKDIR /app
 => [3/4] COPY package.json ./
 => [4/4] COPY . .
 => exporting to image
 => => naming to docker.io/library/devops-demo-app:v1
```

**Save this output** — it is deliverable 1. Now run a container in the background and exercise every endpoint:

```bash
docker run -d --name demo -p 3000:3000 devops-demo-app:v1

curl "http://localhost:3000/?name=Ada"
# {"message":"Hello, Ada!"}

curl http://localhost:3000/health
# {"status":"ok","uptimeSeconds":3}

curl http://localhost:3000/metrics
# demo_app_requests_total 2
# demo_app_uptime_seconds 5
```

Inspect the running container:

```bash
docker logs demo
# devops-demo-app listening on port 3000
# 2026-07-13T19:20:31.000Z GET /?name=Ada 200
# ...

docker exec -it demo sh
```

Inside the container's shell, look around, then exit:

```sh
whoami          # node   <-- not root, thanks to USER
ls /app         # Dockerfile  app.js  app.test.js  package.json  server.js ...
exit
```

Finally, stop the container and confirm the graceful shutdown:

```bash
docker stop demo
docker logs demo | tail -n 1
# SIGTERM received, shutting down

docker rm demo
```

### 4. Prove layer caching empirically

Rebuild without changing anything:

```bash
docker build -t devops-demo-app:v1 .
```

Every step should say `CACHED` and the build finishes in well under a second. Now touch **source code** and rebuild:

```bash
touch app.js
docker build -t devops-demo-app:v1 .
```

Observe: steps 1-3 (`FROM`, `WORKDIR`, `COPY package.json`) are `CACHED`; only `[4/4] COPY . .` re-executes. Now touch the **dependency manifest** and rebuild:

```bash
touch package.json
docker build -t devops-demo-app:v1 .
```

Observe: `[3/4] COPY package.json ./` re-executes **and so does everything after it** — a changed layer invalidates all subsequent layers. In a real project, that step-3 position is where the expensive `RUN npm ci` lives, which is exactly why manifests are copied before source. Write one sentence about this comparison for deliverable 4.

### 5. Tag with the git SHA

Tags are mutable pointers; commits are forever. Give the image a name traceable to your exact commit:

```bash
docker tag devops-demo-app:v1 devops-demo-app:$(git rev-parse --short HEAD)

docker images devops-demo-app
# REPOSITORY        TAG       IMAGE ID       CREATED          SIZE
# devops-demo-app   3f9c2d1   a1b2c3d4e5f6   2 minutes ago    135MB
# devops-demo-app   v1        a1b2c3d4e5f6   2 minutes ago    135MB
```

Note both tags share one IMAGE ID — a tag adds a name, not a copy. This is the tagging discipline that makes module 10's rollbacks trivial.

### 6. Define the service in Docker Compose

Create `docker-compose.yml` in the repository root:

```yaml
services:
  app:
    build: .
    image: devops-demo-app:v1
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s
```

The health check runs `wget` (included in the Alpine base image) *inside* the container against `/health` every 10 seconds; three consecutive failures mark the service `unhealthy`. `restart: unless-stopped` makes Docker restart the container if it crashes.

Bring the stack up and watch the health status:

```bash
docker compose up -d
docker compose ps
```

Immediately after startup you will see `(health: starting)`; within about 15 seconds, re-run `docker compose ps`:

```text
NAME                    IMAGE                COMMAND            SERVICE   STATUS
devops-demo-app-app-1   devops-demo-app:v1   "node server.js"   app       Up 20 seconds (healthy)
```

**Save this output showing `(healthy)`** — it is deliverable 2. Verify the app responds, then tear down:

```bash
curl http://localhost:3000/health
docker compose down
```

### 7. Optional stretch: push to GitHub Container Registry

A local image helps nobody else; registries distribute it. Create a GitHub personal access token (classic) with the `write:packages` scope (GitHub → Settings → Developer settings → Personal access tokens), then:

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u YOUR-USER --password-stdin
# Login Succeeded

docker tag devops-demo-app:v1 ghcr.io/YOUR-USER/devops-demo-app:$(git rev-parse --short HEAD)
docker push ghcr.io/YOUR-USER/devops-demo-app:$(git rev-parse --short HEAD)
```

The image appears under the **Packages** section of your GitHub profile (private by default). In module 7, a Kubernetes cluster pulls images from exactly this kind of registry.

### 8. Commit via PR — CI must stay green

```bash
git add Dockerfile .dockerignore docker-compose.yml
git commit -m "Containerize the app with Docker and Compose"
git push -u origin lab06-docker
```

Open a pull request. Your required checks from modules 4 and 5 — `lint`, `test (18)`, `test (20)`, `test (22)` — run as always and must pass; infrastructure files ride the same quality gates as application code. When everything is green, merge, and pull `main` locally.

## Deliverables

Submit the following in your lab write-up:

1. The output of your first `docker build`, showing all four steps executing.
2. The output of `docker compose ps` showing the service `Up ... (healthy)`.
3. The URL of your merged pull request with all CI checks green.
4. One or two sentences comparing the rebuilds in step 4: which layers rebuilt after touching `app.js` versus `package.json`, and why does the order of `COPY` instructions matter for real projects?
5. (Stretch, optional) The URL of your package on GHCR.

## Troubleshooting

**`docker build` fails with "Cannot connect to the Docker daemon".**
Docker Desktop is not running. Start it and wait for the whale icon to settle, then verify with `docker version` — you need both the Client and Server sections to print.

**`docker run` fails with "port is already allocated" or "address already in use".**
Something on your host is already using port 3000 — often a `node server.js` left over from an earlier lab, or a previous container. Find it with `docker ps` and `lsof -i :3000` (module 3), then stop it, or map a different host port: `-p 8080:3000` and curl `localhost:8080`.

**`curl localhost:3000` says "connection reset" or "empty reply" but the container is running.**
You are hitting the port-binding trap from the lecture: the server inside the container is bound to `127.0.0.1` instead of `0.0.0.0`. Our unmodified `server.js` binds all interfaces — if you changed `server.listen(PORT)` to pass a host argument, remove it. Also confirm you actually published the port with `-p 3000:3000`.

**`docker compose ps` shows `(unhealthy)`.**
Run the probe manually to see why: `docker compose exec app wget -qO- http://localhost:3000/health`. If `wget` is missing, your `FROM` line does not use the Alpine image. If the connection is refused, check `docker compose logs app` for a startup crash. Note the health check URL must use the *container's* port (3000), regardless of any host mapping.

**`docker compose up` fails with "conflict: the container name ... is already in use" or reuses a stale image.**
Tear down previous experiments first: `docker compose down`, `docker rm -f demo` for the step 3 container, and force a fresh build with `docker compose up -d --build`.

**GHCR push fails with "denied: permission_denied" (stretch step).**
The token is missing the `write:packages` scope, or the image name does not match your username exactly — the tag must be `ghcr.io/YOUR-USER/devops-demo-app:...` with your GitHub username lowercase. Re-run `docker login ghcr.io` after fixing the token.
