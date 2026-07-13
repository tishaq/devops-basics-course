# Quiz 09: Configuration & Secrets Management

Answer all questions. For multiple-choice questions, select the single best answer. For short-answer questions, respond in one to three sentences.

**Q1.** According to the 12-factor methodology (Factor III), where should configuration that varies between environments be stored?

- A. In a constants file compiled into the application
- B. In the environment (environment variables), separate from the code
- C. In the same Git repository as the code, in plaintext
- D. In the container image, one image per environment

**Q2.** Which of the following is the correct `.env` file workflow?

- A. Commit `.env` with real values so teammates can share credentials
- B. Add `.env` to `.gitignore` before creating it, and commit a `.env.example` with placeholder values as documentation
- C. Commit `.env` but delete it with `git rm` before each release
- D. Encrypt `.env` with base64 before committing it

**Q3.** Short answer: A developer accidentally commits an API key, pushes to a public repository, and then immediately deletes the file in a follow-up commit. Why is the key still compromised, and what is the correct first action?

**Q4.** What is the primary difference between a Kubernetes ConfigMap and a Secret?

- A. ConfigMaps are encrypted; Secrets are not
- B. Secrets can only hold one key; ConfigMaps can hold many
- C. They are mechanically similar key-value objects, but Secrets are a separate type intended for sensitive data so access control (RBAC) can treat them differently
- D. ConfigMaps can be mounted as environment variables; Secrets cannot

**Q5.** You run `kubectl get secret demo-secret -o yaml` and see `API_TOKEN: czNjcjN0`. What protection does this base64 representation provide?

- A. Strong encryption, breakable only with the cluster's private key
- B. Hashing — the original value cannot be recovered
- C. None — base64 is a reversible encoding, and anyone who can read the object can decode the plaintext with `base64 -d`
- D. Encryption at rest, but only inside etcd

**Q6.** Short answer: Name two measures that actually harden Kubernetes Secrets beyond their default state.

**Q7.** In HashiCorp Vault, what is a *dynamic secret*?

- A. A secret whose base64 encoding changes on every read
- B. A credential Vault generates on demand for a requester, with a lease (TTL) after which it is automatically revoked
- C. A secret replicated dynamically across all clusters
- D. An environment variable injected by the Vault agent

**Q8.** Why is regular secret rotation valuable even when no leak is known?

- A. It reduces storage costs in the secret manager
- B. It limits the window during which any undetected leak remains exploitable
- C. It is required for base64 encoding to remain valid
- D. It improves application performance

**Q9.** In Ansible terms, which line correctly matches concept to meaning?

- A. Inventory: the list of hosts to manage; playbook: YAML declaring tasks for hosts; module: the code implementing a task type
- B. Inventory: the encrypted variables file; playbook: the list of hosts; module: a reusable Terraform component
- C. Inventory: the audit log; playbook: the agent installed on each host; module: a Kubernetes object
- D. Inventory: the SSH key store; playbook: a single shell command; module: a Docker image

**Q10.** Short answer: You run an Ansible playbook twice in a row without changing anything, and the second run reports `changed=0`. What property does this demonstrate, and why does the `ansible.builtin.command` module need special handling (such as `creates:`) to preserve it?

---

## Answer Key

**Q1.** B — Factor III prescribes storing config in environment variables, which are language-agnostic, injectable by any orchestrator, and cannot be accidentally committed.

**Q2.** B — The ignore rule comes first so no window exists for an accidental commit, and `.env.example` documents the expected variables with harmless values.

**Q3.** Git history is forever: every clone and fork retains the commit containing the key, and automated scanners harvest pushed secrets within minutes, so deletion changes nothing. The correct first action is to rotate (invalidate and replace) the key immediately; history cleanup is hygiene, not remediation.

**Q4.** C — Secrets and ConfigMaps are consumed the same ways; the separate Secret type exists so sensitive data can get distinct RBAC rules, encryption at rest, and handling policies.

**Q5.** C — base64 is a transport encoding, not encryption; it is reversible by anyone without any key, so reading the object is equivalent to reading the plaintext.

**Q6.** Any two of: enable encryption at rest for etcd; restrict `get`/`list` on Secrets with RBAC; scope each workload to only its own Secrets (least privilege); keep real Secret values out of Git (use a secret manager, sealed-secrets, or SOPS).

**Q7.** B — Vault mints fresh credentials (for example, a new database user) per request, bound to a lease; when the lease expires, Vault revokes the credential automatically, so leaked credentials age out.

**Q8.** B — Rotation caps the useful lifetime of any credential, so a leak that went unnoticed stops being exploitable at the next rotation instead of persisting for years.

**Q9.** A — Inventory lists the managed hosts, a playbook maps hosts to ordered tasks, each task's behavior is implemented by a module such as `file` or `copy`.

**Q10.** It demonstrates idempotency: tasks describe desired state, and when reality already matches, Ansible changes nothing. The `command` module just runs a program, which Ansible cannot know is safe to skip, so a guard like `creates:` (skip if this file exists) is needed to make it state-aware.
