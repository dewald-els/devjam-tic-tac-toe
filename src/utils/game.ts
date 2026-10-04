export type Mark = "X" | "O"
export type Cell = Mark | null

export type Variant = "classic" | "vanishing"

/** In "vanishing" games a player keeps at most this many marks; placing another removes their oldest. */
export const MAX_MARKS = 3

export interface GameState {
  variant: Variant
  /** Board indices in placement order (vanishing only; oldest first). */
  history: number[]
  board: Cell[]
  turn: Mark
  winner: Mark | null
  line: number[] | null
  draw: boolean
  moves: number
}

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export const other = (mark: Mark): Mark => (mark === "X" ? "O" : "X")

export function newGame(starter: Mark = "X", variant: Variant = "classic"): GameState {
  return {
    variant,
    history: [],
    board: Array<Cell>(9).fill(null),
    turn: starter,
    winner: null,
    line: null,
    draw: false,
    moves: 0,
  }
}

export function findWinner(board: Cell[]): { winner: Mark; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Mark, line }
    }
  }
  return null
}

export function isFinished(game: GameState): boolean {
  return game.winner !== null || game.draw
}

/** Returns the next state, or null when the move is illegal. Never mutates. */
export function applyMove(game: GameState, index: number): GameState | null {
  if (!Number.isInteger(index) || index < 0 || index > 8) return null
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
  const result = findWinner(board)

  return {
    variant: game.variant,
    history,
    board,
    moves,
    turn: other(game.turn),
    winner: result?.winner ?? null,
    line: result?.line ?? null,
    draw: !vanishing && !result && moves === 9,
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
