# Lab 07: Deploying devops-demo-app to Kubernetes

## What you will do

Deploy the container image you built in module 6 to a local Kubernetes cluster running in kind. You will write a Deployment and a Service manifest, watch Kubernetes self-heal and scale your app, perform a rolling update to a `v2` image and roll it back, and commit your manifests to your repository through a pull request.

Estimated time: 90-120 minutes.

## Prerequisites

- [ ] Completed Lab 06 (your repo contains a working `Dockerfile`, and `devops-demo-app:v1` builds locally)
- [ ] Docker Desktop (or another Docker engine) running
- [ ] `kubectl` installed (`brew install kubectl`, or it ships with Docker Desktop)
- [ ] kind installed: `brew install kind` (Linux: see https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [ ] Your `devops-demo-app` GitHub repository cloned locally with a clean working tree

> Alternative: if you prefer minikube (`brew install minikube`), every step works the same except cluster creation (`minikube start`) and image loading (`minikube image load devops-demo-app:v1`). The manifests are identical.

## Steps

### 1. Create a kind cluster

```bash
kind create cluster --name devops-course
```

Expected output ends with:

```text
Set kubectl context to "kind-devops-course"
You can now use your cluster with:

kubectl cluster-info --context kind-devops-course
```

Verify the node is ready (it may take ~30 seconds to reach `Ready`):

```bash
kubectl get nodes
```

```text
NAME                          STATUS   ROLES           AGE   VERSION
devops-course-control-plane   Ready    control-plane   40s   v1.29.2
```

### 2. Build the image and load it into kind

From your `devops-demo-app` repository root:

```bash
docker build -t devops-demo-app:v1 .
kind load docker-image devops-demo-app:v1 --name devops-course
```

Why the `kind load` step? Your image exists only in your local Docker daemon. The kind cluster's nodes are separate containers with their own image store, and there is no registry they could pull from. `kind load` copies the image directly onto the cluster nodes. Without it, Kubernetes would try to pull `devops-demo-app:v1` from Docker Hub and fail with `ErrImagePull`.

### 3. Write the Deployment manifest

Create a `k8s/` directory in your repository, then create `k8s/deployment.yaml` with exactly this content:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-demo-app
  labels:
    app: devops-demo-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devops-demo-app
  template:
    metadata:
      labels:
        app: devops-demo-app
    spec:
      containers:
        - name: app
          image: devops-demo-app:v1
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            periodSeconds: 10
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 250m
              memory: 128Mi
```

Points to notice before moving on:

- `imagePullPolicy: Never` tells the kubelet to use only the image already present on the node (the one you loaded with `kind load`). The default policy would attempt a registry pull and fail.
- Both probes hit `GET /health` — the endpoint your app has served since module 3.
- The labels appear three times: on the Deployment, in the selector, and in the Pod template. The selector and template labels must match, or the apply is rejected.

### 4. Write the Service manifest

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: devops-demo-app
spec:
  type: ClusterIP
  selector:
    app: devops-demo-app
  ports:
    - port: 80
      targetPort: 3000
```

The Service listens on port 80 inside the cluster and forwards to `containerPort` 3000 on any Pod labeled `app: devops-demo-app`.

### 5. Apply and verify

```bash
kubectl apply -f k8s/
```

```text
deployment.apps/devops-demo-app created
service/devops-demo-app created
```

Watch the Pods come up (Ctrl-C to stop watching):

```bash
kubectl get pods -w
```

Wait until all three show `1/1 Running`:

```text
NAME                               READY   STATUS    RESTARTS   AGE
devops-demo-app-7d9c6bf6b5-4x2lp   1/1     Running   0          25s
devops-demo-app-7d9c6bf6b5-9kfzw   1/1     Running   0          25s
devops-demo-app-7d9c6bf6b5-tq8rn   1/1     Running   0          25s
```

The `READY 1/1` column means the readiness probe is passing. Now tunnel to the Service and hit the app:

```bash
kubectl port-forward svc/devops-demo-app 8080:80
```

In a second terminal:

```bash
curl "http://localhost:8080/?name=Kube"
curl http://localhost:8080/health
```

```text
{"message":"Hello, Kube!"}
{"status":"ok","uptimeSeconds":42}
```

Leave the port-forward running or restart it as needed in later steps.

### 6. Self-healing demo

Delete one Pod on purpose and watch the ReplicaSet replace it:

```bash
kubectl get pods
kubectl delete pod <one-pod-name-from-the-list>
kubectl get pods -w
```

Within seconds a new Pod (with a new name) appears and moves to `Running` — the reconciliation loop noticed actual state (2 Pods) no longer matched desired state (3) and acted. Note the new Pod's `AGE` column versus its siblings.

### 7. Scale up and down

```bash
kubectl scale deployment/devops-demo-app --replicas=5
kubectl get pods
```

Five Pods. Now back down:

```bash
kubectl scale deployment/devops-demo-app --replicas=3
kubectl get pods
```

The two terminating Pods each receive SIGTERM; check one with `kubectl logs <terminating-pod>` quickly and you may catch `SIGTERM received, shutting down` — your app's signal handler at work.

### 8. Rolling update and rollback

Edit `app.js` in your repository: change the default greeting in the `greet` function from `'Hello, world!'` to `'Hello from v2, world!'` (also update the template string if you like, but keep the tests passing or update them — CI from module 4 still runs on your PR).

Build and load the new version:

```bash
docker build -t devops-demo-app:v2 .
kind load docker-image devops-demo-app:v2 --name devops-course
```

Trigger a rolling update and watch it:

```bash
kubectl set image deployment/devops-demo-app app=devops-demo-app:v2
kubectl rollout status deployment/devops-demo-app
```

```text
Waiting for deployment "devops-demo-app" rollout to finish: 1 out of 3 new replicas have been updated...
...
deployment "devops-demo-app" successfully rolled out
```

Re-establish the port-forward and confirm the new greeting:

```bash
curl http://localhost:8080/
# {"message":"Hello from v2, world!"}
```

Inspect the revision history, then roll back:

```bash
kubectl rollout history deployment/devops-demo-app
kubectl rollout undo deployment/devops-demo-app
kubectl rollout status deployment/devops-demo-app
curl http://localhost:8080/
# {"message":"Hello, world!"}
```

Rollback re-activated the v1 ReplicaSet — no rebuild, no re-load, done in seconds.

### 9. Explore logs and describe

```bash
kubectl logs deployment/devops-demo-app --tail=20
kubectl describe pod <any-pod-name>
```

In the `describe` output, find: the node the Pod was scheduled to, the `Requests`/`Limits` you set, both probes, and the `Events` section at the bottom. The events log is your first stop whenever a Pod misbehaves.

### 10. Commit your manifests via PR

```bash
git checkout -b lab-07-kubernetes
git add k8s/
git commit -m "Add Kubernetes Deployment and Service manifests"
git push -u origin lab-07-kubernetes
```

Open a pull request on GitHub, wait for the CI checks from modules 4-5 to pass, get it reviewed if your branch protection requires it, and merge. If you changed `app.js` for the v2 demo, either revert that change or update `app.test.js` so tests pass.

## Deliverables

Submit the following (text output pasted into your lab write-up, plus the PR link):

1. Output of `kubectl get all` showing the Deployment, ReplicaSets, Service, and 3 running Pods.
2. Output of `kubectl rollout history deployment/devops-demo-app` showing at least 2 revisions (from the v2 update and the undo).
3. The URL of your merged pull request adding `k8s/`.

## Troubleshooting

**Pods stuck in `ErrImagePull` or `ImagePullBackOff`.** Kubernetes is trying to pull the image from a registry. Confirm you ran `kind load docker-image devops-demo-app:v1 --name devops-course` (with the right cluster name) and that the manifest has `imagePullPolicy: Never`. Re-apply after fixing.

**Pods `Running` but `READY 0/1`.** The readiness probe is failing. Check `kubectl describe pod <name>` — the Events section shows probe failures. Common causes: probe path is not `/health`, probe port is not `3000`, or the container crashed and is restarting (check `kubectl logs`).

**`curl localhost:8080` fails or hangs.** The port-forward is not running (it stops when you Ctrl-C or when its target Pod terminates, e.g. during the rolling update). Restart it: `kubectl port-forward svc/devops-demo-app 8080:80`. If it starts but requests fail, check `kubectl get endpoints devops-demo-app` — an empty list means the Service selector matches no ready Pods (label typo).

**`kind create cluster` fails.** Docker is not running, or a previous cluster with the same name exists. Start Docker Desktop; list clusters with `kind get clusters` and delete leftovers with `kind delete cluster --name devops-course`.

**Rollout hangs at "1 out of 3 new replicas".** The v2 Pods are failing their readiness probe, so the rollout will not proceed (this is a feature — bad versions never take traffic). `kubectl get pods` will show the new Pods not ready; check their logs. Frequent cause: you forgot `kind load` for the `v2` tag, so the new Pods are in `ErrImagePull`. Fix the image, or `kubectl rollout undo` to abort.
