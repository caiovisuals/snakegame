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

document.querySelectorAll(".snake-color button").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".snake-color button").forEach(btn => btn.classList.remove("active"))
        button.classList.add("active")
        selectedColor = button.dataset.color
    })
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
    ws = new WebSocket("ws://localhost:8080")
    
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

function sendDirection(value) {
    if (!ws || !isAlive) return
    ws.send(JSON.stringify({ type: "direction", value }))
}

document.addEventListener("keydown", ({ key }) => {
    if (key === "ArrowUp"    || key === "w" || key === "W") sendDirection("up")
    if (key === "ArrowDown"  || key === "s" || key === "S") sendDirection("down")
    if (key === "ArrowLeft"  || key === "a" || key === "A") sendDirection("left")
    if (key === "ArrowRight" || key === "d" || key === "D") sendDirection("right")
})

buttonPlay.addEventListener("click", () => {
    if (!ws || !playerId) return
    
    ws.send(JSON.stringify({ type: "respawn" }))
    
    if (gameOverMessage) {
        gameOverMessage.style.display = "none"
    }
})

let touchStartX = 0
let touchStartY = 0

canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    e.preventDefault()
}, { passive: false })

canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
 
    if (Math.max(absDx, absDy) < 10) return
 
    if (absDx > absDy) {
        sendDirection(dx > 0 ? "right" : "left")
    } else {
        sendDirection(dy > 0 ? "down" : "up")
    }
    e.preventDefault()
}, { passive: false })
 
const dpadMap = {
    "btn-up":    "up",
    "btn-down":  "down",
    "btn-left":  "left",
    "btn-right": "right",
}
 
Object.entries(dpadMap).forEach(([id, dir]) => {
    const btn = document.getElementById(id)
    if (!btn) return
    btn.addEventListener("touchstart", (e) => { sendDirection(dir); e.preventDefault() }, { passive: false })
    btn.addEventListener("click", () => sendDirection(dir))
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
            ctx.strokeStyle = selectedColor
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
        const isCurrentPlayer = id === playerId
        const className = isCurrentPlayer ? "current-player" : ""
        
        return `
            <div class="player-item ${className}" data-testid="player-item-${player.name}">
                <div class="player-info">
                    <span class="player-color" style="background-color: ${player.color}"></span>
                    <span class="player-name">${player.name}</span>
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