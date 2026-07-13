---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 10: Continuous Delivery & Deployment Strategies"
---

<!-- _class: lead -->

# Continuous Delivery & Deployment Strategies

## Module 10

Getting code to production safely, repeatedly, and on demand.

---

<!-- _class: section-divider -->

# Part 1: From "It Works" to "It's Live"

---

## Continuous delivery vs continuous deployment

| | Continuous **Delivery** | Continuous **Deployment** |
| --- | --- | --- |
| Every green build is... | **Releasable** | **Released** |
| Push to production | A human decides *when* | Automatic, no human gate |
| The button | Exists, pressed by a person | Does not exist |
| Business fit | Regulated or coordinated releases | High-trust, high-automation teams |

Same pipeline, one difference: who (or what) presses "deploy to prod".

<!-- This distinction is asked about in every DevOps interview and is genuinely muddled in industry writing, so nail it here. Continuous delivery means the software is always in a deployable state and deploying is a business decision; continuous deployment removes the decision entirely and every passing commit flows to production. Point out that you cannot do continuous deployment without first achieving continuous delivery — it is a superset, not an alternative. -->

---

## Why "always releasable" changes behavior

- No more "hardening sprints" — quality is built in continuously
- Deploys become boring, small, and frequent instead of rare and terrifying
- The gap between "done" and "delivering value" shrinks to minutes
- Rollback anxiety drops because each change is tiny

The goal is not speed for its own sake — it is **small batches**, which module 1 showed reduce risk.

<!-- Connect back to the batch-size death spiral from module 1: rare releases mean big batches mean high risk. Continuous delivery is the engineering discipline that reverses it. Ask the class what currently stops their team from deploying any given commit — the answers (manual QA, config drift, missing tests) are exactly the pipeline stages this module covers. -->

---

## Build once, promote many

```text
        build (once)
            |
            v
   devops-demo-app:1.4.2  ----> dev ----> staging ----> production
        (same artifact promoted through every environment)
```

- The artifact (container image) is built **exactly once**, then promoted
- What changes per environment: **configuration**, injected from outside (module 9)
- Rebuilding per environment means you test one binary and ship a different one

<!-- This is the single most important principle in this module. If staging runs an image built from the same commit but compiled separately, you have not tested what you ship — different dependency resolution, different base image pull, different timestamps. Remind students that module 9's ConfigMaps and environment variables exist precisely so the same image can behave correctly in every environment. -->

---

## Stages of a deployment pipeline

| Stage | Purpose | Typical time |
| --- | --- | --- |
| Commit | Compile, lint, unit tests, build image | < 10 min |
| Acceptance | Deploy to test env, run API/E2E tests | 10–30 min |
| Staging / UAT | Production-like environment, manual exploration | on demand |
| Production | Deploy with a chosen **strategy** | minutes |

- Each stage increases confidence and cost — fail fast in the cheap stages
- Your CI from modules 4–5 is the commit stage; today we build the production end

<!-- Emphasize the funnel: 90 percent of problems should be caught in the commit stage where feedback costs seconds, not in staging where it costs hours. The pipeline is a series of increasingly production-like gates that a single immutable artifact passes through. Students already own the left half of this pipeline from modules 4 and 5. -->

---

<!-- _class: section-divider -->

# Part 2: Deployment Strategies

---

## Strategy 1: Recreate

```text
v1 v1 v1  --->  (nothing)  --->  v2 v2 v2
              ^ downtime here
```

- Stop **all** old pods, then start the new ones
- Simple, no version-mixing, but **guaranteed downtime**
- Acceptable for: internal tools, batch systems, apps that cannot run two versions at once

<!-- Recreate is not always wrong — if the app holds an exclusive lock on a database schema or a file, running v1 and v2 side by side can corrupt data, and a short maintenance window is the honest answer. The point of this section is that every strategy is a trade-off, not that fancier is better. -->

---

## Strategy 2: Rolling update (the Kubernetes default)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1          # how many EXTRA pods may exist during the roll
    maxUnavailable: 0    # how many pods may be MISSING during the roll
```

- Replace pods a few at a time; old and new serve traffic **simultaneously**
- `maxSurge: 1, maxUnavailable: 0` = always full capacity, +1 pod of headroom
- Requires: readiness probes (module 7) and **backward-compatible changes**

<!-- Walk through one cycle: Kubernetes starts one v2 pod (surge), waits for its readiness probe to pass, then terminates one v1 pod, and repeats. maxUnavailable: 0 guarantees capacity never drops below the replica count, at the cost of needing spare cluster room for the surge pod. The hidden requirement is compatibility — for some minutes, v1 and v2 both serve traffic and both talk to the same database. -->

---

## Rolling update: what can still go wrong

- A readiness probe that passes too eagerly lets a broken pod take traffic
- API or database incompatibility between v1 and v2 surfaces mid-roll
- The roll is gradual, but so is the **blast radius** — by the time you notice, half your pods are new
- `kubectl rollout undo` reverses it, but the bad version already served users

Rolling update limits *capacity* risk, not *correctness* risk.

<!-- This slide motivates canary. Rolling updates answer "how do I replace pods without dropping requests" but not "how do I find out the new version is bad before most users see it". If the bug is subtle — a 5 percent error rate, a latency regression — a rolling update happily rolls it out to everyone. -->

---

## Strategy 3: Blue/green

```text
  Blue (v1)  <---- router ----   users
  Green (v2)      (flip!)
```

- Run two **complete** environments; only one receives traffic
- Cutover is **instant** (flip a load balancer or Service selector)
- Rollback is equally instant: flip back
- Cost: **double capacity** while both are up; database is still shared

<!-- The appeal of blue/green is the symmetric, instant switch in both directions — no gradual state to reason about. The costs are real: you pay for 2x infrastructure during the window, and the database is usually shared between blue and green, so schema changes still need the expand/contract discipline coming later in this deck. In Kubernetes this is often done by pointing a Service's selector at a version label. -->

---

## Strategy 4: Canary

```text
   stable (v1): ████████ 80–95% of traffic
   canary (v2): █        5–20% of traffic  --> watch metrics --> promote or kill
```

- Expose the new version to a **small slice** of real traffic
- Judge it with **metrics** — error rate, latency, logs (module 11 gives you the tools)
- Good canary: promote gradually; bad canary: kill it, few users affected
- Named after the canary in the coal mine

<!-- Canary is the strategy the lab implements. Stress the second bullet: a canary without metrics is theater — you must define in advance what "healthy" means (error rate below X, latency below Y) and actually look. This is the forward link to module 11: observability is what makes canary deployments meaningful rather than decorative. -->

---

## Canary in Kubernetes, the simple way

```text
Service selector:  app: devops-demo-app        (matches BOTH deployments)

deployment-stable: labels app: devops-demo-app, track: stable   (4 replicas, v1)
deployment-canary: labels app: devops-demo-app, track: canary   (1 replica, v2)

Traffic split = pod ratio = 1/5 = ~20% to canary
```

- No service mesh needed: the Service load-balances across **all matching pods**
- Coarse control only — the split follows the replica ratio
- Service meshes (Istio, Linkerd) give per-request percentage control

<!-- This is exactly what students build in the lab, so linger here. The trick is that a Service selects on a subset of labels: both deployments carry app: devops-demo-app, so both pod sets are endpoints of the same Service, and kube-proxy spreads requests across them roughly evenly. The limitation is honesty: you cannot do a 1 percent canary with 5 pods. Meshes solve that but are out of scope. -->

---

## Strategy 5: Shadow (traffic mirroring)

- **Copy** production requests to the new version; users get responses **only from the old one**
- Tests the new version under real load with zero user risk
- Hard parts: duplicated side effects (never mirror writes naively), doubled backend load
- Niche but powerful — common for rewrites and performance validation

<!-- Keep this brief; it is awareness-level. The classic use case is validating a rewritten service: mirror a day of real traffic, diff the responses offline. Warn about side effects — if the shadow copy sends emails or writes to the production database, mirroring becomes an incident generator. -->

---

## Strategy trade-off table

| Strategy | Downtime | Rollback speed | Extra cost | Real-traffic testing | Complexity |
| --- | --- | --- | --- | --- | --- |
| Recreate | Yes | Slow (redeploy) | None | No | Trivial |
| Rolling | No | Medium (`rollout undo`) | ~1 pod | All users at once | Low |
| Blue/green | No | **Instant** (flip) | **2x env** | No (until flip) | Medium |
| Canary | No | Fast (kill canary) | ~1 pod | **Small % first** | Medium+ |
| Shadow | No | n/a (no user traffic) | 2x load | Yes, zero risk | High |

<!-- Give the class scenarios and have them pick: a regulated bank release with a rehearsed cutover (blue/green), a routine stateless microservice update (rolling), a risky pricing-algorithm change (canary), an internal cron dashboard (recreate is fine). The quiz tests exactly this kind of matching, and the lab's write-up asks them to contrast canary with blue/green. -->

---

<!-- _class: section-divider -->

# Part 3: Decoupling Deploy from Release

---

## Feature flags: deploy is not release

```js
if (flags.isEnabled('new-checkout', user)) {
  return newCheckout(cart);
}
return oldCheckout(cart);
```

- **Deploy** = code is on the servers. **Release** = users can see it.
- Flags let you deploy dark, then release by flipping a flag — no redeploy
- Merge unfinished work safely behind a flag (enables trunk-based development, module 2)

<!-- This mental split — deploy versus release — is the second big idea of the module after build-once. With flags, deployment becomes a low-risk technical act and release becomes a reversible product decision. It also dissolves the long-lived-branch problem from module 2: incomplete features merge to main behind a flag instead of rotting on a branch. -->

---

## Targeting and kill switches

- **Targeting**: enable per user, per tenant, per region, or for N% of traffic
  - Internal users first, then 1%, then 10%, then everyone — a canary at the *feature* level
- **Kill switch**: production misbehaving at 3 a.m.? Flip the flag off in seconds
  - No pipeline run, no rollback, no redeploy

Flags give per-feature rollback; deployment strategies give per-version rollback.

<!-- The percentage rollout makes the connection explicit: a canary shifts traffic between versions of the whole service, a flag shifts exposure of one feature inside a single version. Mature teams use both. The kill switch is the operational payoff — ops can disable a feature without knowing how to rebuild or redeploy anything. -->

---

## Flag debt: the hygiene problem

- Every flag doubles the paths through the code it guards — flags multiply
- Stale flags = dead code, untested combinations, "what does this flag even do?"
- Discipline:
  - Every flag gets an **owner** and an **expiry / removal ticket** at creation
  - Remove the flag (and the old path) once fully rolled out
  - Audit flags regularly; a flag older than a quarter needs a justification

<!-- A war story lands well here: the 2012 Knight Capital incident involved repurposed old feature-flag code and cost the firm 440 million dollars in 45 minutes. The rule to teach: a flag is a temporary release tool, not a permanent configuration system, and its removal is part of the feature's definition of done. -->

---

<!-- _class: section-divider -->

# Part 4: Data Makes Everything Harder

---

## The zero-downtime migration problem

- During any rolling or canary deploy, **v1 and v2 run at the same time**
- Both talk to the **same database**
- Rename a column in the same deploy that uses the new name, and:
  - v1 crashes (column it needs is gone), or
  - v2 crashes (column it needs does not exist yet)

Schema changes must be compatible with **both** running versions.

<!-- This is where many teams get burned first. The deployment strategies in Part 2 all assume the two versions can coexist; the database is the shared state that breaks the assumption. Set up the problem concretely — renaming users.name to users.full_name — and let the class feel that no single-step deploy can do it safely. -->

---

## Expand / contract (parallel change)

| Phase | Schema | App version |
| --- | --- | --- |
| 1. **Expand** | Add `full_name` (nullable), keep `name` | v1 (untouched) |
| 2. Migrate | Backfill; app v2 writes **both**, reads new | v2 deployed gradually |
| 3. **Contract** | Drop `name` | v3 (reads/writes new only) |

- Every step is backward compatible; every step is individually rollback-safe
- Slower than one big migration — that is the price of zero downtime

<!-- Walk the three phases slowly; this is a quiz topic. The invariant: at every moment, every running app version finds the schema it expects. Additive changes first (expand), destructive changes last (contract), and only after no running code depends on the old shape. This is also called parallel change, and it applies to APIs between services, not just databases. -->

---

## Roll forward vs roll back

- **Roll back**: redeploy the previous version — fast *if* nothing irreversible happened
- **Roll forward**: ship a fix on top — often safer once **data** has changed
- Why data makes rollback hard:
  - v2 wrote rows/columns v1 has never seen — v1 may crash or corrupt them
  - Migrations already applied may not be safely reversible
- Decide the rollback story **before** deploying, not during the incident

<!-- The uncomfortable truth: rollback is only trivially safe for stateless changes. Once a deploy has written data in a new shape, rolling back the code without rolling back the data can be worse than the original bug. Expand/contract is what keeps rollback windows open — during the expand phase, the previous version still works. Teams with strong CD often prefer roll-forward because their pipeline can ship a fix in minutes. -->

---

<!-- _class: section-divider -->

# Part 5: GitOps and Release Cadence

---

## GitOps: Git as the source of truth

- The **desired state** of the environment (all the YAML) lives in a Git repo
- An **agent in the cluster** continuously compares desired vs actual and converges them
- Change production = merge a PR; audit log = `git log`
- Drift (someone ran `kubectl edit`) is detected and **reverted automatically**

Your `k8s/` directory has been GitOps-shaped since module 7 — you just were the agent.

<!-- Students have been doing manual GitOps all course: edit YAML, commit, kubectl apply. GitOps automates the last step and adds continuous reconciliation. The drift-reversion point deserves emphasis — hand-edits to the cluster stop being possible, which is precisely the discipline that makes environments reproducible. -->

---

## Pull-based CD vs push-based CD

| | Push (classic pipeline) | Pull (GitOps) |
| --- | --- | --- |
| Who deploys | CI job runs `kubectl apply` | Agent **inside** the cluster pulls |
| Cluster credentials | Stored in CI (attack surface) | Never leave the cluster |
| Drift handling | None — deploy and forget | Continuous reconciliation |
| Audit trail | CI logs | Git history |
| Tools | GitHub Actions + kubectl | **Argo CD**, **Flux** |

<!-- The security argument is the one that convinces platform teams: in push mode, your CI system holds admin credentials to every cluster; in pull mode, the agent inside the cluster only needs read access to a Git repo. Argo CD and Flux are the two CNCF-graduated implementations — concept level is enough for this course; the capstone can optionally explore them. -->

---

## Release trains vs on-demand releases

- **Release train**: fixed schedule ("every Tuesday"); miss it, catch the next one
  - Predictable for marketing/support; batches changes; useful for app stores
- **On-demand**: any change ships when it is ready — the CD ideal
  - Smallest batches, fastest feedback, requires full pipeline automation
- Many orgs run both: on-demand for services, trains for mobile apps

<!-- Trains are not anti-DevOps; they are a coordination tool where external constraints exist (app store review, coordinated marketing launches, hardware). The danger is using a train to compensate for a slow pipeline — that reintroduces big batches. Ask: what in your org actually forces a schedule, and what is just habit? -->

---

## Summary

- **Delivery** = always releasable; **deployment** = every green build auto-ships
- **Build once, promote many** — config varies, the artifact never does
- Strategies are trade-offs: recreate, rolling (`maxSurge`/`maxUnavailable`), blue/green (instant flip, 2x cost), canary (real traffic, needs metrics), shadow
- Feature flags decouple **deploy** from **release** — and need lifecycle hygiene
- Zero-downtime schema changes use **expand/contract**; data makes rollback hard
- **GitOps**: desired state in Git, pull-based agents reconcile continuously

<!-- Recap by asking the class to name which strategy the lab implements and why the Service selector trick works. If time allows, revisit the trade-off table and run one more scenario-matching round — it is the highest-value retrieval practice for the quiz. -->

---

## Next up

**Module 11: Observability**

- You just built a canary and "judged" it by reading logs by hand
- Next module gives you the real tools: metrics, Prometheus, Grafana, alerts
- The `/metrics` endpoint your app has carried since module 2 finally gets scraped

Lab 10 first: canary-deploy v2 of `devops-demo-app` on your kind cluster.

<!-- Close the loop: the weakest step in today's lab is "judge the canary by eyeballing logs" — that pain is deliberate, because module 11 replaces it with rate queries and dashboards. Remind students the lab needs their module 7 kind cluster running and both image tags loaded. -->
