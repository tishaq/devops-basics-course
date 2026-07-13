# Lab 08: Terraform with the Docker Provider

## What you will do

Manage your `devops-demo-app` container with Terraform instead of `docker run`. You will write a small Terraform configuration (provider, network, container, variables, outputs), run the full `init` / `plan` / `apply` / `destroy` workflow, prove idempotency, inject drift by deleting the container behind Terraform's back and heal it, change a variable and read the resulting plan, inspect state safely, and commit the configuration through a pull request.

No cloud account is needed: the Terraform Docker provider talks to your local Docker daemon, so everything in this lab is free and local.

Estimated time: 60-90 minutes.

## Prerequisites

- [ ] Completed Lab 07 (your repo has `k8s/` merged; more importantly, `devops-demo-app:v1` exists locally — check with `docker images devops-demo-app`)
- [ ] Docker Desktop (or another Docker engine) running
- [ ] Terraform installed: `brew install terraform` (Linux: https://developer.hashicorp.com/terraform/install)
- [ ] Your `devops-demo-app` repository cloned with a clean working tree

> Alternative: OpenTofu is a drop-in replacement. Install with `brew install opentofu` and substitute `tofu` for `terraform` in every command below.

If the image is missing, rebuild it first from your repo root: `docker build -t devops-demo-app:v1 .`

## Steps

### 1. Create the Terraform configuration

Create an `infra/` directory in your repository. Inside it, create `infra/main.tf`:

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

# Read-only lookup of the image you built in module 6.
# A docker_image *resource* would try to pull from a registry (and fail,
# since this image exists only in your local daemon), so we use a data source.
data "docker_image" "app" {
  name = "devops-demo-app:v1"
}

resource "docker_network" "app_network" {
  name = "devops-demo-net"
}

resource "docker_container" "app" {
  name  = var.container_name
  image = data.docker_image.app.id

  ports {
    internal = 3000
    external = var.external_port
  }

  networks_advanced {
    name = docker_network.app_network.name
  }
}
```

Create `infra/variables.tf`:

```hcl
variable "external_port" {
  description = "Host port published for the app container"
  type        = number
  default     = 3001
}

variable "container_name" {
  description = "Name of the Docker container"
  type        = string
  default     = "devops-demo-app-tf"
}
```

Create `infra/outputs.tf`:

```hcl
output "container_name" {
  description = "Name of the managed container"
  value       = docker_container.app.name
}

output "container_id" {
  description = "ID of the managed container"
  value       = docker_container.app.id
}

output "endpoint" {
  description = "Base URL of the running app"
  value       = "http://localhost:${var.external_port}"
}
```

Before continuing, trace the dependency chain in `main.tf`: the container references the data source (`data.docker_image.app.id`) and the network (`docker_network.app_network.name`). Terraform will derive the creation order from these references — you never specify it.

### 2. Initialize

```bash
cd infra
terraform init
```

Expected output includes:

```text
Initializing provider plugins...
- Finding kreuzwerker/docker versions matching "~> 3.0"...
- Installing kreuzwerker/docker v3.x.x...

Terraform has been successfully initialized!
```

Look at what appeared: `.terraform/` (the downloaded provider plugin — large, never committed) and `.terraform.lock.hcl` (the pinned provider versions — small, always committed, same idea as `package-lock.json`).

### 3. Plan, apply, verify

```bash
terraform plan
```

Read the output. You should see two resources marked `+` (the data source is read, not created):

```text
  # docker_container.app will be created
  + resource "docker_container" "app" { ... }

  # docker_network.app_network will be created
  + resource "docker_network" "app_network" { ... }

Plan: 2 to add, 0 to change, 0 to destroy.
```

Apply (type `yes` when prompted):

```bash
terraform apply
```

```text
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

container_id = "3f9c..."
container_name = "devops-demo-app-tf"
endpoint = "http://localhost:3001"
```

Verify the app is really running:

```bash
curl http://localhost:3001/health
# {"status":"ok","uptimeSeconds":5}
docker ps --filter name=devops-demo-app-tf
```

### 4. Prove idempotency

Run apply again without changing anything:

```bash
terraform apply
```

```text
No changes. Your infrastructure matches the configuration.

Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
```

This is idempotency: the same code applied twice does nothing the second time. Automation built on this property is safe to retry.

### 5. Inject drift and heal it

Simulate an out-of-band change — someone deletes your container manually:

```bash
docker rm -f devops-demo-app-tf
curl http://localhost:3001/health   # fails: connection refused
```

Now ask Terraform what it thinks:

```bash
terraform plan
```

```text
  # docker_container.app will be created
  + resource "docker_container" "app" { ... }

Plan: 1 to add, 0 to change, 0 to destroy.
```

Terraform refreshed its state against reality, noticed the container is gone, and proposes to recreate it. Heal the drift:

```bash
terraform apply
curl http://localhost:3001/health
# {"status":"ok","uptimeSeconds":2}
```

This is reconciliation on demand: the code declares the desired state, and `apply` restores it.

### 6. Change a variable and read the plan

Move the app to port 3002 without editing any `.tf` file:

```bash
terraform plan -var="external_port=3002"
```

Read the plan carefully. Published ports cannot be changed on a running container, so Terraform must destroy and recreate it — the plan shows `-/+` (replace), with the forcing attribute marked:

```text
  # docker_container.app must be replaced
-/+ resource "docker_container" "app" {
      ~ ports {
          ~ external = 3001 -> 3002 # forces replacement
        }
    }

Plan: 1 to add, 0 to change, 1 to destroy.
```

Apply it, then verify:

```bash
terraform apply -var="external_port=3002"
curl http://localhost:3002/health
```

For a persistent (non-flag) override, you could instead create `infra/terraform.tfvars` containing `external_port = 3002`. Note that the `endpoint` output only reflects the port when the variable is actually set — the `-var` flag must be passed to `apply`, not just `plan`.

### 7. Inspect state safely

```bash
terraform state list
```

```text
data.docker_image.app
docker_container.app
docker_network.app_network
```

```bash
terraform state show docker_container.app
```

Skim the attributes: this is the mapping between your code and container ID that makes diffing possible. Open `terraform.tfstate` in your editor *read-only* and observe it is plain JSON — then never touch it again. State files can contain secrets and must not be committed. Add these lines to the `.gitignore` at your repository root:

```gitignore
.terraform/
*.tfstate*
```

### 8. Destroy

Tear everything down (type `yes` when prompted):

```bash
terraform destroy
```

```text
Destroy complete! Resources: 2 destroyed.
```

Confirm: `docker ps --filter name=devops-demo-app-tf` shows nothing, and `curl http://localhost:3002/health` fails. The image itself is untouched — the data source only read it.

### 9. Commit via PR

From the repository root:

```bash
git checkout -b lab-08-terraform
git add infra/ .gitignore
git commit -m "Add Terraform configuration for local Docker infrastructure"
git push -u origin lab-08-terraform
```

Confirm that `git status` shows no `.tfstate` or `.terraform/` files staged — if it does, fix your `.gitignore` before pushing. Open a pull request, let CI pass, and merge.

## Deliverables

1. An excerpt of your first `terraform plan` output showing the two `+` resources and the `Plan: 2 to add` summary line.
2. The drift demonstration: the `docker rm -f` command, the subsequent `terraform plan` output showing `1 to add`, and the successful `curl` after the healing `apply`.
3. The URL of your merged pull request adding `infra/`.

## Troubleshooting

**`terraform init` fails to download the provider.** Usually a network or proxy issue. Retry; if you are behind a corporate proxy, set `HTTPS_PROXY`. Verify the `source` is exactly `kreuzwerker/docker` — a typo here means the registry lookup fails.

**`Error: Unable to read Docker image ... devops-demo-app:v1`.** The data source cannot find the image in your local daemon. Run `docker images devops-demo-app` — if it is missing, rebuild it from your repo root with `docker build -t devops-demo-app:v1 .` and re-run the plan.

**`Cannot connect to the Docker daemon`.** Docker Desktop is not running, or the provider cannot find the socket. Start Docker. On Linux, ensure your user is in the `docker` group or set `provider "docker" { host = "unix:///var/run/docker.sock" }`.

**`Error: container name ... is already in use`.** A container with the name `devops-demo-app-tf` exists outside Terraform's state (for example, left over from a partial run). Remove it with `docker rm -f devops-demo-app-tf` and apply again.

**Apply hangs or the port is refused after apply.** Another process is already bound to the external port (perhaps the Compose stack from module 6). Check with `lsof -i :3001`, stop the conflicting container (`docker compose down` in your repo), or apply with a different `-var="external_port=..."`.
