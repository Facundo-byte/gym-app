import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

// Private test server changes worker bytes to exercise the real update lifecycle.
// It never edits production files or registers a test endpoint in the application.
const root = resolve('.pwa-test-dist')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ttf': 'font/ttf' }
let revision = 0
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1:4177').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path === '/__pwa_fixture/revision' && request.method === 'POST') {
    revision++
    response.end(String(revision))
    return
  }
  const file = resolve(root, `.${decodeURIComponent(path)}`)
  if (!file.startsWith(`${root}${sep}`)) {
    if (path === '/') { response.setHeader('Content-Type', 'text/html'); response.end(await readFile(resolve(root, 'index.html'))); return }
    response.writeHead(404).end()
    return
  }
  try {
    const bytes = await readFile(file)
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
    response.end(path === '/sw.js' ? Buffer.concat([bytes, Buffer.from(`\n// Private test revision ${revision}\n`)]) : bytes)
  } catch {
    if (extname(file) || path.startsWith('/api/')) { response.writeHead(404).end(); return }
    response.setHeader('Content-Type', 'text/html')
    response.end(await readFile(resolve(root, 'index.html')))
  }
})
server.listen(4177, '127.0.0.1')
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)))
