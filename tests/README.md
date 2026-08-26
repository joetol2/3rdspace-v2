# Tests

```sh
./tests/run.sh          # everything
./tests/run.sh --unit   # just the Apps Script tests: fast, no build, no browser
```

Nothing here runs in CI. These are here to be run by hand before pasting a new
version of the Apps Script into Google, or before pushing a change to the
calendar or the internal doc pages.

## What is covered

| File | What it checks |
|---|---|
| `contacts.test.cjs` | The mailing list and Contacts sync, in `google-apps-script/mailing-list.gs` |
| `calendar-nav.test.mjs` | The calendar keeps its events however you arrive at the page |
| `calendar-failure.test.mjs` | A feed that cannot be read says so, instead of looking like a quiet week |
| `docs.test.mjs` | Content, nav integrity and mobile layout of the two internal doc pages |
| `nav.test.mjs` | The sidebar stays put, the scrollspy follows, the mobile drawer works |

## contacts.test.cjs

The only one worth running constantly: no browser, no build, about a second.

It loads `google-apps-script/mailing-list.gs` from the repo and evaluates it
with `SpreadsheetApp`, `People`, `MailApp`, `LockService` and friends replaced
by fakes. That is enough to exercise every branch, and it means the tests
cannot drift away from what actually ships, because they read the same file
you paste into Google.

It is `.cjs` rather than `.js` because the repo is `"type": "module"` and this
needs `require` and `__dirname`.

Some of what it pins down, each of which was a real bug:

- The `Subscribed` column is found by **name**, not position. The live Contact
  List sheet has columns beyond the fourteen the script knows about, so
  "append at the end" put it on top of an occupied column. The real 22-column
  header row is in the test.
- Removals only ever touch contacts the script created, so anyone added to the
  Contacts label by hand is left alone.
- A run that would remove too much refuses and emails instead, so a sorted or
  half-cleared sheet cannot quietly empty the mailing list.
- A mistyped address is reported rather than skipped in silence.
- Size warnings fire once on crossing 400 and 500, not daily.

## The browser tests

These need a built site and playwright.

`run.sh` handles the build, including `tests/lib/prerender-stub.mjs`, which
builds with the Google Calendar feed faked at the fetch layer. That keeps the
calendar tests deterministic and lets them run with no access to the real
feed. It needs `bun`, because it imports the TypeScript directly.

Playwright is found in this order: `PLAYWRIGHT_MODULE`, then a project
dependency, then a global install. A chromium at `/opt/pw-browsers/chromium`
is used if present, otherwise playwright picks its own. Override with
`PLAYWRIGHT_CHROMIUM`.

### One thing to keep in mind

Both doc pages set `overflow-x: clip` on `html` and `body`. That means
`scrollWidth` can **never** exceed `clientWidth` — the page cannot scroll
sideways because the overflow is cropped, not because it fits. A
"no horizontal overflow" assertion built on `scrollWidth` therefore passes
while the right-hand half of every heading is being cut off, which is exactly
what happened. `overflowProbe` in `lib/harness.mjs` measures where elements
actually land instead. Use it rather than writing that check again.

The same trap turns up in `scrollHeight`, which clamps to `clientHeight` when
nothing overflows, so `scrollHeight <= clientHeight` is true by construction.
The nav-fit checks measure the last child's position instead, and require real
headroom rather than a one-pixel squeak.
