import { WebSocketServer } from "ws"

const wss = new WebSocketServer({ port: 8080 })

const size = 30
const gameWidth = 900
const gameHeight = 600

let players = {}

let food = {
    x: randomPosition(gameWidth),
    y: randomPosition(gameHeight),
}

function randomPosition(limit) {
    let number = Math.floor(Math.random() * (limit - size))
    return Math.round(number / size) * size
}

function gameLoop() {
    for (const id in players) {
        const player = players[id]
        const head = player.snake[player.snake.length - 1]

        let newHead = { ...head }
        if (player.direction === "right") newHead.x += size
        if (player.direction === "left") newHead.x -= size
        if (player.direction === "down") newHead.y += size
        if (player.direction === "up") newHead.y -= size

        player.snake.push(newHead)
        player.snake.shift()

        if (newHead.x === food.x && newHead.y === food.y) {
            player.snake.push(newHead)
            food.x = randomPosition(gameWidth)
            food.y = randomPosition(gameHeight)
        }
    }

    broadcast({
        type: "state",
        players,
        food,
    })

    setTimeout(gameLoop, 100)
}

function broadcast(data) {
    const msg = JSON.stringify(data)
    wss.clients.forEach(ws => ws.send(msg))
}

wss.on("connection", ws => {
    const id = Date.now().toString()

    players[id] = {
        direction: "right",
        snake: [
            { x: randomPosition(900), y: randomPosition(600) }
        ]
    }

    ws.send(JSON.stringify({ type: "yourId", id }))

    ws.on("message", message => {
        const data = JSON.parse(message)
        if (data.type === "direction") {
            players[id].direction = data.value
        }
    })

    ws.on("close", () => {
        delete players[id]
    })
})

console.log("Servidor WebSocket rodando na porta 8080")

gameLoop()
