import express from "express"
import http from "http"
import { join } from "path"
import { Server, Socket } from "socket.io"
import { applyMove, GameState, isFinished, Mark, newGame, other } from "../src/utils/game"

const {
  PORT = 8080,
  CORS_ORIGIN = "*",
  GRACE_MS = "30000", // how long a dropped player can come back
  IDLE_MS = String(30 * 60_000), // abandoned/idle room expiry
  WAITING_MS = String(10 * 60_000), // room with nobody joined
} = process.env
const MAX_ROOMS = 200
const MAX_ROOMS_PER_IP = 5
const RATE_WINDOW_MS = 10_000
const RATE_MAX_EVENTS = 40
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no look-alikes (0/O, 1/I)
const REACTIONS = new Set(["👍", "😂", "😮", "😈", "🎉", "❤️"])

interface Seat {
  token: string
  socketId: string | null // null while the player is disconnected
  timer?: ReturnType<typeof setTimeout>
}

interface Room {
  code: string
  seats: Partial<Record<Mark, Seat>>
  game: GameState
  starter: Mark
  scores: { X: number; O: number; draws: number }
  rematch: Set<Mark>
  ip: string
  createdAt: number
  lastActive: number
}

const rooms = new Map<string, Room>()
const roomByToken = new Map<string, string>() // player token -> room code

const log = (event: string, fields: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...fields }))

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  transports: ["websocket"],
  maxHttpBufferSize: 1024,
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
})

const dist = join(process.cwd(), "dist")
app.get("/healthz", (_req, res) => res.json({ ok: true, rooms: rooms.size }))
app.use(express.static(dist))
app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")))

function makeCode(): string {
  for (;;) {
    let code = ""
    for (let i = 0; i < 4; i++) code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]
    if (!rooms.has(code)) return code
  }
}

const clientIp = (socket: Socket) => {
  const fwd = socket.handshake.headers["x-forwarded-for"]
  return (typeof fwd === "string" ? fwd.split(",")[0].trim() : socket.handshake.address) || "unknown"
}

const markOf = (room: Room, token: string): Mark | null =>
  room.seats.X?.token === token ? "X" : room.seats.O?.token === token ? "O" : null

const snapshot = (room: Room) => ({
  code: room.code,
  game: room.game,
  scores: room.scores,
  full: !!(room.seats.X && room.seats.O),
  away: (["X", "O"] as Mark[]).find((m) => room.seats[m] && room.seats[m]!.socketId === null) ?? null,
  rematch: [...room.rematch],
})

const broadcast = (room: Room) => {
  room.lastActive = Date.now()
  io.to(room.code).emit("roomState", snapshot(room))
}

function destroy(room: Room, reason: "left" | "timeout" | "expired", exceptSocket?: Socket) {
  const target = exceptSocket ? exceptSocket.to(room.code) : io.to(room.code)
  target.emit("opponentLeft", { reason })
  for (const seat of Object.values(room.seats)) {
    if (!seat) continue
    clearTimeout(seat.timer)
    roomByToken.delete(seat.token)
  }
  rooms.delete(room.code)
  io.in(room.code).socketsLeave(room.code)
  log("room_closed", { code: room.code, reason })
}

function seat(socket: Socket, room: Room, mark: Mark) {
  const s = room.seats[mark]!
  clearTimeout(s.timer)
  if (s.socketId && s.socketId !== socket.id) {
    // same player opened a second tab: the newest connection wins
    const old = io.sockets.sockets.get(s.socketId)
    old?.emit("replaced")
    old?.disconnect(true)
  }
  s.socketId = socket.id
  socket.join(room.code)
  socket.emit("joined", { mark })
  broadcast(room)
}

io.on("connection", (socket) => {
  const auth = socket.handshake.auth?.token
  if (typeof auth !== "string" || auth.length < 8 || auth.length > 64) {
    socket.disconnect(true)
    return
  }
  const token = auth
  const ip = clientIp(socket)

  // Basic flood protection
  let windowStart = Date.now()
  let count = 0
  socket.use((_packet, next) => {
    const now = Date.now()
    if (now - windowStart > RATE_WINDOW_MS) {
      windowStart = now
      count = 0
    }
    if (++count > RATE_MAX_EVENTS) {
      if (count === RATE_MAX_EVENTS + 1) socket.emit("errorMessage", "Slow down a little!")
      return next(new Error("rate limited"))
    }
    next()
  })
  socket.on("error", () => {})

  const myRoom = () => rooms.get(roomByToken.get(token) ?? "")

  // Resume after a refresh or dropped connection
  const existing = myRoom()
  if (existing) {
    const mark = markOf(existing, token)
    if (mark) {
      seat(socket, existing, mark)
      log("resumed", { code: existing.code, mark })
    }
  } else {
    socket.emit("noGame")
  }

  socket.on("createRoom", () => {
    if (myRoom()) return void socket.emit("errorMessage", "You're already in a game.")
    if (rooms.size >= MAX_ROOMS) {
      return void socket.emit("errorMessage", "All rooms are busy right now. Try again in a minute!")
    }
    if ([...rooms.values()].filter((r) => r.ip === ip).length >= MAX_ROOMS_PER_IP) {
      return void socket.emit("errorMessage", "Too many open rooms from your network.")
    }
    const now = Date.now()
    const room: Room = {
      code: makeCode(),
      seats: { X: { token, socketId: null } },
      game: newGame("X"),
      starter: "X",
      scores: { X: 0, O: 0, draws: 0 },
      rematch: new Set(),
      ip,
      createdAt: now,
      lastActive: now,
    }
    rooms.set(room.code, room)
    roomByToken.set(token, room.code)
    seat(socket, room, "X")
    log("room_created", { code: room.code })
  })

  socket.on("joinRoom", (raw: unknown) => {
    if (myRoom()) return void socket.emit("errorMessage", "You're already in a game.")
    const code = typeof raw === "string" ? raw.trim().toUpperCase().slice(0, 8) : ""
    const room = rooms.get(code)
    if (!room) return void socket.emit("errorMessage", `Room "${code}" doesn't exist.`)
    if (room.seats.X && room.seats.O) return void socket.emit("errorMessage", "That room is already full.")

    room.seats.O = { token, socketId: null }
    roomByToken.set(token, code)
    seat(socket, room, "O")
    log("room_joined", { code })
  })

  socket.on("move", (index: unknown) => {
    const room = myRoom()
    if (!room) return
    const mark = markOf(room, token)
    const snap = snapshot(room)
    if (!mark || !snap.full || snap.away || mark !== room.game.turn) return

    const next = applyMove(room.game, index as number)
    if (!next) return
    room.game = next
    if (next.winner) room.scores[next.winner]++
    else if (next.draw) room.scores.draws++
    broadcast(room)
  })

  socket.on("rematch", () => {
    const room = myRoom()
    if (!room || !isFinished(room.game)) return
    const mark = markOf(room, token)
    if (!mark) return
    room.rematch.add(mark)
    if (room.rematch.size === 2) {
      room.starter = other(room.starter)
      room.game = newGame(room.starter)
      room.rematch.clear()
    }
    broadcast(room)
  })

  let lastReaction = 0
  socket.on("react", (emoji: unknown) => {
    const room = myRoom()
    const now = Date.now()
    if (!room || typeof emoji !== "string" || !REACTIONS.has(emoji) || now - lastReaction < 500) return
    lastReaction = now
    io.to(room.code).emit("reaction", { from: markOf(room, token), emoji })
  })

  socket.on("leaveRoom", () => {
    const room = myRoom()
    if (room) destroy(room, "left", socket)
    socket.leave(room?.code ?? "")
  })

  socket.on("disconnect", () => {
    const room = myRoom()
    const mark = room && markOf(room, token)
    if (!room || !mark) return
    const s = room.seats[mark]!
    if (s.socketId !== socket.id) return // replaced by a newer connection
    s.socketId = null
    s.timer = setTimeout(() => destroy(room, "timeout"), Number(GRACE_MS))
    broadcast(room)
    log("player_away", { code: room.code, mark })
  })
})

// Expire idle rooms (abandoned games, or rooms nobody ever joined)
setInterval(() => {
  const now = Date.now()
  for (const room of rooms.values()) {
    const waiting = !(room.seats.X && room.seats.O)
    if (now - room.lastActive > (waiting ? Number(WAITING_MS) : Number(IDLE_MS))) destroy(room, "expired")
  }
}, 60_000).unref()

server.listen(Number(PORT), "0.0.0.0", () => log("server_started", { port: PORT }))
