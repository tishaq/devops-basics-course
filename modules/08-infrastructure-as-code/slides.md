---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 08: Infrastructure as Code"
---

<!-- _class: lead -->

# Infrastructure as Code

## Module 08

If it is not in version control, it does not exist.

---

# Where We Are

- Module 07: we *declared* app state in YAML and Kubernetes reconciled it
- But who creates the clusters, networks, databases, DNS records?
- Today: apply the same declarative idea to **infrastructure itself**
- Tool of choice: **Terraform** (and its open-source fork, OpenTofu)

<!-- Bridge from last week: students already experienced declarative desired state with Kubernetes manifests. Point out the gap — someone still clicked or scripted the cluster into existence. IaC closes that gap by describing infrastructure in reviewable, versioned code. -->

---

<!-- _class: section-divider -->

# Section 1

## The Problem with ClickOps

---

# ClickOps: How Infrastructure Goes Wrong

- "ClickOps": provisioning by clicking through web consoles
- Fast for one server; catastrophic at ten
- Nobody remembers *which* boxes were ticked six months ago
- The only documentation is a person's memory

<!-- Ask who has set up a server or cloud resource through a web console — most hands go up. It feels productive, and that is the trap: every click is an undocumented, unrepeatable decision. The pain arrives months later when the resource must be recreated or audited. -->

---

# Snowflake Servers

- A **snowflake server**: unique, hand-crafted, impossible to reproduce
- Built by years of SSH sessions, hotfixes, and "temporary" tweaks
- Nobody dares to touch it, patch it, or reboot it
- The opposite of what module 6-7 taught: disposable, reproducible units

<!-- The term is Martin Fowler's: like a snowflake, no two are alike. The fear factor is the tell — if rebooting a machine is scary, you have a snowflake. Containers solved this for the app layer; IaC solves it for everything underneath. -->

---

# Config Drift and Missing Audit Trails

- **Drift**: environments diverge from their intended setup over time
  - Manual hotfix in prod, never applied to staging
  - "Works in staging" stops meaning anything
- No audit trail: who changed the firewall rule? When? Why?
- Unreproducible environments make disaster recovery a gamble

<!-- Drift is the slow-motion version of the snowflake problem: staging and production start identical and quietly diverge. Without an audit trail, incident reviews turn into archaeology. Recovery is the sharpest framing: if the region burned down today, could you rebuild by Friday? -->

---

<!-- _class: section-divider -->

# Section 2

## IaC Principles and the Tool Landscape

---

# IaC Principles

- **Declarative over imperative**: describe the end state, not the steps
- **Idempotent**: applying the same code twice changes nothing the second time
- **Version-controlled**: infra lives in Git — history, blame, revert
- **Reviewed**: infrastructure changes go through pull requests, like code

<!-- These four principles are the module in one slide. Idempotency is the one students find newest: terraform apply run twice must report "no changes", which they will verify by hand in the lab. Code review for infra means a firewall change gets the same scrutiny as an app change. -->

---

# Mutable vs Immutable Infrastructure

| | Mutable ("pets") | Immutable ("cattle") |
| --- | --- | --- |
| Change by | SSH in and modify | Replace with a new instance |
| Identity | Named, nursed back to health | Numbered, replaced on failure |
| Drift risk | High | Near zero |
| Example | Hand-patched VM | Container image, VM image |

<!-- The pets-versus-cattle metaphor sticks: you heal a sick pet, you replace sick cattle. Immutable infrastructure sidesteps drift because nothing is ever modified in place — a new artifact is built and the old one destroyed. Students already practice this: they never patch a running container, they build a new image. -->

---

# Provisioning vs Configuration

- **Provisioning**: create the infrastructure itself
  - Networks, VMs, clusters, databases, DNS
  - Terraform, OpenTofu, CloudFormation, Pulumi
- **Configuration management**: set up what is *inside* machines
  - Packages, files, users, services
  - Ansible, Chef, Puppet
- Often combined: Terraform creates the VM, Ansible configures it

<!-- This distinction prevents endless tool confusion. Terraform answers "does this VM exist"; Ansible answers "does nginx run on it with this config". With immutable infrastructure the configuration step increasingly moves into image builds, but both categories remain. Ansible gets a proper introduction in module 9. -->

---

# The Tool Landscape

| Tool | Category | Notes |
| --- | --- | --- |
| Terraform / OpenTofu | Provisioning | Declarative HCL, any provider; our choice |
| CloudFormation / Bicep | Provisioning | Vendor-specific (AWS / Azure) |
| Pulumi / CDK | Provisioning | Real languages (TypeScript, Python, Go) |
| Ansible | Configuration | Agentless, YAML playbooks (module 9) |

<!-- Terraform's superpower is the provider ecosystem: one language and workflow across AWS, GCP, Azure, GitHub, Kubernetes, and — as in our lab — plain Docker. OpenTofu is the open-source drop-in fork; everything in this module applies to both. Pulumi and CDK trade HCL for general-purpose languages, appealing to developers, at the cost of a larger footgun surface. -->

---

<!-- _class: section-divider -->

# Section 3

## Terraform Core Concepts

---

# HCL: The Language

```hcl
resource "docker_container" "app" {
  name  = "devops-demo-app"
  image = docker_image.app.image_id
}
```

- **HCL** (HashiCorp Configuration Language): blocks, arguments, expressions
- Block = `type "labels" { arguments }`
- References like `docker_image.app.image_id` create dependencies
- Terraform orders operations from the dependency graph — no manual sequencing

<!-- Decode the block anatomy once, slowly: block type, two labels (resource type, local name), then arguments. The reference expression is the important part — Terraform builds a dependency graph from references and derives execution order itself. Students never write "step 1, step 2". -->

---

# Providers

```hcl
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}
```

- A **provider** is a plugin that talks to one API (AWS, Docker, GitHub, ...)
- Pinned by source and version; downloaded by `terraform init`

<!-- Providers are how one tool manages hundreds of platforms: each provider translates HCL resources into API calls. Version pinning with ~> allows patch releases but blocks breaking majors — the same discipline as package.json. The lab uses the Docker provider so nobody needs a cloud account or a credit card. -->

---

# Resources

```hcl
resource "docker_container" "app" {
  name  = "devops-demo-app-tf"
  image = docker_image.app.image_id
  ports {
    internal = 3000
    external = 3001
  }
}
```

- A **resource** = one piece of infrastructure Terraform owns and manages
- Terraform creates it, updates it, and destroys it

<!-- Resources are the heart of every configuration — each block maps to one real object whose full lifecycle Terraform owns. "Owns" is worth stressing: if you also modify the object by hand, you create drift, which we demonstrate in the lab. The ports block here is the IaC version of docker run -p 3001:3000. -->

---

# Data Sources

```hcl
data "docker_image" "existing" {
  name = "nginx:1.27-alpine"
}
```

- **Read-only** lookups of things Terraform does *not* manage
- `resource` = "I own this"; `data` = "I look this up"
- Typical uses: existing networks, AMIs, DNS zones owned by another team

<!-- Data sources answer "how do I reference infrastructure created elsewhere". The keyword difference carries the meaning: resource blocks manage lifecycle, data blocks only read. In real organizations most configurations mix both, since no single team owns everything. -->

---

# Variables and tfvars

```hcl
variable "external_port" {
  description = "Host port for the app container"
  type        = number
  default     = 3001
}
```

- Reference as `var.external_port`
- Set via: default → `terraform.tfvars` file → `-var` flag → `TF_VAR_*` env
- Same code, different values = different environments

<!-- Variables turn a hard-coded configuration into a reusable template. Walk the precedence: defaults are the fallback, terraform.tfvars is the conventional per-environment file, -var and environment variables win for one-offs and CI. In the lab students change the external port through a variable and watch the plan react. -->

---

# Outputs

```hcl
output "endpoint" {
  description = "Base URL of the running app"
  value       = "http://localhost:${var.external_port}"
}
```

- Printed after `apply`; queried with `terraform output`
- The public interface of a configuration or module
- Downstream automation reads outputs instead of guessing names

<!-- Outputs are the return values of your configuration. After apply, students see the endpoint URL printed and can curl it immediately without hunting for the port. When configurations are composed as modules, outputs of one become inputs of another. -->

---

<!-- _class: section-divider -->

# Section 4

## Workflow, Plan, and State

---

# The Core Workflow

```bash
terraform init      # download providers, set up backend and lock file
terraform plan      # preview: what would change?
terraform apply     # execute the plan (asks for confirmation)
terraform destroy   # tear everything down
```

- `init` once per project (and after provider changes)
- `plan` before every `apply` — always read it

<!-- Four commands cover the whole lifecycle. init creates the .terraform directory and the .terraform.lock.hcl file, which is committed so everyone resolves identical provider versions. Build the habit now: never apply a plan you have not read — in production, that plan is the change request. -->

---

# Reading a Plan

```text
Plan: 2 to add, 1 to change, 1 to destroy.
```

| Symbol | Meaning | Risk |
| --- | --- | --- |
| `+` | Create | Low |
| `~` | Update in place | Medium |
| `-` | Destroy | High — read twice |
| `-/+` | Destroy, then recreate | High — downtime, data loss |

<!-- The plan is a diff for reality, and these four symbols are its vocabulary. Train students to scan for minus signs first: a destroy hiding in a routine plan is how databases get deleted. -/+ replacement happens when a change cannot be made in place, such as our container's port change in the lab. -->

---

# State: Terraform's Memory

- `terraform.tfstate`: JSON mapping your code to real-world resource IDs
- How Terraform knows what it created, so plan can diff code vs reality
- May contain **secrets in plain text** (passwords, keys)
- Inspect safely:

```bash
terraform state list
terraform state show docker_container.app
```

<!-- Without state, Terraform could not know that resource "app" is container ID abc123 — it would recreate everything each apply. The plan compares three things: your code, the state, and real infrastructure. Because provider attributes land in state verbatim, treat the file as sensitive even when your code looks harmless. -->

---

# State Hygiene

- **Never hand-edit** `terraform.tfstate` — corruption means Terraform loses track of reality
- **Never commit state** to Git if it can contain secrets (it usually can)

```gitignore
.terraform/
*.tfstate*
```

- Use `terraform state ...` subcommands for the rare surgical fix

<!-- Two rules, both absolute for this course: no hand-editing, no committing. A corrupted state file can orphan real infrastructure or cause duplicate creation. The gitignore entries go into the lab repo this week; in teams, state does not belong on laptops at all — next slide. -->

---

# Remote State and Locking

- Team reality: state must be **shared** and **protected**
- Remote backends: S3 + DynamoDB, GCS, Azure Blob, Terraform Cloud
- **Locking**: one `apply` at a time — two concurrent applies corrupt state
- Backends also give encryption at rest and state versioning

```hcl
terraform {
  backend "s3" {
    bucket = "acme-terraform-state"
    key    = "demo-app/terraform.tfstate"
  }
}
```

<!-- The failure mode motivating this: two engineers apply simultaneously, both writes race, and state no longer matches reality. Remote backends centralize the file; locking serializes access. In the lab we use local state because we work alone, but students should know the local file is training wheels. -->

---

# Drift Detection

- **Drift**: reality changed outside Terraform (console click, manual delete)
- `terraform plan` detects it: refreshes state against real infrastructure
- The plan then proposes to restore the declared state
- `apply` heals the drift — reconciliation, on demand

```bash
docker rm -f devops-demo-app-tf   # simulate out-of-band change
terraform plan                    # "1 to add" — drift detected
terraform apply                   # healed
```

<!-- This is the Kubernetes reconciliation loop again, with one difference: Terraform reconciles when you run plan or apply, not continuously. The lab makes this visceral — students delete their container behind Terraform's back and watch plan notice and apply repair it. Many teams schedule terraform plan in CI purely as a drift alarm. -->

---

# Modules: Reusable Infrastructure

```hcl
module "web_service" {
  source        = "./modules/web-service"
  image         = "devops-demo-app:v1"
  external_port = 3001
}
```

- A module = a directory of `.tf` files with variables in, outputs out
- Write once ("web service with container, network, ports"), reuse everywhere
- Public registry: registry.terraform.io

<!-- Modules are functions for infrastructure: inputs are variables, outputs are outputs, the body is resources. Every Terraform directory is technically already a module — the "root module". Teams standardize golden patterns this way, and the public registry offers vetted modules for common shapes like VPCs. -->

---

# Workspaces and Environments

- One codebase, several isolated state files: `dev`, `staging`, `prod`

```bash
terraform workspace new staging
terraform workspace select staging
```

- Alternative (often preferred at scale): one directory per environment with shared modules
- Either way: same reviewed code path to every environment

<!-- Keep this brief — the goal is awareness, not mastery. Workspaces switch state files under one configuration; many teams instead use per-environment directories composed from the same modules, which makes differences explicit. The principle to retain: production is created by the same reviewed code as staging. -->

---

# Terraform in CI

- Infra changes follow the same PR discipline as app code:
  - **On pull request**: run `terraform plan`, post the plan as a PR comment
  - **On merge**: run `terraform apply` from the pipeline
- Humans review the *plan*, machines perform the *apply*
- Foreshadowing module 10: GitOps generalizes "Git is the source of truth"

<!-- This closes the loop with modules 4-5: students already have CI running lint and test, and infra slots into the same pipeline shape. The reviewer approves an exact plan, not a vague intention, and no human runs apply from a laptop. Module 10 pushes the idea further with GitOps for deployments. -->

---

# Summary

- ClickOps produces snowflakes, drift, and no audit trail
- IaC: declarative, idempotent, version-controlled, code-reviewed
- Terraform: providers, resources, data sources, variables, outputs — in HCL
- Workflow: `init` → `plan` → `apply` (→ `destroy`); read every plan (`+ ~ - -/+`)
- State maps code to reality: never hand-edit, never commit, use remote backends with locking
- Drift is detected by `plan` and healed by `apply`

<!-- Six bullets, one story: infrastructure becomes software, with the same lifecycle and review discipline. If students remember one operational habit, make it "read the plan, scan for destroys". The lab turns each of these bullets into something they run and see. -->

---

# Next Up

- **Lab 08**: manage your `devops-demo-app` container with Terraform's Docker provider — plan, apply, prove idempotency, inject drift and heal it, then destroy; commit `infra/` via PR
- **Module 09: Configuration & Secrets Management** — where config and credentials live, ConfigMaps, Secrets, Vault, and an Ansible introduction

<!-- Preview the lab's arc: it is deliberately cloud-free, using the Docker provider against their local daemon, so the whole workflow costs nothing. Everything transfers one-to-one to AWS or GCP later — only the provider changes. Module 9 picks up the question this module left open: where do secrets go, if not in code or state? -->
