export type Mark = "X" | "O"
export type Cell = Mark | null

export type Variant = "classic" | "vanishing" | "sabotage"

/** In "vanishing" games a player keeps at most this many marks; placing another removes their oldest. */
export const MAX_MARKS = 3

/** Board side length and marks-in-a-row needed to win, per variant. */
export const SABOTAGE_SIZE = 6
export const SABOTAGE_WIN_LENGTH = 4

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
    variant: game.variant,
    size: game.size,
    winLength: game.winLength,
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
