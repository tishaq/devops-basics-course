# Quiz 12: DevSecOps & SRE Fundamentals

Answer all questions without notes. Multiple-choice questions have exactly one correct answer. Check yourself against the answer key at the end.

**Q1.** What is the core argument for shifting security left?

A. Security teams are cheaper than developers
B. The cost of fixing a vulnerability grows by orders of magnitude the later it is found — from a design change to a production incident or breach
C. Left-shifted security removes the need for production monitoring
D. Compliance frameworks require scanning tools in CI

**Q2.** Match each finding to the tool class (secret scanning, SCA, SAST, image scanning, DAST) that would catch it: (short answer)

a) An AWS access key committed five commits ago and since deleted
b) A known CVE in a transitive npm dependency
c) A SQL injection pattern in code your team wrote
d) A vulnerable version of `libssl` in the alpine base image
e) A missing security header only observable on the deployed app's HTTP responses

**Q3.** Why does a lockfile (`package-lock.json`) matter for supply-chain security, even in a project with zero dependencies today? (short answer)

**Q4.** Why does the lab set `permissions: contents: read` at the top of `ci.yml`?

A. It makes the workflow run faster
B. It prevents developers from merging without review
C. It limits what a compromised third-party action can do with the workflow's `GITHUB_TOKEN` — least privilege for the pipeline
D. It is required for `npm audit` to run

**Q5.** Define SLI, SLO, and SLA in one sentence each, using availability of a web service as the running example. (short answer)

**Q6.** A service has an SLO of 99.9% availability over a 30-day window. What is its error budget in minutes (approximately)?

A. 4.3 minutes
B. 43 minutes
C. 216 minutes
D. 432 minutes

**Q7.** A team has exhausted its error budget halfway through the window. According to error-budget policy, what happens next?

A. The SLO is retroactively lowered so the budget is no longer exhausted
B. The on-call engineer is replaced
C. Feature releases freeze and engineering effort shifts to reliability work until the budget recovers
D. Nothing — the budget is informational only

**Q8.** Which of the following is toil, per the SRE definition?

A. Designing an automated certificate-rotation system
B. Manually restarting a stuck pod every few days, a chore that grows as the service scales
C. Writing a postmortem after a novel incident
D. Attending sprint planning

**Q9.** Why must postmortems be blameless, and why do they prefer "contributing factors" over a single "root cause"? (short answer)

**Q10.** During a SEV1 incident, what is the Incident Commander's job, and what should they explicitly not do? (short answer)

---

## Answer Key

**A1.** B — the defect-cost curve is the economic core of shift-left: minutes to fix in CI versus incident, breach, disclosure, and reputation cost in production.

**A2.** a) secret scanning (gitleaks scans full history, so deletion does not help); b) SCA (npm audit / Dependabot); c) SAST (CodeQL / Semgrep); d) image scanning (Trivy scans base-image OS packages); e) DAST (only observable against the running application).

**A3.** The lockfile pins the exact resolved version of every package, making installs reproducible and constraining what a future `npm install` may pull — so when a dependency is eventually added, a compromised or typosquatted version cannot silently resolve, and `npm audit` has a precise tree to scan.

**A4.** C — the default `GITHUB_TOKEN` can carry write permissions, and a compromised action inherits them; restricting to `contents: read` shrinks the blast radius of a pipeline supply-chain attack.

**A5.** An SLI is a measurement of service quality (e.g. the fraction of successful health checks); an SLO is the internal target set on that SLI (e.g. 99.9% over a rolling month); an SLA is an external contract with penalties if a (usually looser) level is breached (e.g. 99.5% or the customer receives credits).

**A6.** B — budget = 1 − 0.999 = 0.001; 0.001 × 30 × 24 × 60 ≈ 43 minutes. (C, 216 minutes, is the budget for a 99.5% SLO, as computed in the lab.)

**A7.** C — the freeze is the pre-agreed consequence that makes the error budget a peace treaty between velocity and reliability; it lifts when the budget recovers.

**A8.** B — it is manual, repetitive, automatable, of no lasting value, and scales with the service; A is the engineering work that eliminates toil, and C and D are overhead or one-off engineering, not toil.

**A9.** Blame destroys information flow — people who fear punishment hide details, so the organization loses the accurate account that prevention depends on; and real incidents emerge from multiple interacting causes, so hunting one "root cause" (often "human error") truncates the analysis before asking why the system allowed the error to matter.

**A10.** The IC owns coordination: tracking state, making decisions, delegating investigation, and ensuring communication happens; they explicitly do not debug, because hands-on investigation would consume the attention that coordination requires.
