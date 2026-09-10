# Falling back

Archive point: **10 September 2026**, before the rework of the request,
accept and deny process.

The website is in git and can be restored exactly. The rest of the system is
in Google and cannot — that half has to be archived by hand, and this page
says how.

## The archive refs

| Repo | Branch | Commit |
|---|---|---|
| `joetol2/3rdspace-v2` (live site) | `archive/2026-09-10` | `dbeecb2` |
| `joetol2/3rdSpace` (v1, retired) | `archive/2026-09-10` | `a4d17d0` |

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
git revert --no-commit dbeecb2..HEAD    # undo everything since the archive
git commit -m "Roll back to the 10 September 2026 archive"
git push origin main
```

`revert` is deliberate rather than `reset --hard`: it moves forward to the
old state instead of erasing what happened in between, so the rollback
itself can be undone. Pushing to `main` triggers a deploy, and the site is
back within about a minute.

To take one file back rather than everything:

```sh
git checkout archive/2026-09-10 -- path/to/file
```

## What is NOT in this repo

The website is one of two halves. The other half lives in the
**3rdspacesyv@gmail.com** Google account, and none of it is in git:

| Thing | Where | If it is lost |
|---|---|---|
| The Apps Script | Apps Script project bound to the responses sheet | `google-apps-script/mailing-list.gs` here is the source of truth for the code, but see the warning below |
| The request form | Google Forms | Rebuilt by hand from a copy |
| The responses sheet | Google Sheets | **Not recoverable.** It holds every request ever made and the mailing list |
| The calendar | Google Calendar | Bookings gone; the site's copy only covers a rolling window |
| The Contacts label | Google Contacts | Rebuilt by the sync, from the sheet |

**The sheet is the one that matters.** It carries live personal data — names
and email addresses of everyone who has signed up. Both repos are **public**,
so that export must never be committed here. Keep the Google archive in
Google Drive.

### Warning about the script

`google-apps-script/mailing-list.gs` is what *should* be running, not proof
of what *is*. It is pasted into Google by hand, so the two can drift, and the
`Last updated` comment at the top of the file is stale — it says 26 August
while the file has been changed since. Before trusting this copy, open the
Apps Script editor and compare.

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
