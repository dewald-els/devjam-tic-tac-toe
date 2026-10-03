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
