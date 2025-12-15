import { createServer } from 'http'
import { readFileSync, statSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = 3000

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

const server = createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url
    filePath = join(__dirname, filePath)

    try {
        const stat = statSync(filePath)
        if (stat.isDirectory()) {
            filePath = join(filePath, 'index.html')
        }

        const ext = extname(filePath)
        const contentType = mimeTypes[ext] || 'text/plain'

        const content = readFileSync(filePath)
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(content)
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(404)
            res.end('404 - Arquivo não encontrado')
        } else {
            res.writeHead(500)
            res.end('500 - Erro interno do servidor')
        }
    }
})

server.listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`)
    console.log(`Acesse: http://localhost:${PORT}`)
})
