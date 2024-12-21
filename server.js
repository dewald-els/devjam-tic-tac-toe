const express = require("express")
const app = express()
const http = require("http")
const { nanoid } = require("nanoid")
const server = http.createServer(app)
const { join } = require("path")
const { Server } = require("socket.io")
const io = new Server(server, {
  cors: {
    origin: "*",
  },
})
const { PORT = 8080 } = process.env
const cors = require("cors")

app.use(cors())
app.use(express.static(join(__dirname, "dist")))

const MAX_ROOMS = 50
const rooms = []

const roomById = roomId => rooms.find(room => room.id === roomId)
const roomIndexById = roomId => rooms.findIndex(room => room.id === roomById)

app.get("/", (req, res) => {
  return res.status(200).sendFile(join(__dirname, "dist", "index.html"))
})

io.on("connection", (socket) => {
  console.log("connected")

  socket.on("createRoom", () => {
    
    if (rooms.length + 1 > MAX_ROOMS) {
      socket.emit("createRoomError", "Rooms are currently full (50/50). Please try again later.")
      return
    }
    
    rooms.push({
      id: nanoid(),
      players: ["X"],
    })
    console.log("Room Created", rooms);
    socket.emit("createRoomSuccess", rooms[rooms.length - 1])
  })

  socket.on("joinRoom", (roomId) => {
    const room = roomById(roomId)
    if (!room) {
      socket.emit("joinRoomError", "Room does not exist")
    }

    if (room.players.length === 2) {
      socket.emit("joinRoomError", "Room is already full")
    }

    room.players.push("O")

    socket.emit("joinRoomSuccess", { ...room })
  })

  socket.on("played", (data) => {
    console.log("played", data)
    socket.broadcast.emit("updatePlayed", data)
  })

  socket.on("leaveRoom", ({ roomId, player }) => {
    const index = roomIndexById(roomId)
    rooms.splice(index, 1)
    socket.broadcast.emit("opponentLeftRoom", player)
  })

})

server.listen(PORT, () => console.log(`Server started on port ${PORT}`))
