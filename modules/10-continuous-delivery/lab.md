# Lab 10: Canary Deployment on Kubernetes

## What you will do

Roll out a new version (v2) of `devops-demo-app` on your kind cluster using a canary strategy: run v2 alongside v1 behind the same Service so roughly 20% of traffic hits the canary, judge it, promote it, and practice an instant rollback. You will finish with a short write-up contrasting your canary with a blue/green approach.

Estimated time: 75–90 minutes.

## Prerequisites

- [ ] Completed Lab 09 (ConfigMap + `GREETING` env var merged into your repo)
- [ ] Your kind cluster `devops-course` from module 7 is running (`kind get clusters` shows `devops-course`)
- [ ] `k8s/deployment.yaml` and `k8s/service.yaml` from module 7 are deployed and healthy (`kubectl get pods` shows 3 Running pods)
- [ ] Docker Desktop (or your Docker engine) is running
- [ ] `kubectl`, `kind`, and `git` on your PATH
- [ ] You are on an up-to-date `main` in your `devops-demo-app` repository

## Steps

### 1. Make v1 and v2 distinguishable

To judge a canary you must be able to tell which version answered. Add a version field to the `/` response.

Open `app.js` and add a constant near the top (below `'use strict';`):

```js
const APP_VERSION = 'v2';
```

Then change the `/` case in `handleRequest` to include it:

```js
    case '/':
      return {
        status: 200,
        body: { message: greet(parsed.searchParams.get('name')), version: APP_VERSION }
      };
```

Keep everything else — including your module 9 `GREETING` logic — exactly as it is. The existing tests only assert on `message`, so they still pass:

```bash
npm test
```

Expected: all tests pass.

### 2. Build v2 and load it into kind

Create a working branch first, then build and load:

```bash
git checkout -b module-10-canary
docker build -t devops-demo-app:v2 .
kind load docker-image devops-demo-app:v2 --name devops-course
```

Expected output from the load ends with a line like:

```text
Image: "devops-demo-app:v2" with ID "sha256:..." not yet present on node "devops-course-control-plane", loading...
```

Your v1 image is already on the node from module 7. Verify both:

```bash
docker exec devops-course-control-plane crictl images | grep devops-demo-app
```

Expected: two lines, one for `v1` and one for `v2`.

### 3. Split the deployment into stable and canary

Rename your existing deployment manifest and rework it as the **stable** track:

```bash
git mv k8s/deployment.yaml k8s/deployment-stable.yaml
```

Edit `k8s/deployment-stable.yaml` to match this (if your module 9 version injects `GREETING` from the ConfigMap, keep that `env`/`envFrom` block in the container spec — it is omitted here for brevity):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-demo-app-stable
spec:
  replicas: 4
  selector:
    matchLabels:
      app: devops-demo-app
      track: stable
  template:
    metadata:
      labels:
        app: devops-demo-app
        track: stable
    spec:
      containers:
        - name: devops-demo-app
          image: devops-demo-app:v1
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 2
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

Now create `k8s/deployment-canary.yaml` — same shape, three differences: name, `track: canary`, image `v2`, and `replicas: 1`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-demo-app-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: devops-demo-app
      track: canary
  template:
    metadata:
      labels:
        app: devops-demo-app
        track: canary
    spec:
      containers:
        - name: devops-demo-app
          image: devops-demo-app:v2
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 2
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

**Why this works:** your Service from module 7 selects `app: devops-demo-app` — and *only* that label. Both deployments' pods carry it, so all 5 pods (4 stable + 1 canary) become endpoints of the same Service. Traffic is spread roughly evenly across endpoints, so about 1 in 5 requests (~20%) hits the canary. The `track` label exists so the two Deployments select *their own* pods without stealing each other's.

### 4. Apply and verify the pod mix

The old Deployment `devops-demo-app` has a different name than the new stable one, so delete it and apply the new manifests:

```bash
kubectl delete deployment devops-demo-app
kubectl apply -f k8s/
kubectl get pods -L track
```

Expected: 5 pods Running — 4 with `TRACK=stable`, 1 with `TRACK=canary`:

```text
NAME                                      READY   STATUS    RESTARTS   AGE   TRACK
devops-demo-app-canary-7c9f6d5b4-xxxxx    1/1     Running   0          15s   canary
devops-demo-app-stable-6b8d9c7f5-xxxxx    1/1     Running   0          15s   stable
... (3 more stable pods)
```

Confirm the Service sees all 5 endpoints:

```bash
kubectl get endpoints devops-demo-app
```

Expected: 5 addresses listed.

### 5. Measure the traffic split

Port-forward the Service and run 20 requests, counting how many were answered by v2 (only v2 responses contain a `version` field):

```bash
kubectl port-forward service/devops-demo-app 8080:80
```

In a second terminal:

```bash
for i in $(seq 1 20); do curl -s http://localhost:8080/; echo; done > /tmp/canary-before.txt
cat /tmp/canary-before.txt
grep -c '"version":"v2"' /tmp/canary-before.txt
```

Expected: around 4 of the 20 lines include `"version":"v2"` (the exact count varies — load-balancing is random, not round-robin; anything from 1 to 8 is normal). Record your count for the deliverables.

### 6. Judge the canary

Before promoting, check that the canary is behaving. Look at its logs by label:

```bash
kubectl logs -l app=devops-demo-app,track=canary --tail=20
```

Expected: normal access log lines (`... GET / 200`), no stack traces, no non-200 statuses for `/`. In module 11 you will replace this manual inspection with Prometheus queries; for now, "no errors in the logs and correct responses via curl" is your promotion criterion.

### 7. Promote v2 to stable

The canary looks healthy, so roll the stable track to v2 (this triggers a normal rolling update of the 4 stable pods):

```bash
kubectl set image deployment/devops-demo-app-stable devops-demo-app=devops-demo-app:v2
kubectl rollout status deployment/devops-demo-app-stable
```

Expected final line:

```text
deployment "devops-demo-app-stable" successfully rolled out
```

The canary has done its job — scale it to zero:

```bash
kubectl scale deployment/devops-demo-app-canary --replicas=0
```

Re-run the curl loop (port-forward may need restarting after pod churn):

```bash
for i in $(seq 1 20); do curl -s http://localhost:8080/; echo; done > /tmp/canary-after.txt
grep -c '"version":"v2"' /tmp/canary-after.txt
```

Expected: `20` — every response is now v2.

### 8. Practice an instant rollback

Pretend v2 turned out to be bad. Undo the stable rollout:

```bash
kubectl rollout undo deployment/devops-demo-app-stable
kubectl rollout status deployment/devops-demo-app-stable
kubectl rollout history deployment/devops-demo-app-stable
```

Verify with a few curls that responses no longer contain `"version":"v2"` (you are back on v1). Then look at the history output — you should see at least revisions for the original v1, the v2 promotion, and the rollback. Save this output for the deliverables.

Finish by rolling forward to v2 again, since v2 is actually fine and later modules use it:

```bash
kubectl set image deployment/devops-demo-app-stable devops-demo-app=devops-demo-app:v2
kubectl rollout status deployment/devops-demo-app-stable
```

### 9. Blue/green write-up

Create `docs/blue-green.md` in your repo and answer, in 150–300 words:

- How would this rollout have looked as a blue/green deployment instead? (Hint: two Deployments again — but the Service selector includes the `track` label, and the cutover is editing the selector from `track: blue` to `track: green`.)
- What would rollback have looked like, and how does its speed compare to `rollout undo`?
- What did canary give you that blue/green would not, and vice versa?
- What resource cost difference is there between the two for this app?

### 10. Commit everything via a PR

```bash
git add app.js k8s/deployment-stable.yaml k8s/deployment-canary.yaml docs/blue-green.md
git rm --cached k8s/deployment.yaml 2>/dev/null || true
git commit -m "Module 10: canary deployment manifests, v2 version field, blue/green notes"
git push -u origin module-10-canary
```

Open a pull request on GitHub, wait for your CI (lint + test) to pass, get it reviewed if your setup requires it, and merge.

## Deliverables

- Curl loop counts: v2 hits out of 20 **before** promotion (~4) and **after** promotion (20)
- Output of `kubectl rollout history deployment/devops-demo-app-stable` showing the promotion and rollback revisions
- `docs/blue-green.md` write-up
- Merged PR containing `app.js` change, both deployment manifests, and the write-up, with green CI

## Troubleshooting

**Canary pod stuck in `ErrImageNeverPull`.**
The v2 image is not on the kind node. Re-run `kind load docker-image devops-demo-app:v2 --name devops-course` and check with `docker exec devops-course-control-plane crictl images | grep devops-demo-app`. Also confirm the manifest tag is exactly `devops-demo-app:v2`.

**`kubectl apply` fails with "field is immutable" on the stable deployment.**
You changed `spec.selector` on an existing Deployment, which Kubernetes forbids. Make sure you deleted the old one first (`kubectl delete deployment devops-demo-app`) — the stable deployment must be created fresh under its new name `devops-demo-app-stable`.

**The curl loop returns 0 v2 responses (or all v2).**
With only 20 samples, skew happens; run 50 (`seq 1 50`). If it is still 0, check the canary pod is Ready (`kubectl get pods -L track`) and listed in `kubectl get endpoints devops-demo-app` — a failing readiness probe removes it from the Service. If *all* responses are v2 before promotion, check that your stable deployment still points at `devops-demo-app:v1`.

**`port-forward` dies with "lost connection to pod".**
Port-forward pins a single pod; rollouts and scaling kill it. Just re-run `kubectl port-forward service/devops-demo-app 8080:80` after any rollout step.

**`kubectl set image` reports "container not found".**
The container name in the command must match the manifest. This lab names the container `devops-demo-app`; if yours differs, use `kubectl get deployment devops-demo-app-stable -o jsonpath='{.spec.template.spec.containers[0].name}'` and substitute it before the `=`.
