# Evaluation Rubric

Owned by: Lead. This file defines how the team's effectiveness is measured
and how measurement feeds back into the project structure.

## Principle

Evaluation reads from files agents already write — primarily
`docs/TASKS.md`. No agent does extra work to feed the metrics; the log
format carries the data.

## Metrics

| Metric | Source | What it tells us |
|---|---|---|
| Rework rate | `changes-requested` entries ÷ total entries | How often work bounces. Per agent and overall. |
| Review cycles | `**Review cycles:**` field | Depth of rework per unit of work. |
| Open-question aging | `**Open questions:**` ≠ none, days since entry date | Handoffs that leave the next agent stuck. |
| Throughput | `done` entries per week | Delivery pace over time. |
| Scope drift | `**Scope changed:**` yes ratio | How often routed tasks didn't match reality — a routing/GDD quality signal. |

## Targets

These are starting heuristics, not law. Adjust them in a retro once there's
real history.

- Rework rate: below ~25% overall; any single agent persistently above ~40%
  is a signal to look at their inputs (specs, conventions, access).
- Review cycles: average at or below 1 per completed unit.
- Open questions: none older than one retro cycle without an answer or an
  explicit "deferred" note.
- Scope drift: below ~20%. High drift means the Lead's task breakdown or the
  GDD needs work, not the implementer.

## Cadence

Run a retro after every 5 completed (`done`) features, or weekly during
active development — whichever comes first.

## How a retro runs

1. Lead runs `node tools/retro/retro.mjs` for the scorecard (or the retro
   chatmode, which does this as Stage 1).
2. Compare each metric against targets. Investigate the worst offender
   first — read the actual TASKS.md entries behind the number.
3. Decide on at most 2–3 concrete changes. Changes land in `AGENTS.md`
   conventions, `docs/SQUAD.md` coordination rules, or the GDD — never in
   this file (this file only changes when the rubric itself is wrong).
4. Log the retro as a TASKS.md entry: findings, decided changes, and which
   metric should move next cycle.

## What not to do

- Don't evaluate individuals — metrics describe lanes and handoffs, not
  people. A bad number points at a missing input, not a bad agent.
- Don't add metrics that require agents to change their workflow. If the
  data isn't in the files, change the file format first.
