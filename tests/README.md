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
| `stamp.test.cjs` | The script's `Last updated` header is real: edit the code without re-stamping and this fails |
| `conflicts.test.cjs` | How wide a booking is. A recurring series end date is not a three-week booking |
| `contacts.test.cjs` | The mailing list and Contacts sync, in `google-apps-script/mailing-list.gs` |
| `requester-contacts.test.cjs` | Space requesters land on the Contact List, and nobody is subscribed who did not ask |
| `decision-flow.test.cjs` | The approve/decline flow, switched off. Runs the real script BOTH ways |
| `staff-approve.test.mjs` | Old decision links from existing emails are refused, and post nothing |
| `recurrence.test.ts` | Recurring calendar events expand to every occurrence, not just the first |
| `calendar-nav.test.mjs` | The calendar keeps its events however you arrive at the page, and the Upcoming list shows a booking once rather than every occurrence of it |
| `calendar-failure.test.mjs` | A feed that cannot be read says so, instead of looking like a quiet week |
| `docs.test.mjs` | Content, nav integrity and mobile layout of the two internal doc pages |
| `nav.test.mjs` | The sidebar stays put, the scrollspy follows, the mobile drawer works |
| `diagram.test.mjs` | No wire label on the system map sits on another label or on the text underneath |
| `workflow.test.mjs` | The workflow page: content, the swimlane grid, and that no card is stranded from its stage on a phone |

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

## stamp.test.cjs

`google-apps-script/mailing-list.gs` is maintained by pasting it into the Apps
Script editor, so its `// Last updated:` header has one job: telling you
whether what you are holding is newer than what is already in Google.

Typed by hand it failed at that job. It sat at 26 August through several
changes and was read as proof the file had not been updated when it had.

So `python3 scripts/stamp-gs.py` writes both the timestamp and a fingerprint,
which is the first eight hex of a SHA-256 of everything from the first
constant to the end of the file. This test recomputes it. Change the code
without stamping and it fails, telling you what to run.

The header prose sits outside the fingerprint on purpose: rewording an
explanation should not masquerade as a new version of the script. There is a
test for that boundary too, because if the marker ever moved above the header
then every comment edit would start demanding a re-stamp.

## decision-flow.test.cjs

The Approve/Decline flow is switched off by `DECISION_FLOW_ENABLED`, a single
constant in `google-apps-script/mailing-list.gs` with a twin in
`src/config/site.ts`. This file flips that constant in the source text before
evaluating it, so it can run the real script in both states.

That is the point of using a flag rather than commenting the code out.
Commented-out code cannot be tested at all, so nothing notices it rotting
until somebody tries to switch it back on.

It also guards against testing the wrong thing: if the `false` line it
searches for ever stops matching, it fails immediately rather than running the
"switched off" half against a switched-on script.

One false pass caught while writing it, worth not repeating. The digest test
originally used a row marked `Received`, and passed whether the guard was
present or not, because `sendPendingDigest` only ever looked for `Pending`. It
now uses a `Pending` row, plus a control that proves the same row DOES produce
an email when the flow is on.

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

`diagram.test.mjs` carries a self-check for the same reason: before trusting a
clean result it parks one label exactly on another and fails if that goes
unreported. It also measures tight glyph boxes rather than element boxes, since
a `.node__desc` spans its whole card and comparing element rects invents
collisions that are not there.
