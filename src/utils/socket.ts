import { io, Socket } from "socket.io-client"
import type { GameState, Mark } from "./game"

export interface RoomSnapshot {
  code: string
  game: GameState
  scores: { X: number; O: number; draws: number }
  full: boolean
  away: Mark | null
  rematch: Mark[]
}

interface ServerToClientEvents {
  roomState: (room: RoomSnapshot) => void
  joined: (data: { mark: Mark }) => void
  opponentLeft: (data: { reason: "left" | "timeout" | "expired" }) => void
  noGame: () => void
  queued: () => void
  replaced: () => void
  reaction: (data: { from: Mark | null; emoji: string }) => void
  errorMessage: (message: string) => void
}

interface ClientToServerEvents {
  createRoom: () => void
  quickMatch: () => void
  cancelQueue: () => void
  joinRoom: (code: string) => void
  move: (index: number) => void
  rematch: () => void
  react: (emoji: string) => void
  leaveRoom: () => void
  sync: (ack: (room: RoomSnapshot | null) => void) => void
}

// Same origin in production (the server also serves the built client).
// In dev the Vite server runs separately, so point at the game server.
const url =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? (import.meta.env.DEV ? "http://localhost:8080" : undefined)

// A per-tab identity that survives refreshes, so the server can seat us back in our game.
function playerToken(): string {
  const fresh = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
  try {
    const stored = sessionStorage.getItem("ttt-token")
    if (stored) return stored
    const t: string = ((crypto as any).randomUUID?.() ?? fresh()).replace(/-/g, "")
    sessionStorage.setItem("ttt-token", t)
    return t
  } catch {
    return fresh()
  }
}

// Unique per page load (the token above is per tab and is even copied when a tab is duplicated). Lets the
// server tell "this same page reconnected" apart from "a different tab took over".
const instance = Math.random().toString(36).slice(2) + Date.now().toString(36)

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url as string, {
  transports: ["websocket"],
  auth: { token: playerToken(), instance },
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})

export default socket
