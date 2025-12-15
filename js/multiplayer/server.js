import { WebSocketServer } from "ws"

const wss = new WebSocketServer({ port: 8080 })

const size = 30
const gameWidth = 900
const gameHeight = 600
const MAX_PLAYERS = 5

const playerColors = [
    "#CCCCCC",  // default
    "#0088EC",  // blue
    "#45D831",  // green
    "#EA6417",  // orange
    "#A20EC0",  // purple
    "#FFD900"   // yellow
]

let players = {}

let food = {
    x: randomPosition(gameWidth),
    y: randomPosition(gameHeight),
    color: randomColor()
}

function randomPosition(limit) {
    let number = Math.floor(Math.random() * (limit - size))
    return Math.round(number / size) * size
}

function randomColor() {
    const red = Math.floor(Math.random() * (250 - 60) + 60)
    const green = Math.floor(Math.random() * (250 - 60) + 60)
    const blue = Math.floor(Math.random() * (250 - 60) + 60)
    return `rgb(${red}, ${green}, ${blue})`
}

function getAvailableColor() {
    const usedColors = Object.values(players).map(p => p.color)
    const availableColor = playerColors.find(c => !usedColors.includes(c))
    return availableColor || playerColors[0]
}

function getRandomStartPosition() {
    let x, y
    let attempts = 0
    do {
        x = randomPosition(gameWidth)
        y = randomPosition(gameHeight)
        attempts++
        // Verifica se a posição não colide com outras cobras
        const collision = Object.values(players).some(player => 
            player.snake.some(segment => segment.x === x && segment.y === y)
        )
        if (!collision) break
    } while (attempts < 50)
    return { x, y }
}

function checkCollision(player) {
    const head = player.snake[player.snake.length - 1]
    const canvasLimit = gameWidth - size
    const canvasLimitY = gameHeight - size
    const neckIndex = player.snake.length - 2
    
    // Colisão com paredes
    const wallCollision = head.x < 0 || head.x > canvasLimit || head.y < 0 || head.y > canvasLimitY
    
    // Colisão consigo mesmo
    const selfCollision = player.snake.some((pos, index) => 
        index < neckIndex && pos.x === head.x && pos.y === head.y
    )
    
    // Colisão com outras cobras
    let otherSnakeCollision = false
    for (const otherId in players) {
        if (otherId === player.id) continue
        const other = players[otherId]
        if (!other.alive) continue
        
        otherSnakeCollision = other.snake.some(segment => 
            segment.x === head.x && segment.y === head.y
        )
        if (otherSnakeCollision) break
    }
    
    return wallCollision || selfCollision || otherSnakeCollision
}

function checkFood(player) {
    const head = player.snake[player.snake.length - 1]
    if (head.x === food.x && head.y === food.y) {
        player.score += 10
        player.snake.push({ ...head })
        
        // Gera nova comida em posição válida
        let x, y
        let attempts = 0
        do {
            x = randomPosition(gameWidth)
            y = randomPosition(gameHeight)
            attempts++
            
            const collision = Object.values(players).some(p => 
                p.snake.some(segment => segment.x === x && segment.y === y)
            )
            if (!collision) break
        } while (attempts < 50)
        
        food.x = x
        food.y = y
        food.color = randomColor()
    }
}

function isColorAvailable(color) {
    const usedColors = Object.values(players).map(p => p.color)
    return playerColors.includes(color) && !usedColors.includes(color)
}

function gameLoop() {
    for (const id in players) {
        const player = players[id]
        if (!player.alive || !player.direction) continue
        const head = player.snake[player.snake.length - 1]

        let newHead = { ...head }
        if (player.direction === "right") newHead.x += size
        if (player.direction === "left") newHead.x -= size
        if (player.direction === "down") newHead.y += size
        if (player.direction === "up") newHead.y -= size

        player.snake.push(newHead)
        player.snake.shift()

        // Verifica colisão
        if (checkCollision(player)) {
            player.alive = false
            player.direction = null
            continue
        }

        checkFood(player)
    }

    broadcast({
        type: "state",
        players: Object.fromEntries(
            Object.entries(players).map(([id, p]) => [
                id,
                {
                    name: p.name,
                    snake: p.snake,
                    color: p.color,
                    score: p.score,
                    alive: p.alive
                }
            ])
        ),
        food
    })

    setTimeout(gameLoop, 100)
}

function broadcast(data) {
    const msg = JSON.stringify(data)
    wss.clients.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
            ws.send(msg)
        }
    })
}

wss.on("connection", ws => {
    const activePlayers = Object.keys(players).length
    if (activePlayers >= MAX_PLAYERS) {
        ws.send(JSON.stringify({ 
            type: "error", 
            message: "Sala cheia! Máximo de 5 jogadores." 
        }))
        ws.close()
        return
    }
    
    let playerId = null
    
    ws.on("message", message => {
        const data = JSON.parse(message)
        
        if (data.type === "join") {
            playerId = Date.now().toString() + Math.random()
            const startPos = getRandomStartPosition()

            const chosenColor = isColorAvailable(data.color)
                ? data.color
                : getAvailableColor()

            players[playerId] = {
                id: playerId,
                name: data.name || "Jogador",
                color: chosenColor,
                direction: "right",
                snake: [startPos],
                score: 0,
                alive: true,
                ws
            }
            
            ws.send(JSON.stringify({ 
                type: "joined", 
                id: playerId,
                color: chosenColor
            }))
            
            console.log(`${data.name} entrou no jogo (${activePlayers + 1}/5)`)
        }
        
        // Jogador muda direção
        if (data.type === "direction" && playerId && players[playerId]) {
            const player = players[playerId]
            if (!player.alive) return
            
            const opposite = {
                up: "down",
                down: "up",
                left: "right",
                right: "left"
            }
            
            // Impede virar 180 graus
            if (data.value !== opposite[player.direction]) {
                player.direction = data.value
            }
        }
        
        // Jogador quer respawn
        if (data.type === "respawn" && playerId && players[playerId]) {
            const player = players[playerId]
            const startPos = getRandomStartPosition()
            
            player.snake = [startPos]
            player.direction = "right"
            player.alive = true
            player.score = 0
            
            console.log(`${player.name} voltou ao jogo`)
        }
    })
    
    ws.on("close", () => {
        if (playerId && players[playerId]) {
            console.log(`${players[playerId].name} saiu do jogo`)
            delete players[playerId]
        }
    })
})

console.log("Servidor WebSocket rodando na porta 8080")
console.log("Máximo de 5 jogadores por sala")

gameLoop()