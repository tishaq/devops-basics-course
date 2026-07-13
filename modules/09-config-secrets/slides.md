---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 09: Configuration & Secrets Management"
---

<!-- _class: lead -->

# Configuration & Secrets Management

## Module 09

Same code everywhere; different config everywhere; secrets nowhere near Git.

---

# Where We Are

- Module 07: the app runs on Kubernetes; module 08: infra is code
- One question keeps recurring: **where do settings and credentials live?**
- Today: config vs code, ConfigMaps and Secrets, Vault and friends,
  what to do when a secret leaks — plus a first look at **Ansible**

<!-- Point out that this question has been lurking since module 6: the Dockerfile has no password in it for good reason, and Terraform state turned out to hold secrets. This module gives the systematic answer. The Ansible section also pays the debt from module 8, where we deferred configuration management. -->

---

<!-- _class: section-divider -->

# Section 1

## Config vs Code

---

# What Counts as Config?

- Anything that **varies between environments** while code stays identical:
  - URLs and hostnames of databases and APIs
  - Ports and bind addresses
  - Feature flags
  - Credentials: passwords, API tokens, keys
- Litmus test: could you open source the code right now without leaking anything?

<!-- The litmus test is from the 12-factor site and works remarkably well in code review. If publishing the repo would expose a credential or an internal hostname, that value is config and does not belong in code. Note that credentials are config with an extra property — secrecy — which the second half of the module addresses. -->

---

# 12-Factor, Factor III

- "Store config in the **environment**"
- Environment variables are:
  - Language- and OS-agnostic
  - Impossible to accidentally commit
  - Easy for orchestrators to inject (Compose, Kubernetes)
- Our app has done this since day one:

```javascript
const PORT = process.env.PORT || 3000;
```

<!-- The 12-factor app methodology distilled Heroku's operational experience; factor III is the most broadly adopted. Env vars are the lowest common denominator every language and platform understands. The PORT line has been in server.js since module 1 — today students extend the same pattern with a GREETING variable. -->

---

# Config Layering

- Typical precedence, weakest to strongest:
  1. **Defaults in code** — safe values, app runs out of the box
  2. **Per-environment config** — files or ConfigMaps per env
  3. **Environment variables** — injected at deploy time
- Each layer overrides the one below

```javascript
const GREETING = process.env.GREETING || 'Hello';
```

<!-- The || fallback pattern implements two layers in one line: env var if present, default otherwise. Defaults matter for developer experience — a fresh clone should run with zero setup. The middle layer appears in Kubernetes as ConfigMaps, one per environment, applied by the pipeline. -->

---

# .env Files

- Local convenience: a file of `KEY=value` pairs loaded into the environment

```bash
# .env — local only, never committed
GREETING=Hi
PORT=4000
```

- Commit a **`.env.example`** with dummy values as documentation
- Add the real `.env` to `.gitignore` — always, first, before creating it

<!-- The workflow to teach: .env.example is committed and lists every variable the app understands with safe placeholder values; each developer copies it to .env and fills in real values; .gitignore keeps .env out of Git. The order matters — add the ignore rule before the file exists, so there is no window for an accidental commit. -->

---

# Git History Is Forever

- `git rm .env` does **not** remove it from history — every clone has every commit
- The classic incident pattern: key committed, repo pushed, bots find it in **minutes**, cloud bill or breach follows
- Defenses:
  - Secret scanners: **gitleaks**, GitHub secret scanning, pre-commit hooks
  - Assume any committed secret is compromised — rotate, do not just delete

<!-- Attackers run continuous scanners against public GitHub; the time from push to exploitation of an AWS key is measured in minutes, and this pattern has produced years of incident reports. History rewriting exists but forks, clones, and caches survive it. The lab has students run gitleaks and catch a planted fake key themselves. -->

---

<!-- _class: section-divider -->

# Section 2

## Config and Secrets in Kubernetes

---

# ConfigMap: Non-Secret Config

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: devops-demo-app-config
data:
  GREETING: "Hnamaste"
```

- Key-value config stored in the cluster, decoupled from the image
- Same image runs in dev and prod with different ConfigMaps
- Create from YAML (reviewable) or `kubectl create configmap --from-literal`

<!-- ConfigMaps complete the 12-factor story on Kubernetes: image is code, ConfigMap is config, and they meet only at deploy time. Prefer YAML manifests in Git over imperative creation, since config changes deserve the same review as code changes. This exact manifest appears in the lab. -->

---

# Consuming Config: envFrom and valueFrom

```yaml
containers:
  - name: app
    envFrom:                      # all keys become env vars
      - configMapRef:
          name: devops-demo-app-config
    env:
      - name: GREETING            # or: one specific key
        valueFrom:
          configMapKeyRef:
            name: devops-demo-app-config
            key: GREETING
```

<!-- Two consumption styles: envFrom imports every key in the ConfigMap as an environment variable — concise, used in the lab; valueFrom cherry-picks and can rename. ConfigMaps can also be mounted as files for apps that read config files. Note that env vars are read at container start, so a ConfigMap change requires a rollout restart to take effect. -->

---

# Kubernetes Secrets

```bash
kubectl create secret generic demo-secret \
  --from-literal=API_TOKEN=s3cr3t
```

```yaml
env:
  - name: API_TOKEN
    valueFrom:
      secretKeyRef:
        name: demo-secret
        key: API_TOKEN
```

- Same consumption patterns as ConfigMaps
- Separate object type → separate access control

<!-- Mechanically, Secrets are ConfigMaps with a different kind and a marketing problem. The separate type exists so RBAC can treat them differently — you can allow reading ConfigMaps but not Secrets. Prefer imperative creation or external tooling over YAML in Git, because a Secret manifest in Git is a leaked secret. -->

---

# base64 Is Not Encryption

```bash
kubectl get secret demo-secret -o yaml
#   API_TOKEN: czNjcjN0
echo czNjcjN0 | base64 -d
# s3cr3t
```

- base64 is an **encoding** — reversible by anyone, no key required
- Anyone who can read the Secret object has the plaintext
- Secret ≠ secure by default

<!-- This slide destroys the most dangerous misconception in Kubernetes security. base64 exists so binary values survive JSON and YAML transport; it provides zero confidentiality. The lab has students decode their own secret in one command to make the point unforgettable. -->

---

# Hardening Kubernetes Secrets

- **Encryption at rest**: by default, Secrets sit in etcd unencrypted (managed clouds usually enable envelope encryption)
- **RBAC**: restrict `get`/`list` on Secrets to the workloads and people who need them
- **Least privilege**: each app reads only its own Secrets
- Never write Secret manifests with real values into Git

<!-- Three layers: encrypt etcd so a stolen backup is not a total loss, use RBAC so cluster read access does not equal secret access, and scope narrowly. Managed offerings such as GKE and EKS encrypt at rest by default, self-managed clusters must configure it. The Git rule leads directly into the next section — so where do secrets live? -->

---

<!-- _class: section-divider -->

# Section 3

## Real Secret Management

---

# Why a Secret Manager?

- Env vars and Kubernetes Secrets *deliver* secrets; they do not *manage* them
- Unanswered questions:
  - Who accessed this credential, and when?
  - How do we rotate it everywhere at once?
  - How do we grant a credential for one hour, not forever?
- Dedicated systems answer all three

<!-- Frame the gap: delivery mechanisms move a secret into a process, but the lifecycle — issuance, audit, rotation, revocation — is unmanaged. At small scale people compensate manually; at organization scale that fails silently until an incident. This motivates Vault and the cloud services on the next slides. -->

---

# HashiCorp Vault: Concepts

- **Central store**: one encrypted, authenticated place for all secrets
- **Dynamic secrets**: Vault *creates* credentials on demand
  - e.g. a database user generated per request
- **Leases**: every dynamic secret has a TTL; expired = revoked automatically
- **Audit log**: every read and write recorded — who, what, when

<!-- Dynamic secrets are the paradigm shift worth dwelling on: instead of guarding one long-lived database password, Vault mints short-lived credentials per consumer and revokes them on lease expiry. A leaked credential that expired an hour ago is a non-event. The audit log turns "who knew this secret" from unanswerable to a query. -->

---

# Cloud Secret Managers

| Service | Platform | Notes |
| --- | --- | --- |
| AWS Secrets Manager | AWS | Rotation lambdas, IAM-integrated |
| GCP Secret Manager | Google Cloud | Versioned secrets, IAM-integrated |
| Azure Key Vault | Azure | Secrets, keys, and certificates |

- Managed, IAM-integrated, audited — less powerful than Vault, far less to operate
- Apps fetch at startup or via CSI/operator integration in Kubernetes

<!-- The pragmatic default for teams already on one cloud: no servers to run, access control rides the IAM you already manage, audit trails come free. Vault wins for multi-cloud and dynamic secrets; cloud managers win on operational simplicity. Either beats a spreadsheet of passwords, which is the real competition. -->

---

# Secrets for GitOps: Sealed Secrets and SOPS

- GitOps (module 10) wants *everything* in Git — but never plaintext secrets
- **sealed-secrets**: encrypt with the cluster's public key; only the in-cluster controller can decrypt; the SealedSecret YAML is safe to commit
- **SOPS**: encrypts *values* in YAML/JSON files (keys stay readable) using KMS or age keys — diffs stay reviewable

```bash
kubeseal < secret.yaml > sealed-secret.yaml   # safe for Git
```

<!-- These tools resolve the tension between "Git is the source of truth" and "no secrets in Git" by committing ciphertext. Sealed-secrets binds decryption to one cluster's private key; SOPS is more general and keeps YAML structure visible so reviews still work. Students only need the concept now — module 10 uses it. -->

---

# Secret Rotation

- **Rotation** = replacing a credential with a new one on a schedule or on demand
- Why: limits the blast radius window of any undetected leak
- Ranked by preference:
  1. Dynamic short-lived credentials (rotation is automatic)
  2. Automated rotation (e.g. Secrets Manager rotation functions)
  3. Scheduled manual rotation (calendar-driven, error-prone)
- Design apps to re-read credentials without redeploys where possible

<!-- Rotation is the habit that turns leaks from catastrophes into inconveniences. The hierarchy matters: the best rotation is the kind nobody performs, which is the dynamic-secrets model again. Warn that rotation reveals hidden coupling — the first rotation ever attempted usually finds three services with the password hard-coded. -->

---

# When a Secret Leaks

1. **Rotate immediately** — the new value invalidates the old one
2. **Revoke** active sessions/tokens derived from it
3. **Audit**: what did the credential access while exposed?
4. Only then: clean Git history (`git filter-repo`) — hygiene, not remediation
- Deleting the file or rewriting history is **never enough**: clones, forks, caches, and scrapers already have it

<!-- Drill the order: rotation first, always, within minutes. Students instinctively reach for history rewriting, which fights the artifact instead of the exposure — assume a pushed secret was harvested the moment it landed. The audit step is the one organizations skip and regret during disclosure. -->

---

# Principle of Least Privilege

- Every credential should grant the **minimum** access required
  - Read-only where read-only suffices
  - Scoped to one database, one bucket, one namespace
- Applies to humans, apps, and CI pipelines alike
- Why it matters here: a leaked narrow credential is a contained incident; a leaked admin credential is a company-wide one

<!-- Least privilege is damage control decided in advance: scope determines blast radius before any leak happens. Concrete examples land best — the metrics dashboard needs SELECT on one schema, not db-owner; CI needs push to one registry repo, not org admin. Tie back to RBAC on Secrets from earlier. -->

---

<!-- _class: section-divider -->

# Section 4

## Ansible: Configuration Management

---

# Ansible in the Landscape

- Module 08 distinction: Terraform **provisions**, Ansible **configures**
- Ansible: agentless — connects over SSH (or locally), pushes desired state
- Written in YAML **playbooks**; no software to install on targets
- Sweet spot: VMs, bare metal, network devices — anywhere without an orchestrator

<!-- Reconnect to module 8's provisioning-versus-configuration split: Terraform makes the VM exist, Ansible makes it correct inside. Agentless is the adoption superpower — if you can SSH to it, you can manage it. In containerized stacks Ansible matters less for app deployment but persists for VM fleets and network gear. -->

---

# Ansible Vocabulary

| Term | Meaning |
| --- | --- |
| **Inventory** | The list of hosts to manage (file or dynamic) |
| **Playbook** | YAML file: which hosts, which tasks, in order |
| **Task** | One unit of desired state ("this package is installed") |
| **Module** | The code that implements a task (`copy`, `file`, `apt`, ...) |

- Tasks are **idempotent**: they describe state, not actions

<!-- Four terms unlock all Ansible documentation. The naming collision on "module" is unfortunate — an Ansible module is a task implementation, nothing to do with Terraform modules or course modules. Idempotency is the through-line again: a task says "line present in file", not "append line". -->

---

# A Small Playbook

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
        content: "GREETING=Hello from Ansible\n"
```

<!-- Read it aloud top to bottom — YAML playbooks are nearly self-documenting, which is much of Ansible's appeal. Each task names a module (file, copy) and declares the state it ensures. This exact playbook is the optional stretch exercise in the lab, run against localhost so no remote host is needed. -->

---

# Ansible Idempotency and ansible-vault

- First run: `changed=2` — Ansible made reality match
- Second run: `changed=0` — already compliant, nothing done
- **ansible-vault**: encrypt variable files so playbooks can ship secrets safely

```bash
ansible-vault encrypt group_vars/prod/secrets.yml
ansible-playbook site.yml --ask-vault-pass
```

- Same theme: secrets encrypted at rest, decrypted only at use time

<!-- The changed counter is Ansible's idempotency made visible, and the lab has students run the playbook twice to watch it drop to zero. ansible-vault closes the loop with the secrets half of this module: encrypted files can live in Git, keys stay out. Compare with SOPS — same idea, different ecosystem. -->

---

# Summary

- Config is whatever varies between environments; store it in the environment (12-factor III), layer defaults → files → env vars
- `.env` stays out of Git; `.env.example` documents; scanners (gitleaks) catch mistakes
- ConfigMaps for plain config; Secrets are base64-**encoded**, not encrypted — harden with encryption at rest and RBAC
- Real management: Vault (dynamic secrets, leases, audit) or cloud secret managers; sealed-secrets/SOPS for GitOps
- Leak response: rotate first, then revoke, audit, and only then clean history
- Ansible: agentless, idempotent configuration management; ansible-vault for its secrets

<!-- Six threads, one principle: separate what varies from what does not, and give secrets a managed lifecycle instead of a hiding place. If students retain two reflexes, make them "gitignore .env before creating it" and "rotate first when a leak happens". The lab exercises every thread except Vault, which needs organizational context. -->

---

# Next Up

- **Lab 09**: parameterize the app with a `GREETING` env var, wire a ConfigMap and a Secret into your kind cluster, decode the Secret to prove the base64 point, hunt secrets with gitleaks, and (stretch) run an idempotent Ansible playbook — then PR
- **Module 10: Continuous Delivery & Deployment Strategies** — blue/green, canary on Kubernetes, and GitOps

<!-- The lab touches every layer from process.env in Node to Kubernetes Secrets, so budget the full session. The gitleaks exercise plants a fake AWS key on a branch and catches it — safe, memorable, and exactly the failure the tools exist for. Module 10 builds on this cluster and this config setup for canary deployments. -->
