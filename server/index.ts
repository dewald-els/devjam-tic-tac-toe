import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from "fs"
import express from "express"
import http from "http"
import { dirname, join } from "path"
import { Server, Socket } from "socket.io"
import {
  applyMove,
  applySabotageMove,
  boardConfig,
  Effect,
  GameState,
  generateHidden,
  isFinished,
  Mark,
  newGame,
  other,
  isPowerUp,
  usePowerUp,
} from "../src/utils/game"

const {
  PORT = 8080,
  CORS_ORIGIN = "*",
  GRACE_MS = "60000", // how long a dropped player can come back
  IDLE_MS = String(30 * 60_000), // abandoned/idle room expiry
  WAITING_MS = String(10 * 60_000), // room with nobody joined
} = process.env
const MAX_ROOMS = 200
const MAX_CONN_PER_IP = Number(process.env.MAX_CONN_PER_IP ?? 30)
const ipConns = new Map<string, number>()
const MAX_ROOMS_PER_IP = Number(process.env.MAX_ROOMS_PER_IP ?? 5)
const RATE_WINDOW_MS = 10_000
const RATE_MAX_EVENTS = 40
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no look-alikes (0/O, 1/I)
const REACTIONS = new Set(["😂", "😮", "😈", "🎉", "❤️"])

interface Seat {
  token: string
  socketId: string | null // null while the player is disconnected
  timer?: ReturnType<typeof setTimeout>
}

interface Room {
  code: string
  seats: Partial<Record<Mark, Seat>>
  game: GameState
  /** Sabotage only: what each tile secretly hides. Never sent to clients before the tile is claimed. */
  hidden: Record<number, Effect>
  starter: Mark
  scores: { X: number; O: number; draws: number }
  rematch: Set<Mark>
  ip: string
  createdAt: number
  lastActive: number
}

let waiting: Socket | null = null // quick match: one player waiting for an opponent
const rooms = new Map<string, Room>()
const roomByToken = new Map<string, string>() // player token -> room code

const debugOn = process.env.LOG_LEVEL === "debug"
// Optional log file (set LOG_FILE, e.g. /home/LogFiles/app.log on Azure where /home persists).
// Rotates to <file>.1 at ~5MB, so at most ~10MB is ever kept.
const LOG_FILE = process.env.LOG_FILE
const LOG_MAX_BYTES = 5 * 1024 * 1024
let logBytes = 0
if (LOG_FILE) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true })
    logBytes = existsSync(LOG_FILE) ? statSync(LOG_FILE).size : 0
  } catch (err) {
    console.error("Could not prepare log file, logging to console only:", err)
  }
}
function writeLogFile(line: string) {
  if (!LOG_FILE) return
  try {
    if (logBytes > LOG_MAX_BYTES) {
      renameSync(LOG_FILE, LOG_FILE + ".1")
      logBytes = 0
    }
    appendFileSync(LOG_FILE, `${line}\n`)
    logBytes += line.length + 1
  } catch {
    // never let logging take the game down
  }
}

const log = (event: string, fields: Record<string, unknown> = {}) => {
  const line = JSON.stringify({ t: new Date().toISOString(), event, ...fields })
  console.log(line)
  writeLogFile(line)
}
const debug = (event: string, fields: Record<string, unknown> = {}) => debugOn && log(event, fields)


process.on("uncaughtException", (err) => log("uncaught_exception", { error: String(err), stack: err.stack }))
process.on("unhandledRejection", (err) => log("unhandled_rejection", { error: String(err) }))

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  transports: ["websocket"],
  maxHttpBufferSize: 1024,
  pingInterval: 10_000, // notice silently-dead mobile connections in ~15s instead of ~45s
  pingTimeout: 5_000,
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

/** Stores a new game state, tallies the score if it ended, and tells the room. */
function commitGame(room: Room, next: GameState) {
  room.game = next
  if (next.winner) room.scores[next.winner]++
  else if (next.draw) room.scores.draws++
  if (isFinished(next)) {
    log("game_over", { code: room.code, winner: next.winner, draw: next.draw, moves: next.moves, scores: room.scores })
  }
  broadcast(room)
}

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

/**
 * A player is gone for good. Before the first move the room stays open for someone else to take the
 * seat; once the game has started it ends, so a stranger can never inherit a half-played game.
 */
function vacate(room: Room, mark: Mark, reason: "left" | "timeout") {
  const s = room.seats[mark]
  if (!s) return
  if (room.game.moves > 0) return destroy(room, reason, s.socketId ? io.sockets.sockets.get(s.socketId) : undefined)
  clearTimeout(s.timer)
  roomByToken.delete(s.token)
  if (s.socketId) io.sockets.sockets.get(s.socketId)?.leave(room.code)
  delete room.seats[mark]
  room.rematch.clear()
  log("seat_vacated", { code: room.code, mark, reason })
  if (!room.seats.X && !room.seats.O) return destroy(room, "left")
  broadcast(room)
}

function seat(socket: Socket, room: Room, mark: Mark, announce = true) {
  const s = room.seats[mark]!
  const oldId = s.socketId
  // Point the seat at the new socket first: the old socket's disconnect handler then sees it was replaced
  // and does nothing (no phantom "away" broadcast, no grace timer left running against a live player).
  s.socketId = socket.id
  clearTimeout(s.timer)
  if (oldId && oldId !== socket.id) {
    const old = io.sockets.sockets.get(oldId)
    // A reconnect of the same page (stale/zombie socket) is closed silently; only a genuinely different
    // tab (e.g. a duplicated tab sharing the token) is told it was replaced.
    const instance = socket.handshake.auth?.instance
    const samePage = typeof instance === "string" && instance === old?.handshake.auth?.instance
    if (old && !samePage) old.emit("replaced")
    old?.disconnect(true)
  }
  socket.join(room.code)
  socket.emit("joined", { mark })
  if (announce) broadcast(room)
}

io.on("connection", (socket) => {
  const auth = socket.handshake.auth?.token
  if (typeof auth !== "string" || auth.length < 8 || auth.length > 64) {
    socket.disconnect(true)
    return
  }
  const token = auth
  const ip = clientIp(socket)
  const player = token.slice(0, 6) // short id for logs; never log the full token
  if ((ipConns.get(ip) ?? 0) >= MAX_CONN_PER_IP) {
    log("rejected", { player, reason: "ip_connection_limit", ip })
    socket.disconnect(true)
    return
  }
  ipConns.set(ip, (ipConns.get(ip) ?? 0) + 1)
  log("connected", { player, ip, sockets: io.engine.clientsCount })

  // One bad payload must never take down a handler (or leave state half-updated without a log line)
  const on = (event: string, fn: (...args: any[]) => void) =>
    socket.on(event, (...args: any[]) => {
      try {
        fn(...args)
      } catch (err) {
        log("handler_error", { player, event, error: String(err), stack: (err as Error).stack })
      }
    })

  // Every refused action is logged with why
  const reject = (message: string, reason: string, extra: Record<string, unknown> = {}) => {
    log("rejected", { player, reason, ...extra })
    socket.emit("errorMessage", message)
  }

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
      if (count === RATE_MAX_EVENTS + 1) {
        log("rate_limited", { player, ip })
        socket.emit("errorMessage", "Slow down a little!")
      }
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
      log("resumed", { code: existing.code, mark, player })
    }
  } else {
    socket.emit("noGame")
  }

  // Client liveness probe (a returning tab can't trust a socket that "looks" connected) + state resync
  on("sync", (cb: unknown) => {
    if (typeof cb !== "function") return
    const room = myRoom()
    cb(room && markOf(room, token) ? snapshot(room) : null)
  })

  on("quickMatch", () => {
    if (myRoom()) return reject("You're already in a game.", "already_in_game", { action: "quickMatch" })
    if (waiting && waiting.id !== socket.id && waiting.handshake.auth.token !== token && waiting.connected && !roomByToken.has(waiting.handshake.auth.token)) {
      if (rooms.size >= MAX_ROOMS) return reject("All rooms are busy right now.", "rooms_full", { action: "quickMatch" })
      const host = waiting
      waiting = null
      const hostToken = host.handshake.auth.token as string
      const now = Date.now()
      const room: Room = {
        code: makeCode(),
        seats: { X: { token: hostToken, socketId: null }, O: { token, socketId: null } },
        game: newGame("X"),
        hidden: {},
        starter: "X",
        scores: { X: 0, O: 0, draws: 0 },
        rematch: new Set(),
        ip,
        createdAt: now,
        lastActive: now,
      }
      rooms.set(room.code, room)
      roomByToken.set(hostToken, room.code)
      roomByToken.set(token, room.code)
      seat(host, room, "X", false) // one broadcast once both are seated, so nobody briefly looks "away"
      seat(socket, room, "O")
      log("quick_match", { code: room.code })
    } else {
      waiting = socket
      log("queued", { player })
      socket.emit("queued")
    }
  })

  on("cancelQueue", () => {
    if (waiting?.id === socket.id) waiting = null
  })

  on("createRoom", (raw: unknown) => {
    const variant = raw === "vanishing" || raw === "sabotage" ? raw : "classic"
    if (myRoom()) return reject("You're already in a game.", "already_in_game", { action: "createRoom" })
    if (rooms.size >= MAX_ROOMS) {
      return reject("All rooms are busy right now. Try again in a minute!", "rooms_full", { action: "createRoom" })
    }
    if ([...rooms.values()].filter((r) => r.ip === ip).length >= MAX_ROOMS_PER_IP) {
      return reject("Too many open rooms from your network.", "ip_room_limit", { ip })
    }
    const now = Date.now()
    const room: Room = {
      code: makeCode(),
      seats: { X: { token, socketId: null } },
      game: newGame("X", variant),
      hidden: variant === "sabotage" ? generateHidden(boardConfig(variant).size) : {},
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
    log("room_created", { code: room.code, player })
  })

  on("joinRoom", (raw: unknown) => {
    if (myRoom()) return reject("You're already in a game.", "already_in_game", { action: "joinRoom" })
    const code = typeof raw === "string" ? raw.trim().toUpperCase().slice(0, 8) : ""
    const room = rooms.get(code)
    if (!room) return reject(`Room "${code}" doesn't exist.`, "room_not_found", { code })
    if (room.seats.X && room.seats.O) return reject("That room is already full.", "room_full", { code })

    const mark: Mark = room.seats.X ? "O" : "X"
    room.seats[mark] = { token, socketId: null }
    roomByToken.set(token, code)
    seat(socket, room, mark)
    log("room_joined", { code, player, mark })
  })

  on("move", (index: unknown) => {
    const room = myRoom()
    if (!room) return
    const mark = markOf(room, token)
    const snap = snapshot(room)
    if (!mark || !snap.full || snap.away || mark !== room.game.turn) {
      return void log("move_ignored", { code: room.code, player, index, mark, full: snap.full, away: snap.away, turn: room.game.turn })
    }

    const next =
      room.game.variant === "sabotage"
        ? applySabotageMove(room.game, room.hidden, index as number)
        : applyMove(room.game, index as number)
    if (!next) return void log("move_invalid", { code: room.code, player, index })
    log("move", { code: room.code, mark, index, moves: next.moves, effect: next.revealed[index as number] })
    commitGame(room, next)
  })

  on("usePowerUp", (effect: unknown, target: unknown) => {
    const room = myRoom()
    if (!room) return
    const mark = markOf(room, token)
    const snap = snapshot(room)
    if (!mark || !snap.full || snap.away || mark !== room.game.turn) {
      return void log("powerup_ignored", { code: room.code, player, effect, mark, turn: room.game.turn })
    }
    const next =
      isPowerUp(effect) ? usePowerUp(room.game, effect, typeof target === "number" ? target : undefined) : null
    if (!next) return void log("powerup_invalid", { code: room.code, player, effect, target })
    log("powerup", { code: room.code, mark, effect, target })
    commitGame(room, next)
  })

  on("rematch", () => {
    const room = myRoom()
    if (!room || !isFinished(room.game)) return
    const mark = markOf(room, token)
    if (!mark) return
    room.rematch.add(mark)
    if (room.rematch.size === 2) {
      log("rematch_started", { code: room.code })
      room.starter = other(room.starter)
      room.game = newGame(room.starter, room.game.variant)
      room.hidden = room.game.variant === "sabotage" ? generateHidden(room.game.size) : {}
      room.rematch.clear()
    }
    broadcast(room)
  })

  on("declineRematch", () => {
    const room = myRoom()
    const mark = room && markOf(room, token)
    if (!room || !mark || !room.rematch.has(other(mark))) return
    log("rematch_declined", { code: room.code, by: mark })
    socket.to(room.code).emit("rematchDeclined") // lands before the opponentLeft that vacate() sends
    vacate(room, mark, "left")
  })

  let lastReaction = 0
  on("react", (emoji: unknown) => {
    const room = myRoom()
    const now = Date.now()
    if (!room || typeof emoji !== "string" || !REACTIONS.has(emoji) || now - lastReaction < 500) return
    lastReaction = now
    io.to(room.code).emit("reaction", { from: markOf(room, token), emoji })
  })

  on("leaveRoom", () => {
    const room = myRoom()
    const mark = room && markOf(room, token)
    if (room && mark) vacate(room, mark, "left")
  })

  on("disconnect", (reason) => {
    log("disconnected", { player, reason, sockets: io.engine.clientsCount })
    const left = (ipConns.get(ip) ?? 1) - 1
    if (left <= 0) ipConns.delete(ip)
    else ipConns.set(ip, left)
    if (waiting?.id === socket.id) waiting = null
    const room = myRoom()
    const mark = room && markOf(room, token)
    if (!room || !mark) return
    const s = room.seats[mark]!
    if (s.socketId !== socket.id) return // replaced by a newer connection
    s.socketId = null
    s.timer = setTimeout(() => {
      if (s.socketId === null) vacate(room, mark, "timeout") // never evict a player who is back
    }, Number(GRACE_MS))
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

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    log("shutdown", { signal: sig, rooms: rooms.size, sockets: io.engine.clientsCount })
    process.exit(0)
  })
}

server.listen(Number(PORT), "0.0.0.0", () => log("server_started", { port: PORT }))
