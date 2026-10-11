#!/usr/bin/env bash
# publish.sh [--minor|--major] "<what changed>" — every change to this skill becomes a version on GitHub.
#
# The repository (video-production-skill) is the source of truth; install.sh REPLACES the installed
# folder with it, so a change made only in the installed folder is lost at the next install (failure-log
# #56–#66 were, until v1.1.0). This copies the installed folder into the repository clone, bumps VERSION,
# adds a CHANGELOG line, commits, tags vX.Y.Z and pushes.
#
# Refuses (changes nothing) when:
#   • the clone has uncommitted edits, or cannot fast-forward to origin;
#   • the repository's skill folder changed since this folder was last published — someone pushed a
#     change this folder does not have: run install.sh (or merge by hand) first, then publish.
# The clone: $VP_REPO, else the path in <skill>/.repo-path, else <repo>.
set -euo pipefail
BUMP=patch
case "${1:-}" in --minor) BUMP=minor; shift;; --major) BUMP=major; shift;; esac
MSG="${1:?usage: publish.sh [--minor|--major] \"what changed\"}"

SKILL="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${VP_REPO:-$( [ -f "$SKILL/.repo-path" ] && cat "$SKILL/.repo-path" || echo "<repo>")}"
DEST="$REPO/skills/video-production"
[ -d "$REPO/.git" ] || { echo "no repository clone at $REPO (set VP_REPO or $SKILL/.repo-path)"; exit 2; }

cd "$REPO"
[ -z "$(git status --porcelain)" ] || { echo "REFUSED: $REPO has uncommitted changes"; git status --short | head; exit 3; }
git pull --ff-only -q || { echo "REFUSED: the clone cannot fast-forward to origin"; exit 3; }

# has the repository's copy moved since this folder was last published?
if [ -f "$SKILL/.published" ]; then
  BASE="$(cat "$SKILL/.published")"
  if ! git diff --quiet "$BASE" HEAD -- skills/video-production 2>/dev/null; then
    echo "REFUSED: skills/video-production changed on GitHub since $BASE — this folder does not have it."
    git log --oneline "$BASE"..HEAD -- skills/video-production | head
    echo "Run install.sh to take it (and re-apply your change), then publish again."; exit 3
  fi
fi

# copy the installed folder in (never its local .git or the publish markers)
find "$DEST" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
( cd "$SKILL" && tar --exclude=.git --exclude=.published --exclude=.repo-path -cf - . ) | ( cd "$DEST" && tar -xf - )

OLD="$(cat "$DEST/VERSION" 2>/dev/null || echo 0.0.0)"
IFS=. read -r MA MI PA <<< "$OLD"
case "$BUMP" in major) MA=$((MA+1)); MI=0; PA=0;; minor) MI=$((MI+1)); PA=0;; patch) PA=$((PA+1));; esac
NEW="$MA.$MI.$PA"
echo "$NEW" > "$DEST/VERSION"; echo "$NEW" > "$SKILL/VERSION"

if git diff --quiet && [ -z "$(git ls-files --others --exclude-standard)" ] && [ "$OLD" = "$NEW" ]; then echo "nothing to publish"; exit 0; fi
TODAY="$(date +%Y-%m-%d)"
{ printf '# Changelog\n\n## v%s — %s\n- %s\n' "$NEW" "$TODAY" "$MSG"; [ -f CHANGELOG.md ] && tail -n +2 CHANGELOG.md; } > CHANGELOG.md.new && mv CHANGELOG.md.new CHANGELOG.md

git add -A skills/video-production CHANGELOG.md
git commit -q -m "release: v$NEW — $MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag -a "v$NEW" -m "v$NEW — $MSG"
git push -q origin HEAD --follow-tags
git rev-parse HEAD > "$SKILL/.published"
echo "published v$NEW → $(git remote get-url origin) ($(git rev-parse --short HEAD))"
