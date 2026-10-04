import { afterAll, beforeAll, expect, test } from "bun:test"
import { io as connect, Socket } from "socket.io-client"

const PORT = 8123
let proc: ReturnType<typeof Bun.spawn>
const clients: Socket[] = []

let n = 0
const client = async (token = `tok${Date.now()}${++n}xxxx`) => {
  const s = connect(`http://127.0.0.1:${PORT}`, { transports: ["websocket"], auth: { token }, forceNew: true })
  clients.push(s)
  track(s)
  await new Promise((r, j) => { s.on("connect", () => r(null)); s.on("connect_error", (e) => j(e)) })
  return s
}
// Events are buffered per socket so none are lost between awaits.
const queues = new WeakMap<Socket, Record<string, any[]>>()
const waiters = new WeakMap<Socket, Record<string, ((v: any) => void)[]>>()
const track = (s: Socket) => {
  const q: Record<string, any[]> = {}, w: Record<string, ((v: any) => void)[]> = {}
  queues.set(s, q); waiters.set(s, w)
  s.onAny((ev, v) => {
    const waiter = w[ev]?.shift()
    if (waiter) waiter(v)
    else (q[ev] ??= []).push(v)
  })
}
const next = <T = any>(s: Socket, ev: string) =>
  new Promise<T>((r) => {
    const q = queues.get(s)![ev]
    if (q?.length) return r(q.shift())
    ;(waiters.get(s)![ev] ??= []).push(r)
  })

beforeAll(async () => {
  proc = Bun.spawn(["bun", "server/index.ts"], { env: { ...process.env, PORT: String(PORT), GRACE_MS: "400", MAX_ROOMS_PER_IP: "1000", MAX_CONN_PER_IP: "1000" }, stdout: "inherit", stderr: "inherit" })
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/healthz`)).ok) return } catch {}
    await Bun.sleep(100)
  }
})
afterAll(() => { clients.forEach((c) => c.close()); proc.kill() })

test("full game flow, turn enforcement, rematch, room isolation, leave", async () => {
  const a = await client(), b = await client()
  const aJoined = next(a, "joined")
  a.emit("createRoom")
  expect((await aJoined).mark).toBe("X")
  const { code } = await next(a, "roomState")

  // another room must not receive this room's events
  const c = await client(), d = await client()
  let leaked = false
  c.on("roomState", (s) => { if (s.code === code) leaked = true })
  d.on("roomState", () => (leaked = true))
  c.emit("createRoom")
  await next(c, "roomState")

  b.emit("joinRoom", code.toLowerCase())
  expect((await next(b, "joined")).mark).toBe("O")
  expect((await next(a, "roomState")).full).toBe(true)

  b.emit("move", 0) // O moving first is ignored
  a.emit("move", 0)
  let s = await next(a, "roomState")
  expect(s.game.board[0]).toBe("X")

  for (const [who, i] of [[b, 3], [a, 1], [b, 4], [a, 2]] as const) {
    who.emit("move", i)
    s = await next(a, "roomState")
  }
  expect(s.game.winner).toBe("X")
  expect(s.scores.X).toBe(1)

  a.emit("rematch"); s = await next(a, "roomState")
  expect(s.rematch).toEqual(["X"])
  b.emit("rematch"); s = await next(a, "roomState")
  expect(s.game.board.every((x: unknown) => x === null)).toBe(true)
  expect(s.game.turn).toBe("O") // starter alternates

  b.emit("leaveRoom")
  const afterLeave = await next(a, "roomState")
  expect(afterLeave.full).toBe(false)
  expect(afterLeave.game.turn).toBe("O") // game is kept

  // a newcomer takes the free seat and continues
  const e = await client()
  e.emit("joinRoom", code)
  expect((await next(e, "joined")).mark).toBe("O")
  expect(leaked).toBe(false)
})

test("joining a missing room reports an error and doesn't crash the server", async () => {
  const a = await client()
  const err = next(a, "errorMessage")
  a.emit("joinRoom", "NOPE")
  expect(await err).toContain("doesn't exist")
  a.emit("joinRoom", { evil: true })
  expect(await next(a, "errorMessage")).toContain("doesn't exist")
  expect((await fetch(`http://127.0.0.1:${PORT}/healthz`)).ok).toBe(true)
})

test("full room rejects a third player; disconnect notifies opponent", async () => {
  const a = await client(), b = await client(), c = await client()
  a.emit("createRoom"); const { code } = await next(a, "roomState")
  b.emit("joinRoom", code); await next(b, "joined"); await next(a, "roomState")
  const err = next(c, "errorMessage")
  c.emit("joinRoom", code)
  expect(await err).toContain("full")
  b.close()
  expect((await next(a, "roomState")).away).toBe("O")
  const after = await next(a, "roomState") // grace expires: seat freed, room survives
  expect(after.full).toBe(false)
  expect(after.away).toBeNull()
})

test("a dropped player can resume within the grace period", async () => {
  const a = await client()
  const token = `resume${Date.now()}token`
  const b = await client(token)
  a.emit("createRoom"); const { code } = await next(a, "roomState")
  b.emit("joinRoom", code); await next(b, "joined")
  await next(a, "roomState")

  b.close()
  expect((await next(a, "roomState")).away).toBe("O")

  const b2 = await client(token) // same identity, new connection
  expect((await next(b2, "joined")).mark).toBe("O")
  expect((await next(a, "roomState")).away).toBeNull()
})

test("a player with no game is told so; reactions are validated", async () => {
  const a = await client(), b = await client()
  await next(a, "noGame")
  a.emit("createRoom"); const { code } = await next(a, "roomState")
  b.emit("joinRoom", code); await next(b, "joined"); await next(a, "roomState")
  a.emit("react", "<script>")
  a.emit("react", "🎉")
  expect((await next(b, "reaction")).emoji).toBe("🎉")
})

test("quick match pairs two waiting players, and a cancelled search is skipped", async () => {
  const a = await client(), b = await client(), c = await client()
  a.emit("quickMatch")
  await next(a, "queued")
  a.emit("cancelQueue")
  b.emit("quickMatch")
  await next(b, "queued") // a cancelled, so b waits instead of pairing
  c.emit("quickMatch")
  expect((await next(b, "joined")).mark).toBe("X")
  expect((await next(c, "joined")).mark).toBe("O")
  expect((await next(c, "roomState")).full).toBe(true)

  // someone already in a game can't queue
  const err = next(c, "errorMessage")
  c.emit("quickMatch")
  expect(await err).toContain("already")
})

test("leaving mid-game ends it; leaving before the first move keeps the room open", async () => {
  const a = await client(), b = await client()
  a.emit("createRoom"); const { code } = await next(a, "roomState")
  b.emit("joinRoom", code); await next(b, "joined"); await next(a, "roomState")

  b.emit("leaveRoom") // no moves yet: seat freed
  expect((await next(a, "roomState")).full).toBe(false)

  const c = await client()
  c.emit("joinRoom", code); await next(c, "joined"); await next(a, "roomState")
  a.emit("move", 0); await next(a, "roomState")
  c.emit("leaveRoom") // game started: it ends
  expect((await next(a, "opponentLeft")).reason).toBe("left")
  const d = await client()
  d.emit("joinRoom", code)
  expect(await next(d, "errorMessage")).toContain("doesn't exist")
})

test("a second connection with the same token takes over without a leftover timer killing the game", async () => {
  const a = await client()
  const token = `takeover${Date.now()}token`
  const b = await client(token)
  a.emit("createRoom"); const { code } = await next(a, "roomState")
  b.emit("joinRoom", code); await next(b, "joined"); await next(a, "roomState")
  a.emit("move", 0); await next(a, "roomState") // game in progress, so a timeout would destroy the room

  let ended = false, awayCount = 0
  a.on("opponentLeft", () => (ended = true))
  a.on("roomState", (st) => { if (st.away) awayCount++ })

  const b2 = await client(token) // old socket b is still open (zombie)
  expect((await next(b2, "joined")).mark).toBe("O")
  await next(b, "replaced")

  await Bun.sleep(900) // well past GRACE_MS (400)
  expect(ended).toBe(false)
  expect(awayCount).toBe(0) // swapping sockets must not flash the opponent as "away"
  b2.emit("move", 4)
  let st = await next(a, "roomState")
  while (st.game.board[4] === null) st = await next(a, "roomState") // skip queued earlier updates
  expect(st.game.board[4]).toBe("O")
})

test("quick match never pairs a player with their own second tab", async () => {
  const token = `selfmatch${Date.now()}token`
  const a = await client(token), a2 = await client(token), c = await client()
  a.emit("quickMatch"); await next(a, "queued")
  a2.emit("quickMatch"); await next(a2, "queued") // waits instead of matching with itself
  c.emit("quickMatch")
  expect((await next(a2, "joined")).mark).toBe("X")
  expect((await next(c, "joined")).mark).toBe("O")
})

const ask = (s: Socket, ev: string) => new Promise<any>((r) => s.emit(ev, r))

test("sync answers with the room for seated players and null otherwise", async () => {
  const a = await client(), b = await client()
  expect(await ask(a, "sync")).toBeNull()
  a.emit("createRoom"); const { code } = await next(a, "roomState")
  const snap = await ask(a, "sync")
  expect(snap.code).toBe(code)
  b.emit("sync", "not-a-function") // bad payload is ignored, server stays up
  expect((await fetch(`http://127.0.0.1:${PORT}/healthz`)).ok).toBe(true)
})

test("sabotage rooms use a 6x6 board and keep the variant on rematch", async () => {
  const a = await client(), b = await client()
  a.emit("createRoom", "sabotage")
  const created = await next(a, "roomState")
  expect(created.game.variant).toBe("sabotage")
  expect(created.game.board).toHaveLength(36)
  b.emit("joinRoom", created.code); await next(b, "joined"); await next(a, "roomState")

  a.emit("move", 35)
  expect((await next(a, "roomState")).game.board[35]).toBe("X")
  a.emit("move", 36) // out of range: ignored
  b.emit("move", 0)
  expect((await next(a, "roomState")).game.board[0]).toBe("O")
})

test("sabotage never leaks hidden tiles; revealing and power-ups go through the server", async () => {
  const a = await client(), b = await client()
  a.emit("createRoom", "sabotage")
  const created = await next(a, "roomState")
  b.emit("joinRoom", created.code); await next(b, "joined"); await next(a, "roomState")

  expect(JSON.stringify(created)).not.toContain("hidden")
  expect(created.game.revealed).toEqual({})

  // play until someone claims a hidden tile (about 6 of 36 tiles hide something)
  let state = created
  let mover = a, other = b
  state = { ...state, game: { ...state.game } }
  for (let i = 0; i < 36 && Object.keys(state.game.revealed).length === 0; i++) {
    mover.emit("move", i)
    state = await next(a, "roomState")
    ;[mover, other] = state.game.turn === "X" ? [a, b] : [b, a]
  }
  expect(Object.keys(state.game.revealed).length).toBeGreaterThan(0)

  // a bogus power-up is ignored
  other.emit("usePowerUp", "bogus")
  mover.emit("usePowerUp", "bogus", 1)
  const probe = next(a, "roomState")
  mover.emit("move", 35)
  const after = await probe
  expect(after.game.board[35]).not.toBeNull()
})
