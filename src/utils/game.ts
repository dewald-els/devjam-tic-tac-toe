import { EFFECTS, isPowerUp, pickEffect, type Draft, type Effect } from "./effects"

export type Mark = "X" | "O"
export type Cell = Mark | null

export type Variant = "classic" | "vanishing" | "sabotage"

/** In "vanishing" games a player keeps at most this many marks; placing another removes their oldest. */
export const MAX_MARKS = 3

export { EFFECTS, isEffect, isPowerUp, POWER_UPS, type Effect } from "./effects"
/** Effects that can sit in a hand. */
export type PowerUp = Effect

/** Board side length and marks-in-a-row needed to win, per variant. */
export const SABOTAGE_SIZE = 6
export const SABOTAGE_WIN_LENGTH = 5

export const boardConfig = (variant: Variant): { size: number; winLength: number } =>
  variant === "sabotage" ? { size: SABOTAGE_SIZE, winLength: SABOTAGE_WIN_LENGTH } : { size: 3, winLength: 3 }

export interface GameState {
  variant: Variant
  /** Board side length (board has size * size cells). */
  size: number
  /** Marks in a row needed to win. */
  winLength: number
  /** Board indices in placement order (vanishing only; oldest first). */
  history: number[]
  board: Cell[]
  turn: Mark
  winner: Mark | null
  line: number[] | null
  draw: boolean
  moves: number
  /** Sabotage: tiles whose hidden effect has been revealed. */
  revealed: Record<number, Effect>
  /** Sabotage: tiles nobody can play (Block power-up, Bomb trap). */
  blocked: number[]
  /** Sabotage: collected power-ups. */
  hands: Record<Mark, PowerUp[]>
  /** Sabotage: moves the current player still has this turn (Double and Skip change it). */
  movesLeft: number
  /** Sabotage: extra tiles the next player gets when the turn passes (earned by the other player's Skip trap). */
  bonusMoves: number
  /** Sabotage: a power-up was already played this turn. */
  powerUsed: boolean
}

const linesCache = new Map<number, number[][]>()

/** Every winning line (rows, columns, both diagonals) of `winLength` cells on a `size` x `size` board. */
export function buildLines(size: number, winLength: number): number[][] {
  const key = size * 100 + winLength
  const cached = linesCache.get(key)
  if (cached) return cached
  const lines: number[][] = []
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of dirs) {
        const endR = r + dr * (winLength - 1)
        const endC = c + dc * (winLength - 1)
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue
        lines.push(Array.from({ length: winLength }, (_, k) => (r + dr * k) * size + c + dc * k))
      }
    }
  }
  linesCache.set(key, lines)
  return lines
}

export const LINES = buildLines(3, 3)

export const other = (mark: Mark): Mark => (mark === "X" ? "O" : "X")

export function newGame(starter: Mark = "X", variant: Variant = "classic"): GameState {
  const { size, winLength } = boardConfig(variant)
  return {
    variant,
    size,
    winLength,
    history: [],
    board: Array<Cell>(size * size).fill(null),
    turn: starter,
    winner: null,
    line: null,
    draw: false,
    moves: 0,
    revealed: {},
    blocked: [],
    hands: { X: [], O: [] },
    movesLeft: 1,
    bonusMoves: 0,
    powerUsed: false,
  }
}

export function findWinner(board: Cell[], size = 3, winLength = 3): { winner: Mark; line: number[] } | null {
  const lines = buildLines(size, winLength)
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l]
    const first = board[line[0]]
    if (!first) continue
    let k = 1
    while (k < line.length && board[line[k]] === first) k++
    if (k === line.length) return { winner: first, line }
  }
  return null
}

export const isBlocked = (game: GameState, index: number) => game.blocked.includes(index)

export function isFinished(game: GameState): boolean {
  return game.winner !== null || game.draw
}

/** Returns the next state, or null when the move is illegal. Never mutates. */
export function applyMove(game: GameState, index: number): GameState | null {
  if (!Number.isInteger(index) || index < 0 || index >= game.board.length) return null
  if (isFinished(game) || game.board[index] !== null) return null

  const board = game.board.slice()
  board[index] = game.turn
  const moves = game.moves + 1
  const vanishing = game.variant === "vanishing"
  let history = game.history
  if (vanishing) {
    history = [...history, index]
    const mine = history.filter((i) => board[i] === game.turn)
    if (mine.length > MAX_MARKS) {
      board[mine[0]] = null
      history = history.filter((i) => i !== mine[0])
    }
  }
  const result = findWinner(board, game.size, game.winLength)

  return {
    ...game,
    history,
    board,
    moves,
    turn: other(game.turn),
    winner: result?.winner ?? null,
    line: result?.line ?? null,
    draw: !vanishing && !result && moves === board.length,
  }
}

function minimax(game: GameState, me: Mark, depth: number): number {
  if (game.winner) return game.winner === me ? 10 - depth : depth - 10
  if (game.draw) return 0
  const scores = emptyCells(game).map((i) => minimax(applyMove(game, i)!, me, depth + 1))
  return game.turn === me ? Math.max(...scores) : Math.min(...scores)
}

export const emptyCells = (game: GameState): number[] =>
  game.board.flatMap((c, i) => (c === null ? [i] : []))

/** "easy" picks randomly; "hard" plays perfectly (can't be beaten, only drawn). */
export function cpuMove(game: GameState, level: "easy" | "hard"): number {
  const options = emptyCells(game)
  if (level === "easy") return options[Math.floor(Math.random() * options.length)]

  const me = game.turn
  // Vanishing games never end by filling the board, so full search doesn't terminate: win, block, else centre/random.
  if (game.variant === "vanishing") {
    const wins = (m: Mark, i: number) => applyMove({ ...game, turn: m }, i)?.winner === m
    return (
      options.find((i) => wins(me, i)) ??
      options.find((i) => wins(other(me), i)) ??
      (options.includes(4) ? 4 : options[Math.floor(Math.random() * options.length)])
    )
  }

  let best = -Infinity
  let picks: number[] = []
  for (const i of options) {
    const score = minimax(applyMove(game, i)!, me, 1)
    if (score > best) [best, picks] = [score, [i]]
    else if (score === best) picks.push(i)
  }
  return picks[Math.floor(Math.random() * picks.length)]
}

// --- Sabotage ---

const HIDDEN_SHARE = 0.18

/** Picks which tiles hide something. Server-side only: never put the result in GameState. */
export function generateHidden(size: number): Record<number, Effect> {
  const cells = Array.from({ length: size * size }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  const hidden: Record<number, Effect> = {}
  for (const cell of cells.slice(0, Math.round(cells.length * HIDDEN_SHARE))) hidden[cell] = pickEffect()
  return hidden
}

/** True when nobody can place another mark. */
const boardFull = (board: Cell[], blocked: number[]) => board.every((c, i) => c !== null || blocked.includes(i))

const toDraft = (game: GameState, movesLeft: number): Draft => ({
  turn: game.turn,
  board: game.board.slice(),
  blocked: game.blocked.slice(),
  hands: { X: game.hands.X.slice(), O: game.hands.O.slice() },
  movesLeft,
  skipMover: false,
})

/** The part of a new state that depends on the board: winner, line and draw. */
function outcome(game: GameState, d: Draft) {
  const result = findWinner(d.board, game.size, game.winLength)
  return {
    board: d.board,
    blocked: d.blocked,
    hands: d.hands as Record<Mark, Effect[]>,
    winner: result?.winner ?? null,
    line: result?.line ?? null,
    draw: !result && boardFull(d.board, d.blocked),
  }
}

/**
 * A sabotage move. Reveals whatever the tile hides and lets that effect's strategy act on it.
 * Returns null when illegal. `hidden` is the server's secret map; never mutated.
 */
export function applySabotageMove(game: GameState, hidden: Record<number, Effect>, index: number): GameState | null {
  if (!Number.isInteger(index) || index < 0 || index >= game.board.length) return null
  if (isFinished(game) || game.board[index] !== null || isBlocked(game, index)) return null

  const me = game.turn
  const d = toDraft(game, game.movesLeft - 1)
  d.board[index] = me
  const revealed = { ...game.revealed }

  const id = hidden[index]
  if (id) {
    revealed[index] = id
    EFFECTS[id].onClaim(d, id, index)
  }

  const out = outcome(game, d)
  const over = out.winner !== null || out.draw
  const keepTurn = !over && d.movesLeft > 0
  // Skip: my next turn is skipped, so the opponent plays twice. Remembered until the turn actually passes
  // (I may still have tiles left this turn, e.g. after a Double).
  const bonusMoves = game.bonusMoves + (d.skipMover ? 1 : 0)

  return {
    ...game,
    ...out,
    revealed,
    moves: game.moves + 1,
    movesLeft: keepTurn ? d.movesLeft : 1 + bonusMoves,
    bonusMoves: keepTurn ? bonusMoves : 0,
    powerUsed: keepTurn ? game.powerUsed : false,
    turn: keepTurn ? me : other(me),
  }
}

/**
 * Plays a power-up from the current player's hand. Most end the turn (`endsTurn`); the rest are free,
 * one per turn. Returns null when illegal.
 */
export function usePowerUp(game: GameState, effect: Effect, target?: number): GameState | null {
  if (game.variant !== "sabotage" || isFinished(game) || game.powerUsed || !isPowerUp(effect)) return null
  const me = game.turn
  const at = game.hands[me].indexOf(effect)
  if (at === -1) return null

  const def = EFFECTS[effect]
  if (def.needsTarget) {
    if (!Number.isInteger(target) || target! < 0 || target! >= game.board.length) return null
    if (!def.canTarget(game, target!)) return null
  }

  const d = toDraft(game, game.movesLeft)
  d.hands[me].splice(at, 1)
  def.use(d, target)

  const out = outcome(game, d)
  if (def.endsTurn && out.winner === null && !out.draw) {
    // Playing a power-up uses up the turn
    return { ...game, ...out, turn: other(me), movesLeft: 1 + game.bonusMoves, bonusMoves: 0, powerUsed: false }
  }
  return { ...game, ...out, movesLeft: d.movesLeft, powerUsed: true }
}
