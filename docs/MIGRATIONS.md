# Migrations

Owned by: Lead + Build/Tooling Engineer. Use this to keep game repos current
with core scaffold improvements.

## Upstream sync (for repos created from GitHub template)

This procedure assumes:
- your game repo is `origin`
- core scaffold repo is `upstream` (`samcotroneo/CrunchTime`)

### Agent-run checklist
1. Ensure clean working tree on `main` (or your default branch).
2. Add/update `upstream` remote.
3. Fetch `upstream`.
4. Create a dated sync branch.
5. Merge `upstream/main` into sync branch.
6. If first merge fails due to unrelated history, retry once with
   `--allow-unrelated-histories`.
7. Resolve conflicts, commit merge, push sync branch, open PR.
8. Run scaffold refresh commands in the game repo.

### Commands
```bash
# one-time setup (safe if remote already exists: update URL)
git remote add upstream https://github.com/samcotroneo/CrunchTime.git || true
git remote set-url upstream https://github.com/samcotroneo/CrunchTime.git

# start sync
git checkout main
git pull --ff-only origin main
git fetch upstream
git checkout -b sync/upstream-YYYYMMDD

# normal path
git merge upstream/main

# first-sync fallback only (if unrelated-history error)
git merge upstream/main --allow-unrelated-histories
```

### After merge
Run these from repo root:

```bash
node tools/setup.mjs
node tools/project-init/init-project.mjs
```

Notes:
- `tools/setup.mjs` is safe to re-run and will resync mirrors/tooling.
- Re-running `tools/project-init/init-project.mjs` refines docs and can
  restamp `docs/ARCHITECTURE.md` when engine selection changes.
- Prefer doing upstream syncs as PRs, not direct commits to `main`.
