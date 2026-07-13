---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 07: Container Orchestration with Kubernetes"
---

<!-- _class: lead -->

# Container Orchestration with Kubernetes

## Module 07

From one container on your laptop to a self-healing fleet.

---

# Where We Are

- Module 06: the app runs as a container (`devops-demo-app:v1`)
- Docker Compose handles one machine well
- Production means many containers, many machines, constant change
- This module: **Kubernetes**, the industry-standard orchestrator

<!-- Remind students that last week they built and ran devops-demo-app:v1 with Docker and Compose. Frame this module as the natural next question: what happens when one laptop is not enough? Emphasize that everything they learned about images carries over directly. -->

---

<!-- _class: section-divider -->

# Section 1

## Why Orchestration?

---

# One Container Is Easy

```bash
docker run -d -p 3000:3000 devops-demo-app:v1
curl localhost:3000/health
```

- One process, one machine, one port
- You are the scheduler, the health checker, and the load balancer
- Fine for a demo — not for production

<!-- Run the docker command mentally with the class: it works, and it is exactly what they did in the module 6 lab. Then ask what happens at 3 a.m. when the container crashes, or when traffic triples. The answer today is "a human does something", which is the problem. -->

---

# Fleets Need More

| Need | Question it answers |
| --- | --- |
| Scheduling | Which machine should run this container? |
| Self-healing | Who restarts it when it dies? |
| Scaling | How do we go from 3 copies to 50? |
| Service discovery | How do containers find each other? |
| Rollouts | How do we ship v2 without downtime? |

<!-- Walk the table row by row. Each row is something students would otherwise script by hand with SSH and cron, which is brittle and unauditable. An orchestrator turns each of these from a manual procedure into a property of the system. -->

---

# What Kubernetes Gives You

- A **cluster**: many machines presented as one pool of compute
- A **declarative API**: you describe the end state, not the steps
- **Controllers** that continuously push reality toward your description
- Built-in networking, load balancing, and rolling deployments
- The same model from a laptop (kind) to a cloud provider

<!-- Position Kubernetes as an API for describing desired state, not as a pile of commands. The single most important idea in this module is declarative reconciliation; everything else is detail. Tell students the API is identical locally and in the cloud, which is why we can learn it on a laptop. -->

---

<!-- _class: section-divider -->

# Section 2

## Kubernetes Architecture

---

# The Cluster: Big Picture

- **Control plane**: decides *what should run where*
- **Worker nodes**: actually *run your containers*
- You talk to the control plane with `kubectl`
- Nodes report back; controllers correct any drift

```text
kubectl ──> API server ──> etcd (desired state)
                 │
        scheduler + controllers
                 │
        kubelet on each node ──> containers
```

<!-- Keep this slide at the "org chart" level: brains versus muscle. Students only need a working mental model, not the ability to administer a control plane. Stress that kubectl never talks to nodes directly; everything flows through the API server. -->

---

# Control Plane Components

| Component | Role |
| --- | --- |
| **API server** | Front door; validates and stores all requests |
| **etcd** | Key-value database holding cluster state |
| **Scheduler** | Picks a node for each new Pod |
| **Controller manager** | Runs reconciliation loops (ReplicaSets, nodes, ...) |

<!-- The API server is the only component anyone talks to, including the other control plane components. etcd is the single source of truth; if it is lost without backup, the cluster forgets everything. The scheduler only assigns Pods to nodes; it does not start containers itself. -->

---

# Node Components

| Component | Role |
| --- | --- |
| **kubelet** | Agent that starts/stops containers per API server instructions |
| **Container runtime** | Actually runs containers (containerd, CRI-O) |
| **kube-proxy** | Programs networking rules so Services route traffic |

- Every worker node runs all three

<!-- The kubelet is the hands of the cluster: it watches the API server for Pods assigned to its node and makes them real. Note that Docker images run unchanged because runtimes follow the same OCI standard from module 6. kube-proxy is why a Service IP magically reaches the right Pods. -->

---

# The Declarative Model

- Imperative: "run these commands in this order"
- Declarative: "here is the state I want" — Kubernetes figures out the steps
- You submit YAML manifests; the cluster stores them as **desired state**
- **Actual state** is what is really running right now

```yaml
spec:
  replicas: 3   # desired: three copies, always
```

<!-- Contrast a bash script that starts three containers once with a manifest that says "three replicas, always". The script is a one-shot action; the manifest is a standing contract. This distinction is also the foundation for Infrastructure as Code in module 8. -->

---

# Reconciliation Loops

- Controllers run an endless loop:
  1. Observe actual state
  2. Compare with desired state
  3. Take action to close the gap
- Delete a Pod that should have 3 replicas? A new one appears
- No human in the loop — this is **self-healing**

<!-- This loop is the heartbeat of Kubernetes and the answer to the 3 a.m. crash question from earlier. In the lab, students will delete a Pod and watch a replacement appear within seconds. Point out that scaling, healing, and rollouts are all just reconciliation with different desired states. -->

---

<!-- _class: section-divider -->

# Section 3

## Core Objects

---

# Pod: The Smallest Unit

- A Pod = one or more containers sharing network and storage
- Why Pods, not bare containers?
  - Sidecar patterns: log shipper or proxy next to the app
  - Shared `localhost` and volumes between tightly coupled containers
- Pods are **ephemeral**: they get replaced, not repaired
- You almost never create Pods directly

<!-- The key mental shift: Pods are cattle, not pets, so their names and IPs are disposable. Most Pods contain exactly one container, but the abstraction allows helpers to be co-scheduled. Because Pods are ephemeral, anything durable (identity, addressing, replica count) lives in higher-level objects. -->

---

# ReplicaSet: Keep N Copies Alive

- Desired state: "N Pods matching this template must exist"
- Watches actual Pod count; creates or deletes to match
- Gives you self-healing and horizontal scaling
- Managed for you by a Deployment — rarely written by hand

```yaml
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devops-demo-app
```

<!-- A ReplicaSet is the purest example of a reconciliation loop: count Pods, compare to replicas, fix. Students should recognize it in kubectl get output but will never author one directly. The selector is how it knows which Pods count as "its" Pods, which previews the labels slide. -->

---

# Deployment: Versioned Rollouts

- Wraps ReplicaSets and adds **change management**
- Rolling update: new ReplicaSet scales up while old scales down
- Keeps **revision history** — instant rollback with `rollout undo`
- The object you will write and edit most often

```bash
kubectl set image deployment/devops-demo-app app=devops-demo-app:v2
kubectl rollout status deployment/devops-demo-app
kubectl rollout undo deployment/devops-demo-app
```

<!-- Draw the hierarchy: Deployment manages ReplicaSets, ReplicaSets manage Pods. On an image update, the Deployment creates a second ReplicaSet and shifts Pods over gradually, so capacity never drops to zero. Rollback simply re-activates the previous ReplicaSet, which is why it is nearly instant. -->

---

# Labels and Selectors: The Wiring

- **Labels**: key-value tags on any object (`app: devops-demo-app`)
- **Selectors**: queries over labels
- This is how objects find each other — no hard-coded names
  - ReplicaSet selects the Pods it owns
  - Service selects the Pods it routes to

```yaml
selector:
  app: devops-demo-app   # Service: "send traffic to Pods with this label"
```

<!-- Labels are the glue of the whole system, and label typos are the number one beginner bug: a Service with a selector that matches nothing routes no traffic and reports no error. Show that the Pod template labels in the Deployment must match both the Deployment selector and the Service selector. The lab troubleshooting section covers exactly this failure. -->

---

# Service: Stable Networking

- Pods come and go; their IPs change — a **Service** gives one stable virtual IP and DNS name
- Load-balances across all Pods matching its selector

| Type | Reachable from | Typical use |
| --- | --- | --- |
| **ClusterIP** | Inside the cluster only | Service-to-service traffic (default) |
| **NodePort** | Any node IP on a high port | Quick demos, bare-metal edges |
| **LoadBalancer** | Internet via cloud LB | Public endpoints in the cloud |

<!-- Emphasize the problem first: you cannot point clients at Pod IPs because they change on every restart. ClusterIP is the default and what the lab uses, combined with port-forward for local access. LoadBalancer only does something useful on a cloud provider; on kind it stays pending, which surprises people. -->

---

# Namespace: Cluster Subdivision

- Virtual partitions inside one cluster
- Scope for names, access control (RBAC), and resource quotas
- Common pattern: one namespace per team or per environment
- Default namespace is literally called `default`

```bash
kubectl get pods --namespace kube-system
```

<!-- Namespaces keep teams from stepping on each other and let admins set quotas per group. The system components live in kube-system, which is worth a quick look in the lab. In this course we stay in default for simplicity, but production clusters almost always segment by namespace. -->

---

# Anatomy of a Manifest

```yaml
apiVersion: apps/v1        # which API group/version
kind: Deployment           # what type of object
metadata:
  name: devops-demo-app    # identity
  labels:
    app: devops-demo-app
spec:                      # desired state (varies by kind)
  replicas: 3
```

- Every object: `apiVersion`, `kind`, `metadata`, `spec`
- The cluster adds `status` — actual state, read-only

<!-- Every manifest students will ever read has these four top-level keys, so this slide is a decoding key for the rest of the course. spec is what you want; status is what you have — desired versus actual state again. Encourage kubectl explain deployment.spec as built-in documentation. -->

---

# Probes: Liveness vs Readiness

| | Question | On failure |
| --- | --- | --- |
| **Readiness** | Can this Pod serve traffic *right now*? | Removed from Service endpoints (no restart) |
| **Liveness** | Is this process alive at all? | Container is **restarted** |

```yaml
readinessProbe:
  httpGet: { path: /health, port: 3000 }
livenessProbe:
  httpGet: { path: /health, port: 3000 }
```

<!-- The consequences differ and that is the exam-worthy part: readiness failure quietly drains traffic, liveness failure kills and restarts the container. A too-aggressive liveness probe on a slow-starting app causes restart loops, a classic production incident. Our app's /health endpoint from module 3 finally pays off here. -->

---

# Resource Requests vs Limits

- **Request**: guaranteed minimum — the scheduler uses it to place the Pod
- **Limit**: hard ceiling — CPU is throttled, memory overuse means **OOMKill**

```yaml
resources:
  requests: { cpu: 50m, memory: 64Mi }
  limits:   { cpu: 250m, memory: 128Mi }
```

- `50m` = 0.05 CPU cores; `64Mi` = 64 mebibytes
- No requests set = scheduler is guessing

<!-- Requests are a scheduling promise; limits are an enforcement ceiling. The asymmetry matters: exceeding a CPU limit slows you down, exceeding a memory limit gets the container killed with OOMKilled in kubectl describe. Setting requests honestly is one of the highest-leverage production habits. -->

---

# Graceful Shutdown and SIGTERM

- During rollouts and scale-downs, Kubernetes sends **SIGTERM**, waits (default 30s), then SIGKILL
- Apps that ignore SIGTERM drop in-flight requests
- Our app already handles it (module 3 groundwork):

```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
```

<!-- Connect the dots explicitly: the signal handling added back in module 3 exists precisely for this moment. During a rolling update every old Pod receives SIGTERM, and a well-behaved app finishes in-flight requests and exits. Apps that ignore it get SIGKILLed after the grace period and clients see errors mid-deploy. -->

---

<!-- _class: section-divider -->

# Section 4

## Working with kubectl

---

# kubectl Essentials

```bash
kubectl apply -f k8s/                      # create/update from manifests
kubectl get pods                           # list (add -w to watch)
kubectl describe pod <name>                # details + event log
kubectl logs <pod> [-f]                    # container stdout/stderr
kubectl exec -it <pod> -- sh               # shell inside a container
kubectl port-forward svc/<name> 8080:80    # tunnel to your laptop
```

- `apply` is declarative: run it repeatedly, safely

<!-- These six commands cover ninety percent of daily Kubernetes work. Drill the debugging order: get for a summary, describe for events (probe failures, scheduling problems, OOMKills live there), logs for application output. apply is idempotent, which echoes the reconciliation theme. -->

---

# Managing Rollouts

```bash
kubectl set image deployment/devops-demo-app app=devops-demo-app:v2
kubectl rollout status deployment/devops-demo-app   # watch it complete
kubectl rollout history deployment/devops-demo-app  # revision list
kubectl rollout undo deployment/devops-demo-app     # instant rollback
kubectl scale deployment/devops-demo-app --replicas=5
```

- Rollback = re-activating the previous ReplicaSet

<!-- Students perform this exact sequence in the lab: ship v2, watch the rollout, then undo it. Because old ReplicaSets are retained, undo is a metadata change, not a rebuild, so it completes in seconds. In module 10 we replace manual set image with pipeline-driven and GitOps-driven rollouts. -->

---

# Local Clusters: kind and minikube

| | kind | minikube |
| --- | --- | --- |
| Nodes are | Docker containers | VM or container |
| Strengths | Fast, great for CI | Addons, dashboard |
| Load images | `kind load docker-image` | `minikube image load` |

```bash
brew install kind
kind create cluster --name devops-course
```

- No registry locally — images must be **loaded** into the cluster

<!-- kind runs each cluster node as a Docker container, which is delightfully recursive and very fast to create and destroy. The crucial gotcha: the cluster cannot pull devops-demo-app:v1 from any registry because it only exists in the local Docker daemon, hence kind load and imagePullPolicy Never in the lab. minikube is a fine alternative and the lab notes the equivalent commands. -->

---

# Summary

- Orchestration = scheduling, self-healing, scaling, discovery, rollouts
- Control plane decides; kubelet on each node executes
- Declarative model: desired state in etcd, controllers reconcile
- Deployment → ReplicaSet → Pods; Service routes via label selectors
- Readiness gates traffic; liveness restarts; requests/limits size Pods
- `kubectl apply / get / describe / logs / rollout` are your daily tools

<!-- Recap by tracing one request: kubectl apply stores desired state, the scheduler places Pods, kubelet runs them, readiness admits them to the Service, and traffic flows. If students can narrate that chain, they understand the module. The lab makes every step of it visible on their own machine. -->

---

# Next Up

- **Lab 07**: deploy `devops-demo-app` to a kind cluster — self-healing, scaling, a rolling update, and a rollback, then commit `k8s/` manifests via PR
- **Module 08: Infrastructure as Code** — the declarative idea applied to infrastructure itself, with Terraform
- Later: module 10 automates these rollouts (canary, GitOps)

<!-- Preview the arc: this week they deploy by hand to understand the moving parts; module 8 describes infrastructure declaratively with Terraform; module 10 automates deployments end to end. Remind them the lab requires Docker running and the v1 image from module 6. -->
