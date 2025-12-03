const ws = new WebSocket("ws://localhost:8080")

let playerId = null
let players = {}
let food = {}

ws.onmessage = event => {
    const data = JSON.parse(event.data)

    if (data.type === "yourId") {
        playerId = data.id
        return
    }

    if (data.type === "state") {
        players = data.players
        food = data.food
        render()
    }
}

document.addEventListener("keydown", ({ key }) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(key)) {
        const direction = {
            ArrowUp: "up",
            ArrowDown: "down",
            ArrowLeft: "left",
            ArrowRight: "right"
        }[key]

        ws.send(JSON.stringify({ type: "direction", value: direction }))
    }
})
