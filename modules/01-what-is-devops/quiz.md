# Quiz 01: What is DevOps?

Answer all 10 questions without consulting the handout. Multiple-choice questions have exactly one correct answer. Short-answer questions need 1-3 sentences.

**Q1.** In the CALMS model, what does each letter stand for?
(Short answer.)

**Q2.** Which of the following best describes the "wall of confusion"?
A. The firewall separating production from staging environments
B. The organizational handoff point where developers pass builds to operations with no shared ownership of the outcome
C. The physical separation of data centers for disaster recovery
D. The learning curve new engineers face when joining an ops team

**Q3.** Which two events in 2009 are generally credited with launching the DevOps movement?
A. The Agile Manifesto and the release of Git
B. The founding of Docker and the first Kubernetes release
C. The Allspaw/Hammond "10+ Deploys per Day" talk at Velocity and the first DevOpsDays organized by Patrick Debois in Ghent
D. The publication of The Phoenix Project and the first State of DevOps report

**Q4.** List the four DORA metrics and state whether each measures speed or stability.
(Short answer.)

**Q5.** According to State of DevOps benchmark bands (2021-2023 era), an elite performer's lead time for changes is:
A. Under 1 hour
B. Under 1 day
C. Under 1 week
D. Under 1 month

**Q6.** A company renames its operations team to "the DevOps team." The team keeps its ticket queue and developers still hand off releases to it. Which anti-pattern is this?
A. Tools-first adoption
B. NoOps
C. Rebranded ops
D. DevOps by decree

**Q7.** The Three Ways from The Phoenix Project are, in order:
A. Plan, build, run
B. Flow, feedback, continual learning and experimentation
C. Culture, automation, measurement
D. Commit, test, deploy

**Q8.** Explain in one or two sentences why deploying more frequently tends to make systems more stable, not less, according to DORA research.
(Short answer.)

**Q9.** Who is associated with the phrase "you build it, you run it," and what does it mean in practice?
A. Gene Kim; developers write their own test suites
B. Werner Vogels; teams operate the services they develop, including production support
C. Patrick Debois; ops engineers write application code
D. Jez Humble; every build must be releasable

**Q10.** A team deploys once per quarter, and 5 of its last 10 deployments required a rollback or hotfix. State the team's change failure rate, and classify both its deployment frequency and change failure rate using the DORA benchmark bands.
(Short answer.)

---

## Answer Key

**Q1.** Culture, Automation, Lean, Measurement, Sharing. CALMS is the five-pillar lens for assessing DevOps adoption, originally CAMS (Damon Edwards and John Willis) with Lean added by Jez Humble.

**Q2.** B. The wall of confusion is the handoff between dev and ops where context is lost and responsibility ends, so nobody owns the end-to-end outcome.

**Q3.** C. The Flickr "10+ Deploys per Day" talk (June 2009) supplied the proof and the recipe, and the first DevOpsDays in Ghent (October 2009) gave the movement its community and — via the Twitter hashtag — its name.

**Q4.** Deployment frequency (speed), lead time for changes (speed), change failure rate (stability), time to restore service (stability). The pairing exists so that speed cannot be gamed at the expense of stability without it showing.

**Q5.** A. Elite performers have a lead time from commit to production of under one hour; "under one day to one week" corresponds to high performers.

**Q6.** C. Rebranded ops changes the team's name but none of the workflows, handoffs, or incentives, so the wall of confusion remains intact.

**Q7.** B. The First Way optimizes left-to-right flow of work, the Second creates fast right-to-left feedback loops, and the Third builds a culture of continual learning and experimentation.

**Q8.** Frequent deployment forces small batch sizes, and small batches are easier to test, review, and debug, with an obvious culprit and a cheap rollback when something fails. Frequent deploys also force the deployment process itself to be automated and well practiced.

**Q9.** B. Amazon CTO Werner Vogels coined it in a 2006 ACM Queue interview; it means the team that builds a service also operates it in production, closing the feedback loop between writing code and running it.

**Q10.** Change failure rate is 5/10 = 50%, which falls in the low-performer band (46-60%); deploying once per quarter (monthly to twice a year) is medium at best for frequency — combined with the 50% failure rate, this team profiles as a low performer.
