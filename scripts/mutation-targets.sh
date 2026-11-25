#!/usr/bin/env bash
# Comma-separated logic files a PR must leave without surviving mutants: every changed
# source file plus the source file behind every changed test. Components, context, i18n
# and icons are covered by behaviour tests instead and stay out.
set -euo pipefail
base="$1"
git diff --name-only --diff-filter=AMR "$base"...HEAD -- src tests |
  while read -r f; do
    case "$f" in
      tests/*.test.ts | tests/*.test.tsx)
        src="src/${f#tests/}"
        src="${src%.test.ts*}"
        for ext in .ts .tsx; do [ -f "$src$ext" ] && echo "$src$ext"; done
        ;;
      *) echo "$f" ;;
    esac
  done |
  grep -E '^src/.*\.tsx?$' |
  grep -vE '\.d\.ts$|^src/main\.tsx$|^src/presentation/(components|context|i18n)/' |
  sort -u | paste -sd, -
