const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")

const score = document.querySelector(".score-value")
const scoreText = document.querySelector(".score-text")
const buttonPlay = document.querySelector(".btn-play")

const size = 30
let speed = 100
const maxScore = 3990

const initialPosition = { x: 270, y: 300 }
let snake = [initialPosition]
let direction, nextDirection, loopId
let gameOverState = false
let gameWinState = false
let pauseState = false

const pauseOverlay = document.querySelector(".pause-overlay")

const colorsSnake = {
    default: "#CCCCCC",
    blue: "#0088EC",
    green: "#45D831",
    orange: "#EA6417"
}

let snakeColor = colorsSnake.default

const incrementScore = () => {
    score.innerText = +score.innerText + 10
}

const randomNumber = (min, max) => {
    return Math.round(Math.random() * (max - min) + min)
}

const randomPosition = () => {
    const number = randomNumber(0, canvas.width - size)
    return Math.round(number / size) * size
}

const randomColor = () => {
    const red = randomNumber(60, 250)
    const green = randomNumber(60, 250)
    const blue = randomNumber(60, 250)
    return `rgb(${red}, ${green}, ${blue})`
}

const food = {
    x: randomPosition(),
    y: randomPosition(),
    color: randomColor()
}

const drawFood = () => {
    const { x, y, color } = food
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
    ctx.shadowBlur = 0
}

const drawSnake = () => {
    ctx.fillStyle = snakeColor
    snake.forEach(position => {
        ctx.fillRect(position.x, position.y, size, size)
    })
}

const moveSnake = () => {
    if (gameOverState || gameWinState) return
    if (nextDirection) direction = nextDirection
    if (!direction) return

    const head = snake[snake.length - 1]
    let newHead
    
    if (direction == "right") newHead = { x: head.x + size, y: head.y }
    if (direction == "left") newHead = { x: head.x - size, y: head.y }
    if (direction == "down") newHead = { x: head.x, y: head.y + size }
    if (direction == "up") newHead = { x: head.x, y: head.y - size }
    
    snake.push(newHead)
    snake.shift()
}

const drawGrid = () => {
    ctx.lineWidth = 1
    ctx.strokeStyle = "#191919"
    for (let i = size; i < canvas.width; i += size) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, 600)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(600, i)
        ctx.stroke()
    }
}

const checkEat = () => {
    const head = snake[snake.length - 1]
    if (head.x == food.x && head.y == food.y) {
        incrementScore()
        snake.push({ ...head })
        let x, y
        do {
            x = randomPosition()
            y = randomPosition()
        } while (snake.some(position => position.x == x && position.y == y))
        food.x = x
        food.y = y
        food.color = randomColor()
    }
}

const checkCollision = () => {
    const head = snake[snake.length - 1]
    const canvasLimit = canvas.width - size
    const neckIndex = snake.length - 2
    const wallCollision = head.x < 0 || head.x > canvasLimit || head.y < 0 || head.y > canvasLimit
    const selfCollision = snake.some((pos, index) => index < neckIndex && pos.x == head.x && pos.y == head.y)
    if (wallCollision || selfCollision) gameOver()
}

const gameOver = () => {
    direction = undefined
    gameOverState = true
    score.innerText = "PERDEU!"
    scoreText.innerText = "SINTO MUITO"
}

const gameWin = () => {
    direction = undefined
    gameWinState = true
    score.innerText = "VENCEU!"
    scoreText.innerText = "PARABÉNS"
}

const togglePause = () => {
    if (gameOverState || gameWinState) return
    pauseState = !pauseState
    if (pauseOverlay) {
        pauseOverlay.style.display = pauseState ? "flex" : "none"
    }
    if (pauseState) {
        clearTimeout(loopId)
    } else {
        gameLoop()
    }
}

const gameLoop = () => {
    clearTimeout(loopId)
    if (pauseState) return
    ctx.clearRect(0, 0, 600, 600)
    drawGrid()
    drawFood()
    moveSnake()
    drawSnake()
    checkEat()
    checkCollision()

    for (let i = 200; i <= 1000; i += 200) {
        if (+score.innerText >= i) speed = 100 - i / 10
    }

    if (+score.innerText >= maxScore) {
        gameWin()
        return
    }

    loopId = setTimeout(gameLoop, speed)
}

gameLoop()

document.addEventListener("keydown", ({ key }) => {
    if (key === "Escape") {
        togglePause()
        return
    }

    if (key == "ArrowRight" && direction != "left") nextDirection = "right"
    if (key == "ArrowLeft" && direction != "right") nextDirection = "left"
    if (key == "ArrowDown" && direction != "up") nextDirection = "down"
    if (key == "ArrowUp" && direction != "down") nextDirection = "up"
})

document.querySelectorAll(".snake-color button").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".snake-color button").forEach(btn => btn.classList.remove("active"))
        button.classList.add("active")

        snakeColor = colorsSnake[button.id.split("-")[1]]
    })
})

buttonPlay.addEventListener("click", () => {
    direction = undefined
    nextDirection = undefined
    gameOverState = false
    gameWinState = false
    pauseState = false
    speed = 100
    if (pauseOverlay) pauseOverlay.style.display = "none"
    score.innerText = "00"
    scoreText.innerText = "SCORE:"
    snake = [{ ...initialPosition }]
    gameLoop()
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
        if (dx > 0 && direction != "left") nextDirection = "right"
        if (dx < 0 && direction != "right") nextDirection = "left"
    } else {
        if (dy > 0 && direction != "up") nextDirection = "down"
        if (dy < 0 && direction != "down") nextDirection = "up"
    }
    e.preventDefault()
}, { passive: false })

const dpadMap = {
    "btn-up":    () => { if (direction != "down")  nextDirection = "up"    },
    "btn-down":  () => { if (direction != "up")    nextDirection = "down"  },
    "btn-left":  () => { if (direction != "right") nextDirection = "left"  },
    "btn-right": () => { if (direction != "left")  nextDirection = "right" },
}

Object.entries(dpadMap).forEach(([id, fn]) => {
    const btn = document.getElementById(id)
    if (!btn) return
    btn.addEventListener("touchstart", (e) => { fn(); e.preventDefault() }, { passive: false })
    btn.addEventListener("click", fn)
})