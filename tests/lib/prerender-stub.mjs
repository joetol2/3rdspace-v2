// Build the site with the Google Calendar feed stubbed out.
//
// Same work as scripts/prerender.mjs, but the feed is faked at the Node fetch
// layer, so the prerendered HTML and calendar-events.json carry known events
// without needing to reach calendar.google.com. That makes the calendar tests
// deterministic, and lets them run somewhere with no access to the real feed.
// Nothing in src/ is touched.
//
//   bun run build && bun tests/lib/prerender-stub.mjs
import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:stub-quilting-guild@3rdspace',
  'SUMMARY:Quilting Guild Meetup',
  'DTSTART;TZID=America/Los_Angeles:20991014T100000',
  'DTEND;TZID=America/Los_Angeles:20991014T120000',
  'DESCRIPTION:Setup minutes: 0\\nCleanup minutes: 0',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:stub-poetry@3rdspace',
  'SUMMARY:Poetry Night',
  'DTSTART;TZID=America/Los_Angeles:20991020T180000',
  'DTEND;TZID=America/Los_Angeles:20991020T200000',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

const realFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url
  if (url.includes('calendar.google.com')) {
    console.log('  [stub] serving fake ics for', url.slice(0, 60))
    return new Response(ICS, { status: 200, headers: { 'content-type': 'text/calendar' } })
  }
  return realFetch(input, init)
}

const { default: handler } = await import(
  resolve(root, 'node_modules/.nitro/vite/services/ssr/index.js')
)
const publicDir = resolve(root, '.output/public')

async function render(routePath) {
  const res = await handler.fetch(
    new Request(`http://localhost${routePath}`, { headers: { accept: 'text/html' } }), {}, {})
  if (!res.ok) { console.error('FAILED', routePath, res.status); process.exit(1) }
  return await res.text()
}

const home = await render('/')
writeFileSync(resolve(publicDir, 'index.html'), home)
copyFileSync(resolve(publicDir, 'index.html'), resolve(publicDir, '404.html'))

const cal = await render('/calendar/')
mkdirSync(resolve(publicDir, 'calendar'), { recursive: true })
writeFileSync(resolve(publicDir, 'calendar/index.html'), cal)

// Write the same-origin JSON from the stubbed feed, the way
// scripts/build-calendar-json.ts does in the real build.
// Needs a runtime that reads TypeScript directly, so run this with bun.
const { fetchCalendarEvents } = await import(resolve(root, 'src/lib/calendar.ts'))
  .catch(() => ({ fetchCalendarEvents: null }))
if (fetchCalendarEvents) {
  writeFileSync(resolve(publicDir, 'calendar-events.json'),
    JSON.stringify(await fetchCalendarEvents()))
  console.log('wrote calendar-events.json')
}

console.log('baked events into calendar/index.html:',
  /Quilting Guild Meetup/.test(cal) ? 'YES' : 'NO')
console.log('baked into 404.html (the SPA fallback):',
  /Quilting Guild Meetup/.test(home) ? 'YES' : 'NO')
