#!/usr/bin/env bash
# Comma-separated logic files a PR must leave without surviving mutants: every changed
# source file plus the source file behind every changed test. Components, context, i18n
# and icons are covered by behaviour tests instead and stay out, as are main.tsx and App.tsx.
set -euo pipefail
base="$1"
# A deleted test counts too: removing it can leave its source with surviving mutants.
git diff --name-only --diff-filter=AMRD "$base"...HEAD -- src tests |
  while read -r f; do
    case "$f" in
      tests/*.test.ts | tests/*.test.tsx)
        stem="src/${f#tests/}"
        stem="${stem%.test.ts*}"
        # Event.restore.test.ts belongs to Event.ts: drop dotted parts until a source exists.
        while :; do
          src=""
          for ext in .ts .tsx; do [ -f "$stem$ext" ] && src="$stem$ext"; done
          if [ -n "$src" ]; then echo "$src"; break; fi
          case "$(basename "$stem")" in *.*) stem="${stem%.*}" ;; *) break ;; esac
        done
        ;;
      *) [ -f "$f" ] && echo "$f" ;;
    esac
  done |
  grep -E '^src/.*\.tsx?$' |
  grep -vE '\.d\.ts$|^src/(main|App)\.tsx$|^src/presentation/(components|context|i18n)/' |
  sort -u | paste -sd, -
