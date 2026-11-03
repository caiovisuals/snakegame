import { createServer } from 'http'
import { readFileSync, statSync } from 'fs'
import { join, extname, normalize, sep } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = 3000

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

// Somente estes caminhos podem ser servidos ao navegador.
// Qualquer outro arquivo do projeto (server.js, package.json, .git, ...) fica inacessível.
const PUBLIC_ENTRIES = new Set(['index.html', 'game', 'credits', 'css', 'js', 'assets'])
const BLOCKED_FILES = new Set([join('js', 'multiplayer', 'server.js')])

function resolvePublicPath(url) {
    let pathname
    try {
        pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
    } catch {
        return null
    }

    if (pathname.includes('\0')) return null
    if (pathname === '/') pathname = '/index.html'

    const relative = normalize(pathname).replace(/^[/\\]+/, '')
    const segments = relative.split(sep)

    if (segments.some(segment => segment === '..' || segment.startsWith('.'))) return null
    if (!PUBLIC_ENTRIES.has(segments[0])) return null
    if (BLOCKED_FILES.has(relative)) return null

    const filePath = join(__dirname, relative)
    if (!filePath.startsWith(__dirname + sep)) return null

    return filePath
}

function sendNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 - Arquivo não encontrado')
}

const server = createServer((req, res) => {
    let filePath = resolvePublicPath(req.url)
    if (!filePath) return sendNotFound(res)

    try {
        const stat = statSync(filePath)
        if (stat.isDirectory()) {
            filePath = join(filePath, 'index.html')
        }

        const ext = extname(filePath)
        const contentType = mimeTypes[ext] || 'application/octet-stream'

        const content = readFileSync(filePath)
        res.writeHead(200, {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff'
        })
        res.end(content)
    } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
            sendNotFound(res)
        } else {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('500 - Erro interno do servidor')
        }
    }
})

server.listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`)
    console.log(`Acesse: http://localhost:${PORT}`)
})
