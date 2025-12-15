const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")
const scoreValue = document.querySelector(".score-value")
const buttonPlay = document.querySelector(".btn-play")
const modal = document.getElementById("name-modal")
const nameInput = document.getElementById("player-name")
const joinButton = document.getElementById("join-game")
const playersList = document.querySelector(".players-list")
const gameOverMessage = document.querySelector(".game-over-message")

const size = 30
const gameWidth = 900
const gameHeight = 600

let ws = null
let playerId = null
let players = {}
let food = {}
let playerName = ""
let isAlive = true
let selectedColor = "#CCCCCC"

window.addEventListener("load", () => {
    modal.style.display = "flex"
    nameInput.focus()
})

joinButton.addEventListener("click", () => {
    const name = nameInput.value.trim()
    if (name.length === 0) {
        alert("Por favor, digite um nome!")
        return
    }
    if (name.length > 15) {
        alert("Nome muito longo! Máximo 15 caracteres.")
        return
    }
    playerName = name
    modal.style.display = "none"
    connectToServer()
})

nameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        joinButton.click()
    }
})

function connectToServer() {
    ws = new WebSocket("ws://localhost:8081")
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: "join",
            name: playerName,
            color: selectedColor
        }))
    }
    
    ws.onmessage = event => {
        const data = JSON.parse(event.data)
        
        if (data.type === "error") {
            alert(data.message)
            window.location.href = "/"
            return
        }
        
        if (data.type === "joined") {
            playerId = data.id
            console.log("Conectado ao servidor! ID:", playerId)
        }
        
        if (data.type === "state") {
            players = data.players
            food = data.food
            
            if (playerId && players[playerId]) {
                isAlive = players[playerId].alive
                if (!isAlive && gameOverMessage) {
                    gameOverMessage.style.display = "block"
                }
            }
            
            render()
            updatePlayersList()
            updateScore()
        }
    }
    
    ws.onclose = () => {
        console.log("Desconectado do servidor")
        alert("Desconectado do servidor!")
        window.location.href = "/"
    }
    
    ws.onerror = (error) => {
        console.error("Erro na conexão:", error)
        alert("Erro ao conectar ao servidor!")
        window.location.href = "/"
    }
}

document.addEventListener("keydown", ({ key }) => {
    if (!ws || !isAlive) return
    
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        const direction = {
            ArrowUp: "up",
            ArrowDown: "down",
            ArrowLeft: "left",
            ArrowRight: "right"
        }[key]
        
        ws.send(JSON.stringify({ type: "direction", value: direction }))
    }
})

buttonPlay.addEventListener("click", () => {
    if (!ws || !playerId) return
    
    ws.send(JSON.stringify({ type: "respawn" }))
    
    if (gameOverMessage) {
        gameOverMessage.style.display = "none"
    }
})

function drawGrid() {
    ctx.lineWidth = 1
    ctx.strokeStyle = "#191919"
    
    for (let i = size; i < gameWidth; i += size) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, gameHeight)
        ctx.stroke()
    }
    
    for (let i = size; i < gameHeight; i += size) {
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(gameWidth, i)
        ctx.stroke()
    }
}

function drawFood() {
    if (!food.x) return
    
    const { x, y, color } = food
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
    ctx.shadowBlur = 0
}

function drawSnake(snake, color, isCurrentPlayer) {
    ctx.fillStyle = color
    
    snake.forEach((position, index) => {
        ctx.fillRect(position.x, position.y, size, size)
        
        if (isCurrentPlayer && index === snake.length - 1) {
            ctx.strokeStyle = "#ffffff"
            ctx.lineWidth = 2
            ctx.strokeRect(position.x + 2, position.y + 2, size - 4, size - 4)
        }
    })
}

function drawPlayerName(snake, name, color) {
    const head = snake[snake.length - 1]
    ctx.fillStyle = color
    ctx.font = "bold 12px Poppins"
    ctx.textAlign = "center"
    ctx.fillText(name, head.x + size / 2, head.y - 5)
}

function render() {
    ctx.clearRect(0, 0, gameWidth, gameHeight)
    
    drawGrid()
    drawFood()
    
    for (const id in players) {
        const player = players[id]
        if (player.snake && player.snake.length > 0) {
            const isCurrentPlayer = id === playerId
            const alpha = player.alive ? 1 : 0.3
            
            ctx.globalAlpha = alpha
            drawSnake(player.snake, player.color, isCurrentPlayer)
            
            if (player.alive) {
                drawPlayerName(player.snake, player.name, player.color)
            }
            ctx.globalAlpha = 1
        }
    }
}

function updatePlayersList() {
    if (!playersList) return
    
    const sortedPlayers = Object.entries(players)
        .sort(([, a], [, b]) => b.score - a.score)
    
    playersList.innerHTML = sortedPlayers.map(([id, player], index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : ""
        const statusIcon = player.alive ? "🐍" : "💀"
        const isCurrentPlayer = id === playerId
        const className = isCurrentPlayer ? "current-player" : ""
        
        return `
            <div class="player-item ${className}" data-testid="player-item-${player.name}">
                <div class="player-info">
                    <span class="player-color" style="background-color: ${player.color}"></span>
                    <span class="player-name">${medal} ${player.name} ${statusIcon}</span>
                </div>
                <span class="player-score">${player.score}</span>
            </div>
        `
    }).join("")
}

function updateScore() {
    if (!playerId || !players[playerId]) return
    scoreValue.textContent = players[playerId].score.toString().padStart(2, "0")
}