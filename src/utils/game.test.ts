import { describe, expect, test } from "bun:test"
import { applyMove, cpuMove, isFinished, newGame, type GameState } from "./game"

const play = (moves: number[], g: GameState = newGame()) =>
  moves.reduce<GameState>((acc, m) => applyMove(acc, m) ?? acc, g)

describe("game engine", () => {
  test("alternates turns", () => {
    const g = play([0, 1])
    expect(g.board.slice(0, 2)).toEqual(["X", "O"])
    expect(g.turn).toBe("X")
  })

  test("rejects occupied, out-of-range and non-integer moves", () => {
    const g = play([4])
    expect(applyMove(g, 4)).toBeNull()
    expect(applyMove(g, 9)).toBeNull()
    expect(applyMove(g, -1)).toBeNull()
    expect(applyMove(g, 1.5)).toBeNull()
  })

  test("detects every winning line", () => {
    for (const line of [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]) {
      const others = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !line.includes(i))
      const g = play([line[0], others[0], line[1], others[1], line[2]])
      expect(g.winner).toBe("X")
      expect(g.line).toEqual(line)
    }
  })

  test("detects a draw and blocks further moves", () => {
    const g = play([0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(g.draw).toBe(true)
    expect(g.winner).toBeNull()
    expect(applyMove(g, 0)).toBeNull()
  })

  test("a win on the 9th move is a win, not a draw", () => {
    const g = play([1, 0, 2, 3, 6, 4, 5, 7, 8])
    expect(g.winner).toBe("X")
    expect(g.draw).toBe(false)
  })

  test("hard CPU never loses against random play", () => {
    for (let n = 0; n < 40; n++) {
      let g = newGame(n % 2 ? "X" : "O") // CPU is X; random player is O
      while (!isFinished(g)) {
        const cpu = g.turn === "X"
        g = applyMove(g, cpuMove(g, cpu ? "hard" : "easy"))!
      }
      expect(g.winner).not.toBe("O")
    }
  })

  test("hard CPU takes a win and blocks", () => {
    expect(cpuMove(play([0, 3, 1, 4]), "hard")).toBe(2) // X to move: win at 2
    expect(cpuMove(play([0, 4, 1]), "hard")).toBe(7 - 5) // O must block at 2
  })
})

describe("vanishing variant", () => {
  const v = (moves: number[]) => play(moves, newGame("X", "vanishing"))

  test("a 4th mark removes that player's oldest", () => {
    const g = v([0, 3, 1, 4, 8, 7, 6]) // X: 0,1,8,6 -> 0 vanishes
    expect(g.board[0]).toBeNull()
    expect(g.board.filter((c) => c === "X").length).toBe(3)
    expect(g.board.filter((c) => c === "O").length).toBe(3)
  })

  test("never ends in a draw", () => {
    const g = v([0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(g.draw).toBe(false)
  })

  test("a vanished cell can be replayed", () => {
    expect(applyMove(v([0, 3, 1, 4, 8, 7, 6]), 0)).not.toBeNull()
  })

  test("CPU takes a win in vanishing mode", () => {
    expect(cpuMove(v([0, 3, 1, 4]), "hard")).toBe(2)
  })
})

describe("sabotage variant", () => {
  const s = (moves: number[]) => play(moves, newGame("X", "sabotage"))

  test("starts as an empty 6x6 board needing 4 in a row", () => {
    const g = newGame("X", "sabotage")
    expect(g.board).toHaveLength(36)
    expect([g.size, g.winLength]).toEqual([6, 4])
  })

  test("4 in a row wins, 3 does not", () => {
    // X: 0,1,2 ; O: 6,7,8
    expect(s([0, 6, 1, 7, 2, 8]).winner).toBeNull()
    const g = s([0, 6, 1, 7, 2, 8, 3])
    expect(g.winner).toBe("X")
    expect(g.line).toEqual([0, 1, 2, 3])
  })

  test("wins vertically and on both diagonals", () => {
    expect(s([0, 1, 6, 2, 12, 3, 18]).winner).toBe("X")
    expect(s([0, 1, 7, 2, 14, 3, 21]).winner).toBe("X")
    expect(s([3, 0, 8, 1, 13, 2, 18]).winner).toBe("X")
  })

  test("a line cannot wrap around the board edge", () => {
    expect(s([4, 6, 5, 7, 6 + 0 === 6 ? 12 : 0, 8, 13]).winner).toBeNull()
  })

  test("rejects out-of-range moves", () => {
    const g = newGame("X", "sabotage")
    expect(applyMove(g, 36)).toBeNull()
    expect(applyMove(g, 35)).not.toBeNull()
  })
})
