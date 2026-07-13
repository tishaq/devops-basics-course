# Quiz 08: Infrastructure as Code

Answer all questions. For multiple-choice questions, select the single best answer. For short-answer questions, respond in one to three sentences.

**Q1.** Which statement best captures the difference between declarative and imperative infrastructure management?

- A. Declarative tools are graphical; imperative tools are command-line
- B. Declarative code describes the desired end state and the tool computes the steps; imperative code specifies the sequence of steps itself
- C. Declarative tools only work in the cloud; imperative tools only work on-premises
- D. Imperative code is version-controlled; declarative code is not

**Q2.** A configuration is *idempotent* if:

- A. It can only be applied by one person at a time
- B. Applying it a second time, with no changes to code or infrastructure, results in no changes
- C. It destroys and recreates all resources on every apply
- D. It requires no variables

**Q3.** In a `terraform plan`, a resource is prefixed with `-/+`. What does this mean?

- A. The resource will be updated in place
- B. The resource will be imported into state
- C. The resource will be destroyed and then recreated, because some change cannot be applied in place
- D. The plan contains a syntax error

**Q4.** Short answer: In the lab, changing the container's `external` port produced a `-/+` plan rather than a `~` plan. Why?

**Q5.** What is the primary purpose of the `terraform.tfstate` file?

- A. It caches provider plugins so `init` runs faster
- B. It maps the resources in your code to the real-world objects Terraform created, enabling `plan` to diff code against reality
- C. It stores the history of all previous plans for auditing
- D. It defines which team members may run `apply`

**Q6.** Which of the following is the correct set of state-hygiene rules?

- A. Hand-edit state to fix mistakes; commit it so teammates stay in sync
- B. Never hand-edit state; never commit it to Git when it may contain secrets; use remote backends with locking for team use
- C. Delete the state file after every apply to keep the repository clean
- D. Encrypt the state file and commit it to a public repository

**Q7.** Short answer: Why do remote state backends implement *locking*? Describe the failure that locking prevents.

**Q8.** Which pairing correctly matches tools to their primary category?

- A. Terraform: configuration management; Ansible: provisioning
- B. Terraform: provisioning; Ansible: configuration management
- C. Both Terraform and Ansible are provisioning tools with identical scope
- D. CloudFormation: configuration management; Pulumi: monitoring

**Q9.** Someone deletes a Terraform-managed container manually with `docker rm -f`. What does the next `terraform plan` show, and why?

- A. No changes, because the code did not change
- B. An error, because state no longer matches reality
- C. One resource to add, because Terraform refreshes state against real infrastructure, detects the drift, and proposes to restore the declared state
- D. One resource to destroy, because Terraform adopts the manual change as the new desired state

**Q10.** Short answer: In the lab, the Docker image was referenced with a `data "docker_image"` block instead of a `resource` block. What is the general difference between `data` and `resource` in Terraform?

---

## Answer Key

**Q1.** B — Declarative IaC states the end result and delegates the how; imperative scripting encodes the how step by step.

**Q2.** B — Idempotency means re-applying unchanged code is a safe no-op ("No changes"), which is what makes automated retries safe.

**Q3.** C — `-/+` is replacement: the change cannot be made in place, so Terraform destroys the resource and creates a new one, implying possible downtime or data loss.

**Q4.** Docker cannot change the published ports of an existing container, so the provider marks the port attribute as "forces replacement"; Terraform must destroy the container and create a new one with the new port.

**Q5.** B — State is Terraform's memory of what it created (IDs and attributes); without it, Terraform could not know which real objects correspond to which code blocks.

**Q6.** B — No hand edits (corruption risk), no commits (state often contains secrets in plain text), and remote backends with locking for shared use.

**Q7.** Locking ensures only one `apply` runs at a time against a given state; without it, two concurrent applies would both read and write the same state file, race each other, and corrupt it so state no longer matches reality.

**Q8.** B — Terraform provisions infrastructure (creates VMs, networks, clusters); Ansible configures what runs inside machines (packages, files, services).

**Q9.** C — `plan` refreshes state against real infrastructure, notices the container is missing, and proposes `1 to add` to restore the declared configuration; `apply` heals the drift.

**Q10.** A `resource` block gives Terraform ownership of an object's full lifecycle (create, update, destroy), while a `data` block is a read-only lookup of something managed elsewhere — here, the image built by hand in module 6.
