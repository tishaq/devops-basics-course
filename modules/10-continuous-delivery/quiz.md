# Quiz 10: Continuous Delivery & Deployment Strategies

Answer all questions without notes. Multiple-choice questions have exactly one correct answer. Check yourself against the answer key at the end.

**Q1.** What is the precise difference between continuous delivery and continuous deployment?

A. Continuous delivery includes automated tests; continuous deployment does not
B. Continuous delivery means every green build *can* be released (a human decides when); continuous deployment means every green build *is* released automatically
C. Continuous delivery deploys to staging; continuous deployment deploys to dev
D. They are synonyms used by different vendors

**Q2.** A team builds a fresh container image for each environment: one for staging, one for production, from the same commit. What principle are they violating, and what is the main risk? (short answer)

**Q3.** A Kubernetes Deployment has `replicas: 4`, `maxSurge: 1`, `maxUnavailable: 0`. During a rolling update, what is the maximum number of pods that can exist at once, and what is the minimum number of *ready* pods serving traffic?

A. Maximum 5, minimum 4
B. Maximum 4, minimum 3
C. Maximum 5, minimum 3
D. Maximum 8, minimum 4

**Q4.** For each scenario, name the most appropriate deployment strategy (recreate, rolling, blue/green, canary, or shadow): (short answer)

a) A risky pricing-algorithm change where you want real-traffic evidence with a small blast radius
b) A regulated release requiring a rehearsed, instantly reversible cutover
c) An internal reporting tool where 60 seconds of downtime is acceptable
d) Validating a rewritten service under production load without any user ever seeing its responses

**Q5.** In the lab, why did roughly 20% of requests reach the canary without any service mesh or traffic-splitting configuration?

A. The Service used a `weight` annotation set to 20
B. The canary Deployment had `trafficPercent: 20` in its spec
C. The Service selector matched a label both Deployments' pods share, so all 5 pods (4 stable + 1 canary) were endpoints, and traffic spread across them
D. kind clusters route 20% of traffic to the newest Deployment by default

**Q6.** What does it mean that feature flags "decouple deploy from release", and what operational capability does a kill switch give you? (short answer)

**Q7.** Which of the following is the correct order of steps in the expand/contract pattern for renaming a database column with zero downtime?

A. Drop the old column, add the new column, deploy code using the new column
B. Add the new column; deploy code that writes both and reads the new one; backfill; once nothing reads the old column, drop it
C. Deploy code using the new column, then rename the column in one migration
D. Rename the column and roll back if anything breaks

**Q8.** Why does data make rolling back a deployment hard? (short answer)

**Q9.** In a GitOps (pull-based) delivery model, which statement is true?

A. The CI pipeline holds cluster admin credentials and runs `kubectl apply` after each merge
B. An agent inside the cluster pulls the desired state from Git, reconciles continuously, and reverts manual drift; cluster credentials never leave the cluster
C. Git is used only to store application source code, not manifests
D. Drift introduced by `kubectl edit` is preserved because the agent only acts on new commits

**Q10.** What is "flag debt", and name one hygiene practice that prevents it. (short answer)

---

## Answer Key

**A1.** B — Delivery keeps every green build releasable with a human deciding when to ship; deployment removes the human gate so every green build ships automatically.

**A2.** They violate "build once, promote many"; the risk is that the artifact tested in staging is not byte-for-byte the artifact running in production, so test results do not apply to what actually shipped.

**A3.** A — `maxSurge: 1` allows one extra pod (5 total), and `maxUnavailable: 0` means the ready count never drops below the desired 4.

**A4.** a) canary; b) blue/green; c) recreate; d) shadow — each matches the strategy's core trade-off (measured small blast radius, instant two-way flip, simplicity with tolerated downtime, zero user risk under real load).

**A5.** C — the Service selects only on `app: devops-demo-app`, which both tracks carry, so the endpoint set contains all 5 pods and the split follows the pod ratio (1 of 5 ≈ 20%).

**A6.** Deploy puts code on servers while release makes it visible to users, so code can ship dark and be enabled later; a kill switch lets you disable a misbehaving feature in seconds at runtime without redeploying or rolling back.

**A7.** B — expand (additive change), migrate (dual-write, read-new, backfill), contract (destructive change last, only when nothing depends on the old shape).

**A8.** Once the new version has written data in a new shape (new columns, formats, or rows), the old version may crash on or mishandle that data, and applied migrations may not be reversible — so redeploying old code alone does not restore a working system.

**A9.** B — pull-based GitOps runs the reconciliation agent inside the cluster, which detects and reverts drift and removes the need to hand cluster credentials to CI.

**A10.** Flag debt is the accumulation of stale flags that multiply untested code paths and dead code; one preventive practice is assigning every flag an owner and a removal ticket at creation (removing the flag once rollout completes).
