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

## Mailing list setup (Google Apps Script)

The motto section signup and the full `/join` page both submit to a Google Apps Script Web App, which writes rows into the "Contact List" tab of the 3RD SPACE Google Sheet. The script lives in this repo at `google-apps-script/mailing-list.gs` and needs to be deployed once from script.google.com.

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
11. Test the motto section signup.
12. Test the full Join page.
13. Confirm both write into the Contact List tab.
14. Confirm submitting the same email again updates that row instead of creating a duplicate.

While `MAILING_LIST_SCRIPT_URL` is still a placeholder, both forms show the "Something went wrong" error instead of silently pretending to succeed.

### Email notifications

Every submission (new or updated) also sends a notification email to the addresses in `NOTIFY_EMAILS` near the top of `google-apps-script/mailing-list.gs` (currently `3rdspacesyv@gmail.com` and `laurabnewman@gmail.com`). The notification's reply-to is set to the person who submitted the form, so replying reaches them directly. To change who gets notified, edit `NOTIFY_EMAILS` and redeploy.

Sending email is a new permission for the script, so the first deploy (or redeploy) after this change will prompt you to re-authorize it in the "Deploy" flow. If notification emails ever stop arriving, check **Executions** in script.google.com for errors; the Contact List row still saves even if the notification email fails.

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
- Google Apps Script + Google Sheets (mailing list signup, see above)

No backend, database, authentication, or payment processing is required.
