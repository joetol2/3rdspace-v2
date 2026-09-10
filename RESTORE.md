# Falling back

Archive point: **10 September 2026**, before the rework of the request,
accept and deny process.

The website is in git and can be restored exactly. The rest of the system is
in Google and cannot — that half has to be archived by hand, and this page
says how.

## The archive refs

| Repo | Branch |
|---|---|
| `joetol2/3rdspace-v2` (live site) | `archive/2026-09-10` |
| `joetol2/3rdSpace` (v1, retired) | `archive/2026-09-10` |

The branch name is the reference throughout, never a commit id. A commit id
written into this file is out of date the moment the file is committed.

Do not push to either branch. They exist to be read.

## Restoring the website

To look at the old state without changing anything:

```sh
git fetch origin archive/2026-09-10
git checkout archive/2026-09-10
```

To put the live site back to it:

```sh
git checkout main
git fetch origin archive/2026-09-10
git revert --no-commit origin/archive/2026-09-10..HEAD   # undo everything since
git commit -m "Roll back to the 10 September 2026 archive"
git push origin main
```

`revert` is deliberate rather than `reset --hard`: it moves forward to the
old state instead of erasing what happened in between, so the rollback
itself can be undone. Pushing to `main` triggers a deploy, and the site is
back within about a minute.

This was tested, not assumed: against a branch that had added a file,
deleted a file and edited a third, the sequence above brought the tree back
byte for byte identical to the archive.

To take one file back rather than everything:

```sh
git checkout archive/2026-09-10 -- path/to/file
```

## What is NOT in this repo

The website is one of two halves. The other half lives in the
**3rdspacesyv@gmail.com** Google account, and none of it is in git:

| Thing | Where | If it is lost |
|---|---|---|
| The Apps Script | Apps Script project bound to the responses sheet | `google-apps-script/mailing-list.gs` here is a verified copy as of 10 Sep 2026 &mdash; see below |
| The request form | Google Forms | Rebuilt by hand from a copy |
| The responses sheet | Google Sheets | **Not recoverable.** It holds every request ever made and the mailing list |
| The calendar | Google Calendar | Bookings gone; the site's copy only covers a rolling window |
| The Contacts label | Google Contacts | Rebuilt by the sync, from the sheet |

**The sheet is the one that matters.** It carries live personal data — names
and email addresses of everyone who has signed up. Both repos are **public**,
so that export must never be committed here. Keep the Google archive in
Google Drive.

### The script was checked against what is deployed

On 10 September 2026 the live script was copied out of the Apps Script
editor and compared against `google-apps-script/mailing-list.gs`. They
matched:

- 79 functions, same names, same order
- 40 top-level constants, same names and order, and every value identical
- `HEADERS` (14) and `SPACE_REQUEST_HEADERS` (33) identical, in order
- all 12 `to:` recipients and all 4 `replyTo:` identical
- `handleDecisionSubmit` identical line for line

So this copy is good as of that date. What was compared is the inventory,
every constant, the column contracts, the email routing, and the decision
handler — not every line of all 79 function bodies.

The `Last updated: August 26` comment at the top is stale in **both**
copies, so it is not a drift signal and should not be read as one. It was
left alone deliberately: editing the file immediately after verifying it
matches would have undone the verification.

This drifts the moment anyone edits the script in Google without committing
the change here. After the request-flow rework, check it again.

## The Google half of the archive

In the 3rdspacesyv@gmail.com account:

1. **Apps Script** — open the project, `File > Download`, and also make a
   named version: `Deploy > Manage deployments`, or in the editor use the
   version history so there is a labelled point to return to.
2. **Responses sheet** — `File > Make a copy`, name it
   `ARCHIVE 2026-09-10 — Request Form Responses`, and put it in a Drive
   folder called `3RD SPACE archive 2026-09-10`. Also
   `File > Download > Microsoft Excel (.xlsx)` for a copy outside Google.
3. **The form** — open it, three-dot menu, `Make a copy`, name it
   `ARCHIVE 2026-09-10 — Request Form`. A copy preserves the questions;
   it does not preserve the responses, which is what step 2 is for.
4. **Calendar** — Google Calendar settings, the 3RD SPACE calendar,
   `Export calendar`. That gives a `.ics` file. Put it in the same folder.

Steps 2 and 3 take about a minute each and are the two that cannot be
reconstructed from anything else.

## What the archive does not protect against

Deleting the Google account, or losing access to it. Everything above lives
in one Gmail account. If that account is lost, the website survives and
nothing else does.
