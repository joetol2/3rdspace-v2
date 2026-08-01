# 3RD SPACE — Santa Ynez

A one-page community website for 3RD SPACE.

## Run locally

```bash
bun install
bun run dev
```

## Replace embed URLs

Open `src/config/site.ts` and replace the placeholder constants:

- `GOOGLE_CALENDAR_EMBED_URL` — iframe `src` from Google Calendar share settings.
- `GOOGLE_CALENDAR_PUBLIC_LINK` — public calendar link (fallback).
- `TALLY_FORM_EMBED_URL` — Tally form iframe URL.
- `TALLY_FORM_DIRECT_LINK` — Tally form direct link (fallback).
- `CAL_COM_EMBED_URL` — optional Cal.com booking iframe.
- `CAL_COM_DIRECT_LINK` — Cal.com direct link (fallback).

While a placeholder is still in place, the section shows a friendly notice instead of an iframe.

## Forms setup (Google Apps Script)

The motto section signup, the full `/join` page, and the Request Space form (`/request`) all submit to one Google Apps Script Web App. The script lives in this repo at `google-apps-script/mailing-list.gs` and needs to be deployed once from script.google.com.

1. Open the Google Sheet.
2. Go to Extensions.
3. Open Apps Script.
4. Paste the code from `google-apps-script/mailing-list.gs`.
5. Save the project.
6. Deploy as a Web App.
7. Set "Execute as" to yourself.
8. Set access to "Anyone" or "Anyone with the link".
9. Copy the Web App URL.
10. Paste it into `MAILING_LIST_SCRIPT_URL` in `src/config/site.ts`.
11. Test the motto section signup and confirm it writes into the "Contact List" tab.
12. Test the full Join page and confirm it also writes into "Contact List", and that submitting the same email again updates that row instead of creating a duplicate.
13. Test the Request Space form and confirm it writes a new row into the "Space Requests" tab (created automatically the first time someone submits, if it doesn't already exist).

While `MAILING_LIST_SCRIPT_URL` is still a placeholder, all three forms show the "Something went wrong" error instead of silently pretending to succeed.

Whenever you edit `google-apps-script/mailing-list.gs`, remember the Web App only picks up the change after you redeploy: **Deploy → Manage deployments → edit (pencil icon) → Version dropdown → New version → Deploy**. Running a function manually from the editor's Run button always uses the latest saved code regardless of deployment version, which is handy for testing but not a substitute for redeploying.

### Email notifications

Every submission also sends a notification email to the addresses in `NOTIFY_EMAILS` near the top of `google-apps-script/mailing-list.gs` (currently `3rdspacesyv@gmail.com` and `laurabnewman@gmail.com`). The notification's reply-to is set to the person who submitted the form, so replying reaches them directly. To change who gets notified, edit `NOTIFY_EMAILS` and redeploy.

Sending email is a permission the script needs, so the first deploy (or redeploy) after this change may prompt you to re-authorize it in the "Deploy" flow. If notification emails ever stop arriving, check **Executions** in script.google.com for errors, or run `sendTestNotification` / `sendTestSpaceRequestNotification` directly from the editor's Run button for an immediate, reliable log of what happened. The underlying sheet row still saves even if the notification email fails.

### Approving or declining a space request

The staff notification email for a Request Space submission includes **Approve** and **Decline** buttons. Clicking one opens a confirmation page (not an instant action) showing the request's name, date, time, and type of use, plus an optional note field, so a mail app's link-safety scanner auto-opening the email can't silently approve or decline something nobody actually clicked. Confirming there:

- Emails the requester with an approval or decline message (including your note, if you wrote one).
- On approval, adds the event to the 3RD SPACE Google Calendar (the same one embedded on the site). The event title follows what the requester chose for "How should this booking appear on the public calendar?": their type of use (e.g. "Community gathering") if they chose to show the event name, or a generic "Booked" / "Unavailable" otherwise, so private details never leak onto the public calendar.
- Colors the row in the "Space Requests" tab light green (approved) or light red (declined), and sets its Status column.
- Is safe to click only once: reusing an old link, or a second person clicking after someone already decided, shows "already approved/declined" instead of double-processing.

This needs two things beyond the base setup above:

1. **Calendar permission**: `CalendarApp` is a new permission for the script, so redeploying after this change may prompt another authorization step. Approve it, or approved requests will fail to create a calendar event (the row still gets marked Approved and the requester still gets emailed; check Executions for a "Failed to..." error if the event doesn't show up on the calendar).
2. **Project time zone**: in the Apps Script editor, go to **Project Settings** and make sure the time zone is set to `America/Los_Angeles`, matching the site's calendar embed (`ctz` in `GOOGLE_CALENDAR_EMBED_URL`). Otherwise approved events can land on the calendar at the wrong hour.

## Replace logo and hero assets

Brand assets are stored as Lovable asset pointers in `src/assets/`:

- `3rdspace-logo.png.asset.json` (header + hero card)
- `3rdspace-hero.png.asset.json` (hero background + social preview)

To swap, replace the underlying image and re-generate the pointer, or update the `url` field in the JSON to a hosted image URL.

## Deploy

This is a static-friendly TanStack Start app. For pure static hosting (Cloudflare Pages / GitHub Pages), build the site and publish the build output:

```bash
bun run build
```

- **Cloudflare Pages**: connect the GitHub repo, set build command `bun run build`, output directory per the build log.
- **GitHub Pages**: push the build output to the `gh-pages` branch or use a GitHub Actions workflow.

## Stack

- React 19 + TypeScript
- TanStack Start + TanStack Router
- Tailwind CSS v4
- Vite 7

## External services required

- Google Calendar (public calendar embed)
- Tally (form embed)
- Cal.com (optional walkthrough scheduling)
- Google Apps Script + Google Sheets (mailing list, Join, and Request Space forms, see above)

No backend, database, authentication, or payment processing is required.
