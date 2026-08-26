#!/usr/bin/env bash
# Run every test. Builds the site with a stubbed calendar feed first, so the
# browser tests are deterministic and need no network.
#
#   ./tests/run.sh            everything
#   ./tests/run.sh --unit     just the Apps Script tests (fast, no build)
set -uo pipefail

cd "$(dirname "$0")/.."
PORT="${TEST_PORT:-8943}"
failed=0

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
track() { if [ "$1" -ne 0 ]; then failed=1; fi; }

step "Apps Script: mailing list, contacts sync, space requests"
node tests/contacts.test.cjs
track $?

if [ "${1:-}" = "--unit" ]; then
  [ "$failed" -eq 0 ] && echo -e "\nAll unit tests passed." || echo -e "\nSome tests FAILED."
  exit "$failed"
fi

step "Building the site (calendar feed stubbed)"
bun run build >/dev/null || { echo "build failed"; exit 1; }
if command -v bun >/dev/null; then
  bun tests/lib/prerender-stub.mjs || { echo "prerender failed"; exit 1; }
else
  echo "bun is needed for the stubbed prerender (it reads the TypeScript directly)"
  exit 1
fi

# The doc pages are committed as static HTML under public/, and the build does
# not copy them into .output. Put them where the server will find them.
for p in how_it_works/index.html how_it_works/guide/index.html \
         how_it_works/diagram/index.html staff-approve/gevalt/index.html; do
  if [ -f "public/$p" ]; then
    mkdir -p ".output/public/$(dirname "$p")"
    cp "public/$p" ".output/public/$p"
  fi
done

step "Serving .output/public on :$PORT"
python3 tests/lib/serve.py "$PORT" &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 0.25
done

for t in calendar-nav calendar-failure docs nav diagram; do
  step "Browser: $t"
  node "tests/$t.test.mjs"
  track $?
done

if [ "$failed" -eq 0 ]; then
  printf '\n\033[32mAll tests passed.\033[0m\n'
else
  printf '\n\033[31mSome tests FAILED.\033[0m\n'
fi
exit "$failed"
