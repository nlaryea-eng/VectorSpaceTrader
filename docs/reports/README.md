# Sprint Reports

This folder is the durable, tracked home for short markdown reports written by
agents (and humans) after each substantial sprint or commit on Vector Space
Trader. The policy that mandates these reports lives in `AGENTS.md` under
**Sprint Reporting Policy** — this README is just the landing pad and a quick
reference.

`assessment/` is intentionally **not** used for sprint reports: it is
gitignored and is reserved for private review/audit artifacts. Sprint reports
must be tracked so future agents and reviewers can see the project's
implementation history without depending on a local working copy.

## File naming

Use a predictable, sortable name:

```
YYYY-MM-DD-short-sprint-name_NNN.md
```

- `YYYY-MM-DD` is the date the sprint (or the commit being reported) landed.
- `short-sprint-name` is a kebab-case label (e.g. `public-demo-feel`,
  `equipment-honesty`, `station-model`).
- `_NNN` is a zero-padded ordinal (`_001`, `_002`, ...) so multiple reports on
  the same day stay ordered and never collide.

## Required sections

Every report must include, at minimum:

- **Sprint name**
- **Date**
- **Branch**
- **Commit hash(es)**
- **Objective** — what the sprint was trying to accomplish, in plain English.
- **Files changed** — concise list (do not paste full diffs).
- **Summary of implementation** — what was actually done, not what was planned.
- **Tests / verification run** — exact commands and their pass/fail outcome.
- **Compliance scan result** — output (or "no matches") from the canonical scan
  defined in `.github/workflows/ci.yml`.
- **Save compatibility notes** — schema bumps, migrations added, or "no save
  format changes."
- **Known limitations** — anything intentionally deferred or unfinished.
- **Follow-up recommendations** — next sprint candidates, risks to watch.

## What reports must NOT contain

- Private chain-of-thought, scratchpad reasoning, or internal monologue.
- Secrets, API tokens, or credentials of any kind.
- Prohibited external-IP terms (the compliance grep in
  `.github/workflows/ci.yml` is the single source of truth; do **not**
  duplicate that regex here).
- Claims that a check "passed" unless the command was actually run and the
  output captured.
- A duplicate of the compliance regex itself — refer to the workflow.

## Authoring rules

- Do not back-fill reports for prior sprints unless explicitly asked.
- Do not edit files under `assessment/` from a sprint-report flow — those are
  review artifacts, not sprint deliverables.
- Stage report files explicitly (`git add docs/reports/<file>.md`). Never use
  `git add .`.
