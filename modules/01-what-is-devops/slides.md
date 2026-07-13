---
marp: true
theme: course
paginate: true
footer: "DevOps Basics — Module 01: What is DevOps?"
---

<!-- _class: lead -->

# What is DevOps?

## Module 01

Why software delivery broke, and the culture that fixed it.

---

<!-- _class: section-divider -->

# Part 1: The World Before DevOps — and Where DevOps Came From

---

## Two tribes, two incentives

| | Development | Operations |
| --- | --- | --- |
| Goal | Ship features fast | Keep systems stable |
| Rewarded for | Change | Absence of change |
| Fears | Missing deadlines | 3 a.m. pages |
| View of the other | "Blockers" | "Reckless" |

Same company, opposing incentives.

<!-- Emphasize that neither side was wrong — each was optimizing for what they were measured on. Dev bonuses depended on features shipped; ops bonuses depended on uptime. A useful anecdote: at many enterprises circa 2005, ops teams had formal "change freeze" calendars covering half the year, which dev teams routinely tried to route around. -->

---

## The wall of confusion

- Developers finish code and "throw it over the wall"
- Ops receives a build with no context: no runbook, unclear dependencies, untested config
- Deployment becomes a negotiation, then a ticket queue, then a delay
- When production breaks: "it works on my machine" vs "your code is broken"

The handoff itself was the failure point.

<!-- The phrase "wall of confusion" was popularized by Lee Thompson and Andrew Shafer. Ask the class if they have experienced a deploy that required filing a ticket and waiting days — most rooms have several hands go up. The core insight: the wall exists because responsibility ends at the handoff, so nobody owns the outcome. -->

---

## Quarterly release pain

A typical 2005-era enterprise release:

- 3 months of development, frozen 2 weeks before release
- A "release weekend": 20+ people on a bridge call, manual runbook with 200 steps
- Big-bang deployment of thousands of changes at once
- If anything fails: hours of debugging under pressure, or a full rollback losing 3 months of work

Bigger batches meant bigger risk — which led to fewer releases, which made batches even bigger. Lead time for a one-line fix: often 4-12 weeks. Slow AND unreliable — the worst of both worlds.

<!-- Walk through the vicious cycle explicitly: releases hurt, so we do them less often, so each release contains more change, so releases hurt more. This is the batch-size death spiral, and it is the single most important dynamic DevOps reverses. Add the numbers from early State of DevOps data on low performers: change failure rates of 40-60% for big-bang releases, recovery in hours or days. The industry assumed speed and stability were a trade-off; DORA research covered later in this deck showed the opposite. -->

---

## Agile solved half the problem

- 2001: the Agile Manifesto — iterative development, working software, tight feedback with customers
- Dev teams got fast: 2-week sprints, continuous integration of code
- But the finish line was "done" = code complete, not code running in production
- Agile stopped at the wall; ops still deployed quarterly

DevOps extends Agile principles past the wall, all the way to production.

<!-- Frame DevOps as the logical completion of Agile rather than a competitor to it. A team doing perfect Scrum that deploys quarterly has agile development and waterfall delivery. Patrick Debois's original frustration, described next, was exactly this mismatch — he was working on an agile project whose infrastructure work was anything but. -->

---

## 2009: "10+ Deploys a Day"

- Velocity conference, June 2009
- John Allspaw and Paul Hammond of Flickr: **"10+ Deploys per Day: Dev and Ops Cooperation at Flickr"**
- While most companies deployed quarterly, Flickr deployed 10+ times daily — safely
- Their recipe: automated infrastructure, shared version control, one-step build and deploy, shared metrics, blameless culture, mutual respect between dev and ops

<!-- This 46-minute talk is arguably the founding document of DevOps; it is on YouTube and worth assigning. Highlight that the recipe is half tooling and half culture — Allspaw and Hammond spent as much time on trust and blamelessness as on automation. Ten deploys a day in 2009 sounded impossible; today elite teams deploy far more often. -->

---

## Patrick Debois and DevOpsDays

- Patrick Debois, a Belgian consultant, had been trying to bridge dev and ops on agile projects since 2007
- He watched the Allspaw/Hammond talk remotely and was inspired to act
- October 2009: he organized a conference in Ghent, Belgium — **DevOpsDays**
- The Twitter hashtag #devopsdays got shortened to **#devops** — and the name stuck

DevOps was named by a hashtag, not a standards body. There is no official spec.

<!-- Students often assume DevOps has a canonical definition from some foundation. It does not — it grew bottom-up from practitioners comparing notes. That is both a strength (pragmatism) and a weakness (vendors can slap "DevOps" on anything). DevOpsDays conferences still run worldwide today and are famously community-organized. -->

---

## The movement matures

- 2010: continuous delivery codified in Jez Humble and David Farley's *Continuous Delivery*
- 2013: *The Phoenix Project* (Gene Kim, Kevin Behr, George Spafford) — a novel that made DevOps legible to management
- 2014 onward: annual **State of DevOps** reports bring rigorous research (later the DORA team at Google)
- 2016: *The DevOps Handbook* — the practitioner's manual

<!-- Recommend The Phoenix Project as the first read — it is a novel about a failing IT project, modeled on Goldratt's The Goal, and most students finish it in a weekend. The research thread matters most for this course: DORA moved DevOps from anecdote to evidence, and we lean on that evidence throughout. -->

---

<!-- _class: section-divider -->

# Part 2: What DevOps Is — and Is Not

---

## A working definition

> DevOps is a culture and set of practices, supported by tooling, that enables organizations to deliver software **frequently, reliably, and safely** by breaking down the wall between development and operations.

Three layers, in priority order:

1. **Culture** — shared ownership of outcomes, blameless learning
2. **Practices** — CI/CD, infrastructure as code, monitoring, small batches
3. **Tooling** — Git, GitHub Actions, Docker, Kubernetes, Terraform, Prometheus...

<!-- Stress the ordering: tools implement practices, practices express culture. Buying Kubernetes does not make an organization DevOps any more than buying a piano makes someone a pianist. This course teaches all three layers, but module 1 is deliberately about the top of the stack. -->

---

## What DevOps is NOT

- **Not a job title.** "DevOps engineer" roles exist, but hiring one person does not transform an organization
- **Not a team.** A separate "DevOps team" between dev and ops just builds a third silo
- **Not a tool.** No vendor sells DevOps, whatever the marketing says
- **Not just automation.** Automating a broken process gives you a faster broken process

<!-- Each bullet is a real failure mode students will encounter in industry. The "DevOps team as a new silo" one is so common it appears on Team Topologies' anti-pattern list. Invite students to share whether their company has a "DevOps team" and what it actually does — the answers usually illustrate the point. -->

---

## "You build it, you run it"

- Werner Vogels, Amazon CTO, in a 2006 ACM Queue interview:

> "The traditional model is that you take your software to the wall that separates development and operations, and throw it over... We have gone with 'you build it, you run it.'"

- Teams that operate their own services get direct feedback from production
- Carrying the pager changes how you write code: better logging, graceful shutdown, health checks

<!-- Note the date: 2006, three years before the word DevOps existed. Amazon reached the same conclusion independently at scale. Connect it to the sample app students will run today — it already has a /health endpoint and a SIGTERM handler, because someone who operates software knows those matter. Ownership is the mechanism that closes the feedback loop. -->

---

<!-- _class: section-divider -->

# Part 3: Models — CALMS and the Three Ways

---

## CALMS: five pillars

| Letter | Pillar | One-liner |
| --- | --- | --- |
| C | Culture | Shared ownership, blameless postmortems |
| A | Automation | Machines do the repeatable work |
| L | Lean | Small batches, limit WIP, eliminate waste |
| M | Measurement | Decide with data, not opinions |
| S | Sharing | Knowledge flows across team boundaries |

Coined by Damon Edwards and John Willis (as CAMS); Jez Humble added the L.

<!-- CALMS is an assessment lens, not a maturity model with levels. Suggest students score their own team 1-5 per letter — the exercise reliably reveals that culture and sharing lag automation. We will unpack each letter on the following slides. -->

---

## C — Culture

- Shared responsibility: "how was YOUR deploy?" becomes "how was OUR deploy?"
- **Blameless postmortems**: incidents are analyzed for systemic causes, not scapegoats
- Psychological safety: engineers who fear blame hide problems; hidden problems compound
- Culture change is the slowest and hardest part — which is why tools-first adoptions stall

<!-- Anecdote that lands well: Etsy's blameless postmortem practice (John Allspaw again) included engineers giving detailed accounts of mistakes without fear of punishment — and Etsy found people volunteered far more information, making fixes systemic. Contrast with a blame culture where the "root cause" is always "human error" and nothing improves. -->

---

## A — Automation

- Automate builds, tests, deployments, infrastructure provisioning, and rollbacks
- Humans are bad at repeating 200-step runbooks at 2 a.m.; scripts are not
- Automation makes processes **repeatable, auditable, and fast**
- Rule of thumb: if you have done it manually three times, automate it

<!-- Point forward: modules 4-5 automate build and test (GitHub Actions), module 8 automates infrastructure (Terraform), module 10 automates deployment. Caution against automating chaos — you must understand a process before scripting it, which is why the value-stream mapping exercise in today's lab comes first. -->

---

## L — Lean

- Borrowed from Toyota manufacturing: **small batches**, limited work-in-progress, waste elimination
- A deploy of 5 changes is easier to test, review, and debug than a deploy of 500
- If a small deploy fails, the culprit is obvious; rollback is cheap
- Value-stream mapping (today's lab) finds the waste: wait times, handoffs, rework

<!-- Use the arithmetic: if a bad deploy of 500 changes breaks production, you are bisecting 500 suspects; with 5 changes, you can often just read the diff. Small batch size is the hidden engine behind almost every DevOps practice — CI, trunk-based development, canary deploys all exist to shrink batches. -->

---

## M — Measurement

- "In God we trust; all others must bring data"
- Measure the delivery process (DORA metrics — next section) and the system (latency, error rate, saturation)
- Metrics must be visible to everyone, not locked in an ops dashboard
- Beware vanity metrics: lines of code and ticket counts measure motion, not progress

<!-- Foreshadow module 11 (observability) where students wire the sample app's /metrics endpoint into Prometheus and Grafana. The cultural point: shared metrics end the dev-vs-ops argument about whose fault an incident is, because everyone is looking at the same graph. -->

---

## S — Sharing

- Knowledge silos are single points of failure ("only Dana knows how deploys work")
- Practices: shared runbooks, documented postmortems, internal demos, pairing dev with ops, inner-source repositories
- The original DevOpsDays was itself an act of sharing — practitioners comparing notes

<!-- The "bus factor" framing works well: how many people can leave before the team cannot deploy? If the answer is one, sharing has failed. Tie to the course: every lab produces written deliverables partly to build the documentation habit. -->

---

## The Three Ways (*The Phoenix Project*)

1. **Flow** — optimize the whole left-to-right pipeline from commit to customer; small batches, remove bottlenecks, make work visible
2. **Feedback** — fast right-to-left signals: failing tests in minutes, alerts, customer telemetry; shorten the loop between action and consequence
3. **Continual learning** — experimentation, blameless postmortems, practice through repetition (chaos drills, game days)

<!-- Map each Way onto the course: Flow is modules 2-8 (pipeline construction), Feedback is modules 5 and 11 (quality gates, observability), Continual Learning is module 12 and the postmortem habits we practice throughout. The Ways build on each other — you cannot learn from feedback you never receive, and you cannot get fast feedback without flow. -->

---

<!-- _class: section-divider -->

# Part 4: Measuring It — DORA Metrics

---

## The four DORA metrics

DORA (DevOps Research and Assessment) — research program behind the State of DevOps reports, since 2018 part of Google Cloud.

| Metric | Question it answers |
| --- | --- |
| Deployment frequency | How often do we ship to production? |
| Lead time for changes | Commit to production: how long? |
| Change failure rate | What % of deploys cause a failure? |
| Time to restore service | When production breaks, how fast do we recover? |

Two measure **speed**, two measure **stability**.

<!-- Explain why exactly four: they are the metrics that survived years of survey research (tens of thousands of respondents) as statistically predictive of organizational performance — including profitability and market share, per the Accelerate book. Emphasize the speed/stability pairing: gaming the speed metrics without the stability ones is immediately visible. -->

---

## Elite vs low performers

Benchmarks from the State of DevOps reports (2021-2023 era):

| Metric | Elite | Low |
| --- | --- | --- |
| Deployment frequency | On demand (many per day) | Fewer than once per 6 months |
| Lead time for changes | Under 1 hour | Over 6 months |
| Change failure rate | 0-15% | 46-60% |
| Time to restore | Under 1 hour | Over 6 months |

Elite teams are faster **and** more stable. Speed vs stability is a false trade-off.

<!-- This table is the empirical heart of the module — have students sit with it. Ask: how can deploying MORE often make you MORE stable? Draw out the answer: small batches, automated pipelines, and practiced recovery. Note that thresholds shift slightly by report year; cite the year when quoting them at work. -->

---

## Reading the metrics honestly

- **Lead time** starts at code commit, not at ticket creation (DORA's definition) — but the ticket-to-commit gap is also worth mapping
- **Change failure rate** counts deploys needing hotfix/rollback/patch — requires honest incident tracking
- **MTTR** rewards fast rollback paths and good observability, not heroics
- Never use DORA metrics to rank individuals — they measure the **system**

<!-- Goodhart's law warning: "when a measure becomes a target, it ceases to be a good measure." Real failure story to share: teams that were ranked on deployment frequency started deploying trivial no-op changes to pad numbers. The metrics diagnose the delivery system; using them as individual performance reviews destroys the honest reporting they depend on. -->

---

<!-- _class: section-divider -->

# Part 5: Anti-Patterns and the Road Ahead

---

## Anti-pattern gallery

- **The DevOps silo**: a new "DevOps team" sits between dev and ops — now there are two walls
- **Rebranded ops**: same ops team, same tickets, new name on the door
- **Tools-first adoption**: buy Kubernetes, declare victory, change nothing about how teams work
- **DevOps by decree**: leadership mandates "DevOps" with no investment in training, staffing, or culture
- **NoOps misunderstanding**: firing ops staff instead of embedding their expertise

<!-- Each of these is drawn from documented industry experience (see Team Topologies' anti-pattern catalog and countless conference retrospectives). The common thread: treating DevOps as a thing you buy or a box on the org chart, rather than a change in how work flows. Ask students which one their organization is closest to — the discussion is usually lively. -->

---

## What this course builds

| Modules | Theme | The sample app... |
| --- | --- | --- |
| 1-3 | Foundations: culture, Git, Linux | ...runs locally, in your own repo |
| 4-5 | CI and quality gates | ...builds and tests on every push |
| 6-7 | Docker and Kubernetes | ...runs in containers, then a cluster |
| 8-9 | Terraform, config and secrets | ...gets real infrastructure |
| 10-12 | CD, observability, DevSecOps/SRE | ...ships safely and is watched in production |

One app, `devops-demo-app`, travels the whole journey.

<!-- Give students the map so every later module has context. The app is deliberately tiny — zero dependencies, ~60 lines — so all cognitive budget goes to the delivery machinery around it, not the application code. By module 12 they will have built, end to end, the pipeline that elite DORA performers use. -->

---

## Summary

- Pre-DevOps: siloed teams, opposing incentives, quarterly big-bang releases — slow AND fragile
- DevOps emerged 2009 (Flickr talk, DevOpsDays) from Agile roots; it is culture + practices + tooling, not a title or a tool
- **CALMS**: Culture, Automation, Lean, Measurement, Sharing
- **Three Ways**: flow, feedback, continual learning
- **DORA metrics** prove speed and stability go together
- Avoid the silo, the rebrand, and tools-first adoption

<!-- Recap by asking the class to name the four DORA metrics from memory — it is the most quiz-relevant content and worth the repetition. Close on the empirical message: this is not ideology; the State of DevOps data says these practices predict better organizational outcomes. -->

---

## Next up

- **Lab 01**: verify your toolchain (git, Node.js 18+, curl), run `devops-demo-app` locally, then map the value stream of a struggling fictional team and score them against DORA
- **Module 02: Git & Collaboration Workflows** — branching strategies, trunk-based development, pull requests, and the repository you will use for the rest of the course

<!-- Point students at lab.md and remind them the lab01.md write-up is the deliverable. Tease module 2: the repo they create next week is the foundation every later lab builds on, so attendance matters. -->
