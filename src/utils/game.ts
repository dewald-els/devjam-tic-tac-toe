export type Mark = "X" | "O"
export type Cell = Mark | null

export interface GameState {
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

export function newGame(starter: Mark = "X"): GameState {
  return {
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
  const result = findWinner(board)

  return {
    board,
    moves,
    turn: other(game.turn),
    winner: result?.winner ?? null,
    line: result?.line ?? null,
    draw: !result && moves === 9,
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
  let best = -Infinity
  let picks: number[] = []
  for (const i of options) {
    const score = minimax(applyMove(game, i)!, me, 1)
    if (score > best) [best, picks] = [score, [i]]
    else if (score === best) picks.push(i)
  }
  return picks[Math.floor(Math.random() * picks.length)]
}
