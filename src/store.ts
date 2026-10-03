import { reactive, readonly } from "vue"
import router from "./router"
import { applyMove, cpuMove, GameState, isFinished, Mark, newGame, other } from "./utils/game"
import { play as sfx } from "./utils/sound"
import socket, { RoomSnapshot } from "./utils/socket"

export interface Toast {
  id: number
  text: string
  kind: "info" | "error"
}

export interface FloatingReaction {
  id: number
  emoji: string
  from: Mark | null
}

export type CpuLevel = "easy" | "hard"

interface State {
  mode: "menu" | "local" | "cpu" | "online"
  connected: boolean
  queued: boolean
  code: string
  you: Mark | null
  cpuLevel: CpuLevel
  opponentPresent: boolean
  opponentAway: boolean
  hadOpponent: boolean
  game: GameState
  scores: { X: number; O: number; draws: number }
  rematch: Mark[]
  starter: Mark
  toasts: Toast[]
  reactions: FloatingReaction[]
}

const state = reactive<State>({
  mode: "menu",
  connected: socket.connected,
  queued: false,
  code: "",
  you: null,
  cpuLevel: "hard",
  opponentPresent: false,
  opponentAway: false,
  hadOpponent: false,
  game: newGame(),
  scores: { X: 0, O: 0, draws: 0 },
  rematch: [],
  starter: "X",
  toasts: [],
  reactions: [],
})

let uid = 0
const expire = (list: "toasts" | "reactions", id: number, ms: number) =>
  setTimeout(() => {
    state[list] = (state[list] as { id: number }[]).filter((t) => t.id !== id) as any
  }, ms)

export function toast(text: string, kind: Toast["kind"] = "info") {
  const id = ++uid
  state.toasts.push({ id, text, kind })
  expire("toasts", id, 3500)
}

function reaction(emoji: string, from: Mark | null) {
  const id = ++uid
  state.reactions.push({ id, emoji, from })
  expire("reactions", id, 2200)
}

/** Sound feedback when the game changes, from this player's point of view. */
function announce(prev: GameState, next: GameState) {
  if (next.moves > prev.moves) sfx("place")
  if (!isFinished(prev) && isFinished(next)) {
    if (next.draw) setTimeout(() => sfx("draw"), 200)
    else if (state.you === null || next.winner === state.you) setTimeout(() => sfx("win"), 200)
    else setTimeout(() => sfx("lose"), 200)
  }
}

let cpuTimer: any
function maybeCpuTurn() {
  clearTimeout(cpuTimer)
  if (state.mode !== "cpu" || isFinished(state.game) || state.game.turn === state.you) return
  cpuTimer = setTimeout(() => commit(cpuMove(state.game, state.cpuLevel)), 450)
}

/** Applies a move in a local/cpu game and tallies the score. */
function commit(index: number) {
  const next = applyMove(state.game, index)
  if (!next) return
  announce(state.game, next)
  state.game = next
  if (next.winner) state.scores[next.winner]++
  else if (next.draw) state.scores.draws++
  maybeCpuTurn()
}

function reset() {
  clearTimeout(cpuTimer)
  state.mode = "menu"
  state.code = ""
  state.you = null
  state.opponentPresent = false
  state.opponentAway = false
  state.hadOpponent = false
  state.game = newGame()
  state.scores = { X: 0, O: 0, draws: 0 }
  state.rematch = []
  state.starter = "X"
  state.reactions = []
}

function applyRoom(room: RoomSnapshot) {
  announce(state.game, room.game)
  state.code = room.code
  state.game = room.game
  state.scores = room.scores
  state.opponentPresent = room.full
  if (room.full) state.hadOpponent = true
  state.opponentAway = room.away !== null && room.away !== state.you
  state.rematch = room.rematch
}

// --- socket wiring: registered once, for the lifetime of the app ---
socket.on("connect", () => {
  state.connected = true
})

// A dropped connection doesn't end the game: the server holds our seat for a
// grace period and re-seats us (or tells us it's gone) when we reconnect.
socket.on("disconnect", () => {
  state.connected = false
  state.queued = false
})

socket.on("queued", () => {
  state.queued = true
})

socket.on("joined", ({ mark }) => {
  state.queued = false
  state.mode = "online"
  state.you = mark
  if (router.currentRoute.value.path !== "/play") router.push("/play")
})

socket.on("roomState", (room) => {
  const wasWaiting = state.mode === "online" && !state.opponentPresent
  const wasAway = state.opponentAway
  const wasFull = state.opponentPresent
  applyRoom(room)
  if (state.mode === "online" && wasFull && !room.full) {
    toast("Your opponent left. Share the code or find a new opponent.")
    return
  }
  if (wasWaiting && room.full && state.you === "X") toast("Your friend joined. Let's play!")
  if (state.opponentAway && !wasAway) toast("Your opponent lost connection. Waiting for them…")
  else if (wasAway && !state.opponentAway) toast("Your opponent is back!")
})

socket.on("noGame", () => {
  if (state.mode !== "online") return
  reset()
  router.replace("/")
  toast("Your game ended while you were away.")
})

socket.on("replaced", () => {
  reset()
  router.replace("/")
  toast("This game was opened in another tab.", "error")
})

const leftMessages = {
  left: "Your opponent left the room.",
  timeout: "Your opponent disconnected and didn't come back.",
  expired: "The room expired from inactivity.",
}
socket.on("opponentLeft", ({ reason }) => {
  reset()
  router.replace("/")
  toast(leftMessages[reason] ?? leftMessages.left)
})

socket.on("reaction", ({ from, emoji }) => {
  reaction(emoji, from)
  if (from !== state.you) sfx("pop")
})

socket.on("errorMessage", (message) => toast(message, "error"))

// --- actions ---
export const actions = {
  startLocal() {
    reset()
    state.mode = "local"
    state.opponentPresent = true
    router.push("/play")
  },

  startCpu(level: CpuLevel) {
    reset()
    state.mode = "cpu"
    state.you = "X"
    state.cpuLevel = level
    state.opponentPresent = true
    router.push("/play")
  },

  quickMatch() {
    socket.emit("quickMatch")
  },

  cancelQueue() {
    state.queued = false
    socket.emit("cancelQueue")
  },

  createRoom() {
    socket.emit("createRoom")
  },

  joinRoom(code: string) {
    const clean = code.trim().toUpperCase()
    if (!clean) return toast("Enter a room code first.", "error")
    socket.emit("joinRoom", clean)
  },

  play(index: number) {
    if (state.mode === "local" || (state.mode === "cpu" && state.game.turn === state.you)) {
      commit(index)
    } else if (state.mode === "online") {
      if (state.you !== state.game.turn || !state.opponentPresent || !state.connected) return
      socket.emit("move", index)
    }
  },

  rematch() {
    if (state.mode === "online") return void socket.emit("rematch")
    if (!isFinished(state.game)) return
    state.starter = other(state.starter)
    state.game = newGame(state.starter)
    maybeCpuTurn()
  },

  react(emoji: string) {
    if (state.mode === "online") socket.emit("react", emoji)
  },

  /** Drop this room (the game is saved for others to continue) and queue for a new opponent. */
  findNewOpponent() {
    socket.emit("leaveRoom")
    reset()
    router.replace("/")
    socket.emit("quickMatch")
  },

  leave() {
    if (state.mode === "online") socket.emit("leaveRoom")
    reset()
    router.replace("/")
  },
}

export const useGame = () => ({ state: readonly(state) as State, actions })
