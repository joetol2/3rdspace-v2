import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const ssrEntry = resolve(root, 'node_modules/.nitro/vite/services/ssr/index.js')

const basePath = process.env.BASE_PATH ?? '/'
const origin = `http://localhost${basePath}`.replace(/\/$/, '')

console.log('Loading SSR bundle:', ssrEntry)
const { default: handler } = await import(ssrEntry)

const publicDir = resolve(root, '.output/public')
mkdirSync(publicDir, { recursive: true })

async function renderRoute(routePath) {
  const url = `${origin}${routePath}` || `${origin}/`
  console.log('Rendering', url)
  const request = new Request(url, {
    headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  })
  const response = await handler.fetch(request, {}, {})
  console.log('Status:', response.status)

  if (!response.ok) {
    console.error('SSR rendered', url, 'with status', response.status, '— aborting')
    process.exit(1)
  }

  const html = await response.text()
  console.log('HTML size:', html.length, 'bytes')
  return html
}

// Prerender the homepage. This also becomes the 404.html SPA fallback used
// by GitHub Pages for any route not explicitly prerendered below.
const homeHtml = await renderRoute('/')
writeFileSync(resolve(publicDir, 'index.html'), homeHtml)
copyFileSync(resolve(publicDir, 'index.html'), resolve(publicDir, '404.html'))
console.log('Written: .output/public/index.html')
console.log('Written: .output/public/404.html')

// The calendar route fetches Google Calendar's public .ics feed via a
// loader. That fetch only works server-side (Node's fetch isn't subject to
// CORS) — done client-side in a visitor's browser it's silently blocked by
// CORS, since Google's feed doesn't send Access-Control-Allow-Origin. So we
// have to prerender /calendar specifically to bake real event data into the
// static HTML at build time, rather than relying on the homepage fallback +
// client-side hydration used for every other route.
//
// Prerendering only covers people who arrive by a hard page load. Clicking a
// <Link> to /calendar never requests this file at all — the router just runs
// the loader again in the browser, where the Google fetch is blocked and the
// calendar came up empty. scripts/build-calendar-json.ts writes the same
// events to calendar-events.json on our own origin for that path; run it
// alongside this script (the deploy workflow does).
// Request with the trailing slash — the router is configured with
// trailingSlash: 'always' (see src/router.tsx), so a request for
// '/calendar' without it now gets a 307 redirect instead of rendering,
// which renderRoute treats as a fatal, build-breaking error.
const calendarHtml = await renderRoute('/calendar/')
const calendarDir = resolve(publicDir, 'calendar')
mkdirSync(calendarDir, { recursive: true })
writeFileSync(resolve(calendarDir, 'index.html'), calendarHtml)
console.log('Written: .output/public/calendar/index.html')
