# Lab 09: Configuration & Secrets in Practice

## What you will do

Make `devops-demo-app` configurable through the environment: add a `GREETING` variable to the code, wire it through a `.env` file locally, then through a ConfigMap on your kind cluster. Create a Kubernetes Secret, consume it as an environment variable, and decode it to prove base64 is not encryption. Hunt for leaked credentials with gitleaks — including one you plant yourself. As an optional stretch, run a small Ansible playbook twice and observe idempotency. Finish with a pull request.

Estimated time: 90-120 minutes (plus ~20 minutes for the optional Ansible stretch).

## Prerequisites

- [ ] Completed Lab 07 (the `k8s/` manifests are merged in your repo) and Lab 08
- [ ] Docker Desktop running
- [ ] Your kind cluster from Lab 07 still exists (`kind get clusters` shows `devops-course`) — if not, see the note below
- [ ] `kubectl` context set to the kind cluster (`kubectl config use-context kind-devops-course`)
- [ ] Your `devops-demo-app` repository cloned with a clean working tree

> If you deleted the cluster after Lab 07, recreate it now: `kind create cluster --name devops-course`, then `docker build -t devops-demo-app:v1 . && kind load docker-image devops-demo-app:v1 --name devops-course && kubectl apply -f k8s/` and wait for 3/3 Running.

## Steps

### 1. Parameterize the app with a GREETING env var

Open `app.js`. Add a `GREETING` constant near the top (after `requestCount`) and use it in both return paths of `greet`:

```javascript
const startTime = Date.now();
let requestCount = 0;
const GREETING = process.env.GREETING || 'Hello';

function greet(name) {
  if (!name || typeof name !== 'string') {
    return `${GREETING}, world!`;
  }
  return `${GREETING}, ${name.trim()}!`;
}
```

Everything else in the file stays unchanged. This is config layering in one line: environment variable if set, safe default otherwise — the same pattern `server.js` has used for `PORT` since module 1.

The tests in `app.test.js` assert literal strings like `'Hello, world!'`, which still pass with the default — but they would break if `GREETING` were set in the test environment. Make the first test honest about the layering by updating it:

```javascript
test('greet returns default greeting without a name', () => {
  const expected = `${process.env.GREETING || 'Hello'}, world!`;
  assert.strictEqual(greet(), expected);
});
```

Run the tests:

```bash
npm test
# all tests pass
GREETING=Hi npm test
# the updated test still passes; note which of the remaining literal-string tests would fail if they used greet() with no name
```

### 2. .env file hygiene

Create `.env.example` in the repository root (this file IS committed — it documents every variable with safe values):

```bash
# .env.example — copy to .env and adjust; .env itself is never committed
GREETING=Hello
PORT=3000
```

Add the real `.env` to `.gitignore` *before* creating one:

```bash
echo ".env" >> .gitignore
```

Now demonstrate environment-driven behavior without any file at all:

```bash
PORT=4000 GREETING=Hi node server.js
```

In a second terminal:

```bash
curl "http://localhost:4000/?name=Ada"
# {"message":"Hi, Ada!"}
curl http://localhost:4000/
# {"message":"Hi, world!"}
```

Stop the server with Ctrl-C. Same code, different behavior, zero rebuilds — that is factor III.

### 3. ConfigMap on Kubernetes

The image running in your cluster is `v1`, which predates the `GREETING` change, so first build and load a new version:

```bash
docker build -t devops-demo-app:v3 .
kind load docker-image devops-demo-app:v3 --name devops-course
```

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: devops-demo-app-config
data:
  GREETING: "Hnamaste"
```

Now update `k8s/deployment.yaml`: change the image tag and add `envFrom` to the container spec. The container section should read (changed lines marked):

```yaml
      containers:
        - name: app
          image: devops-demo-app:v3          # was: devops-demo-app:v1
          imagePullPolicy: Never
          envFrom:                            # new: inject all ConfigMap keys
            - configMapRef:                   # new
                name: devops-demo-app-config  # new
          ports:
            - containerPort: 3000
```

(Leave the probes and resources exactly as they were.) Apply everything and wait for the rollout:

```bash
kubectl apply -f k8s/
kubectl rollout status deployment/devops-demo-app
```

Port-forward and verify the ConfigMap-driven greeting:

```bash
kubectl port-forward svc/devops-demo-app 8080:80
```

In another terminal:

```bash
curl "http://localhost:8080/?name=Kube"
# {"message":"Hnamaste, Kube!"}
```

The image contains no greeting text — the cluster injected it. Changing the ConfigMap later would require `kubectl rollout restart deployment/devops-demo-app`, because env vars are read at container start.

### 4. A Secret, and why base64 is not encryption

Create a Secret imperatively (no file with the value ever touches your repo):

```bash
kubectl create secret generic demo-secret --from-literal=API_TOKEN=s3cr3t
```

Wire it into the container as an env var. In `k8s/deployment.yaml`, add an `env` section right after the `envFrom` block:

```yaml
          env:
            - name: API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: demo-secret
                  key: API_TOKEN
```

Apply and wait, then prove the value reached the container:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/devops-demo-app
kubectl get pods
kubectl exec -it <any-pod-name> -- sh -c 'echo $API_TOKEN'
# s3cr3t
```

Now the important demonstration. Read the Secret back from the cluster:

```bash
kubectl get secret demo-secret -o yaml
```

```yaml
apiVersion: v1
data:
  API_TOKEN: czNjcjN0
kind: Secret
...
```

Decode it:

```bash
echo czNjcjN0 | base64 -d
# s3cr3t
```

No key, no passphrase — anyone with read access to the Secret object has the plaintext. This is why Secrets need etcd encryption at rest and RBAC, and why real credentials belong in a secret manager.

### 5. Hunt secrets with gitleaks

Install and run a baseline scan on your repository:

```bash
brew install gitleaks
gitleaks detect --source . --verbose
```

Expected on a clean repo:

```text
INF no leaks found
```

Now plant a leak on purpose — on a branch, with a fake key (this is AWS's official documentation example key; it is not a real credential):

```bash
git checkout -b leak-test
cat > deploy-config.sh <<'EOF'
#!/bin/sh
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF
git add deploy-config.sh
git commit -m "Add deploy config (do not do this)"
gitleaks detect --source . --verbose
```

gitleaks reports findings (rule IDs like `aws-access-token`, the file, the commit hash, and the offending line) and exits non-zero. This is what a pre-commit hook or CI job would have blocked.

Clean up — and think about what cleanup means. The commit exists only locally on a throwaway branch, so destroying it actually works here:

```bash
git checkout main   # or your default branch
git branch -D leak-test
gitleaks detect --source . --verbose
# INF no leaks found
```

Had you *pushed* that branch, deleting it would not be remediation: clones and scrapers act within minutes, and the only correct first step for a real credential is immediate rotation.

### 6. Optional stretch: an idempotent Ansible playbook

Install Ansible (`brew install ansible`). Create `ansible/site.yml` in your repository:

```yaml
- name: Configure demo app host
  hosts: localhost
  connection: local
  tasks:
    - name: Ensure config directory exists
      ansible.builtin.file:
        path: /tmp/demo-config
        state: directory
        mode: "0755"

    - name: Write app environment file
      ansible.builtin.copy:
        dest: /tmp/demo-config/app.env
        content: |
          GREETING=Hello from Ansible
          PORT=3000

    - name: Record provisioning timestamp once
      ansible.builtin.command: date +%Y-%m-%dT%H:%M:%S
      args:
        creates: /tmp/demo-config/.provisioned
      register: provision_time

    - name: Persist the provisioning marker
      ansible.builtin.copy:
        dest: /tmp/demo-config/.provisioned
        content: "{{ provision_time.stdout | default('already provisioned') }}\n"
```

Run it twice and compare the recap lines:

```bash
ansible-playbook ansible/site.yml
# PLAY RECAP: localhost ... ok=5 changed=4 ...
ansible-playbook ansible/site.yml
# PLAY RECAP: localhost ... ok=5 changed=0 ...
```

`changed=0` on the second run is idempotency made visible: every task describes a state that already holds, so Ansible does nothing. Note how the `command` task — which is *not* idempotent by nature — was made safe with `creates:`. Verify with `cat /tmp/demo-config/app.env`.

### 7. Commit via PR

```bash
git checkout -b lab-09-config-secrets
git add app.js app.test.js .env.example .gitignore k8s/configmap.yaml k8s/deployment.yaml
git add ansible/ 2>/dev/null || true   # only if you did the stretch
git commit -m "Add environment-driven config, ConfigMap/Secret wiring, and env file hygiene"
git push -u origin lab-09-config-secrets
```

Open a pull request, confirm CI passes (your updated test keeps the suite green), and merge.

## Deliverables

1. `curl` output showing the environment-driven greeting at each layer: local run with `GREETING=Hi` (step 2) and the ConfigMap-driven `{"message":"Hnamaste, Kube!"}` from the cluster (step 3).
2. The secret decode demonstration: the `kubectl get secret demo-secret -o yaml` excerpt and the `base64 -d` output showing plaintext (step 4).
3. gitleaks output: the clean baseline, the findings from the planted key, and the clean scan after cleanup (step 5).
4. The URL of your merged pull request.

## Troubleshooting

**`npm test` fails after the app.js change.** Check that both return paths use the `GREETING` constant and that the backtick template syntax is exact (`` `${GREETING}, world!` ``). If the failing test is the default-greeting one, make sure you replaced its expectation with the `process.env.GREETING || 'Hello'` version from step 1.

**Curl still shows "Hello" instead of "Hnamaste".** Either the Pods are running the old image or the ConfigMap is not wired. Verify the rollout completed (`kubectl rollout status deployment/devops-demo-app`), that the Deployment image is `devops-demo-app:v3` (`kubectl get deployment devops-demo-app -o jsonpath='{.spec.template.spec.containers[0].image}'`), and that you ran `kind load` for the `v3` tag. Then check the env inside a Pod: `kubectl exec <pod> -- sh -c 'echo $GREETING'`.

**Pods stuck in `CreateContainerConfigError`.** The Deployment references a ConfigMap or Secret that does not exist (typo in `name:` or you skipped a create step). `kubectl describe pod <name>` names the missing object; create it or fix the reference and the Pods recover on their own.

**Rollout stuck after adding the Secret.** Same debugging path: `kubectl get pods`, then `describe` the newest Pod. If the Secret name in `secretKeyRef` does not match `demo-secret` exactly, the container cannot start.

**gitleaks reports findings on the baseline scan.** Read them before assuming a false positive — gitleaks scans your full Git history, so a leak from an earlier module lives on even if the file is gone. For a genuinely fake value you committed earlier, add a `.gitleaksignore` entry with the finding's fingerprint; for anything that could be real, treat it as compromised and rotate it.
