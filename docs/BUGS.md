# Bug Tracker

Owned by: QA (files, triages, verifies). Gameplay Engineer fixes and moves
status forward. This file is the single source of truth for known defects —
coordination happens here, not in chat.

## Severity scheme

- `blocker` — crash, save corruption, progression impossible
- `major` — broken mechanic, wrong balance behavior, milestone exit
  criteria at risk
- `minor` — visual/audio glitch, polish, typo

## Lifecycle

`open` → `in-progress` → `fixed` → `verified`

- QA files bugs as `open` and owns final verification (`verified`).
- Gameplay Engineer claims `open` bugs (sets Owner, moves to
  `in-progress`) and marks `fixed` when the fix lands.
- Only QA moves a bug to `verified`. A failed verification goes back to
  `open` with a note.
- Won't-fix bugs: mark `verified` and note "won't fix — reason" instead of
  deleting; the history matters for retros.

## Format

```
### B-001 — [short title]
- **Status:** open
- **Severity:** minor
- **Reported:** YYYY-MM-DD
- **Found in:** (milestone, build version, or "dev")
- **Repro:** numbered steps
- **Expected / actual:**
- **Owner:**
- **Notes:**
```

Newest bugs at the top. Next available ID: B-001.

---

_No bugs filed yet._
