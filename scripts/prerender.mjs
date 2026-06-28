import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const ssrEntry = resolve(root, 'node_modules/.nitro/vite/services/ssr/index.js')

const basePath = process.env.BASE_PATH ?? '/'
const url = `http://localhost${basePath}`

console.log('Loading SSR bundle:', ssrEntry)
const { default: handler } = await import(ssrEntry)

const request = new Request(url, {
  headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
})

console.log('Rendering', url)
const response = await handler.fetch(request, {}, {})
console.log('Status:', response.status)

if (!response.ok) {
  console.error('SSR rendered', url, 'with status', response.status, '— aborting')
  process.exit(1)
}

const html = await response.text()
console.log('HTML size:', html.length, 'bytes')

const publicDir = resolve(root, '.output/public')
mkdirSync(publicDir, { recursive: true })

writeFileSync(resolve(publicDir, 'index.html'), html)
copyFileSync(resolve(publicDir, 'index.html'), resolve(publicDir, '404.html'))

console.log('Written: .output/public/index.html')
console.log('Written: .output/public/404.html')
