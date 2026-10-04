import { describe, expect, test } from "bun:test"
import {
  applyMove,
  applySabotageMove,
  cpuMove,
  generateHidden,
  isFinished,
  newGame,
  usePowerUp,
  type Effect,
  type GameState,
} from "./game"

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
  const none = {}
  const sab = (moves: number[], hidden: Record<number, Effect> = none, g: GameState = newGame("X", "sabotage")) =>
    moves.reduce((game, m) => applySabotageMove(game, hidden, m)!, g)

  test("starts as an empty 6x6 board needing 5 in a row", () => {
    const g = newGame("X", "sabotage")
    expect(g.board).toHaveLength(36)
    expect([g.size, g.winLength]).toEqual([6, 5])
  })

  test("5 in a row wins, 4 does not", () => {
    expect(sab([0, 6, 1, 7, 2, 8, 3, 9]).winner).toBeNull()
    const g = sab([0, 6, 1, 7, 2, 8, 3, 9, 4])
    expect(g.winner).toBe("X")
    expect(g.line).toEqual([0, 1, 2, 3, 4])
  })

  test("wins vertically and diagonally, never by wrapping the edge", () => {
    expect(sab([0, 1, 6, 2, 12, 3, 18, 4, 24]).winner).toBe("X")
    expect(sab([0, 1, 7, 2, 14, 3, 21, 4, 28]).winner).toBe("X")
    expect(sab([2, 6, 3, 7, 4, 8, 5, 9, 6 + 6]).winner).toBeNull() // 2..5 then next row: not a line
  })

  test("rejects out-of-range moves", () => {
    const g = newGame("X", "sabotage")
    expect(applySabotageMove(g, none, 36)).toBeNull()
    expect(applySabotageMove(g, none, 35)).not.toBeNull()
  })

  test("a power-up tile goes into the claimer's hand and is revealed", () => {
    const g = sab([5], { 5: "double" })
    expect(g.hands.X).toEqual(["double"])
    expect(g.revealed[5]).toBe("double")
    expect(g.turn).toBe("O")
  })

  test("skip trap: opponent plays twice in a row", () => {
    let g = sab([5], { 5: "skip" })
    expect([g.turn, g.movesLeft]).toEqual(["O", 2])
    g = sab([0], none, g)
    expect([g.turn, g.movesLeft]).toEqual(["O", 1])
    g = sab([1], none, g)
    expect(g.turn).toBe("X")
  })

  test("bomb trap removes the mark and blocks the tile", () => {
    const g = sab([5], { 5: "bomb" })
    expect(g.board[5]).toBeNull()
    expect(g.blocked).toEqual([5])
    expect(applySabotageMove(g, none, 5)).toBeNull()
  })

  test("power-ups: double, block, remove, reverse", () => {
    const hidden: Record<number, Effect> = { 0: "double", 1: "block", 2: "remove", 3: "reverse" }
    let g = sab([0, 20, 1, 21, 2, 22, 3, 23], hidden) // X holds all four; O has marks at 20..23
    expect(g.hands.X).toEqual(["double", "block", "remove", "reverse"])
    expect(g.turn).toBe("X")
    // not allowed on the other player's turn
    expect(usePowerUp({ ...g, turn: "O" }, "block", 30)).toBeNull()

    const blocked = usePowerUp(g, "block", 30)!
    expect(blocked.blocked).toEqual([30])
    expect(blocked.turn).toBe("O") // playing a power-up uses up the turn
    expect(blocked.hands.X).not.toContain("block")
    expect(usePowerUp(blocked, "remove", 0)).toBeNull() // O holds no power-ups
    expect(applySabotageMove(blocked, none, 30)).toBeNull()
    expect(usePowerUp(g, "block", 0)).toBeNull() // occupied tile

    const removed = usePowerUp(g, "remove", 20)!
    expect(removed.board[20]).toBeNull()
    expect(usePowerUp(g, "remove", 0)).toBeNull() // own mark

    const reversed = usePowerUp(g, "reverse")!
    expect(reversed.board[0]).toBe("O")
    expect(reversed.board[20]).toBe("X")

    const doubled = usePowerUp(g, "double")!
    expect(doubled.turn).toBe("X") // Double is free: it doesn't use up the turn
    expect(doubled.movesLeft).toBe(2)
    expect(usePowerUp(doubled, "block", 30)).toBeNull() // free power-ups: still one per turn
    const after = applySabotageMove(doubled, none, 10)!
    expect(after.turn).toBe("X")
    expect(applySabotageMove(after, none, 11)!.turn).toBe("O")
  })

  test("skip claimed mid-turn (during a Double) is not lost", () => {
    const hidden: Record<number, Effect> = { 0: "double", 1: "skip" }
    let g = sab([0, 20], hidden) // X holds Double
    g = usePowerUp(g, "double")! // X now plays two tiles
    g = sab([1], hidden, g) // first tile hides Skip: X still has a tile left
    expect([g.turn, g.movesLeft]).toEqual(["X", 1])
    g = sab([2], hidden, g) // second tile ends the turn
    expect([g.turn, g.movesLeft]).toEqual(["O", 2]) // O plays twice
    g = sab([21, 22], hidden, g)
    expect(g.turn).toBe("X")
  })

  test("skip while already playing two tiles still passes the penalty on", () => {
    const hidden: Record<number, Effect> = { 0: "skip", 1: "skip" }
    let g = sab([0], hidden) // X skip -> O gets two moves
    g = sab([1], hidden, g) // O's first tile is Skip too
    expect([g.turn, g.movesLeft]).toEqual(["O", 1])
    g = sab([2], hidden, g)
    expect([g.turn, g.movesLeft]).toEqual(["X", 2]) // X now plays twice
  })

  test("a power-up that ends the turn pays out a pending skip", () => {
    const hidden: Record<number, Effect> = { 0: "double", 1: "block", 2: "skip" }
    let g = sab([0, 20, 1, 21], hidden) // X holds Double + Block
    g = usePowerUp(g, "double")!
    g = sab([2], hidden, g) // Skip on the first of two tiles
    g = sab([3], hidden, g) // turn ends -> O plays twice
    expect([g.turn, g.movesLeft]).toEqual(["O", 2])
  })

  test("fuzz: random sabotage games never break the rules", () => {
    const names: Effect[] = ["block", "double", "remove", "reverse"]
    for (let n = 0; n < 300; n++) {
      const hidden = generateHidden(6)
      let g = newGame(n % 2 ? "X" : "O", "sabotage")
      for (let step = 0; step < 200 && !isFinished(g); step++) {
        // sometimes try a power-up (valid or not), otherwise place a tile
        let next: GameState | null = null
        if (Math.random() < 0.25) {
          next = usePowerUp(g, names[Math.floor(Math.random() * 4)], Math.floor(Math.random() * 36))
        }
        if (!next) {
          const open = g.board.flatMap((c, i) => (c === null && !g.blocked.includes(i) ? [i] : []))
          expect(open.length).toBeGreaterThan(0) // an unfinished game always has a legal tile
          next = applySabotageMove(g, hidden, open[Math.floor(Math.random() * open.length)])
          expect(next).not.toBeNull()
        }
        g = next!
        expect(g.board).toHaveLength(36)
        expect(g.movesLeft).toBeGreaterThanOrEqual(1)
        expect(g.bonusMoves).toBeGreaterThanOrEqual(0)
        for (const b of g.blocked) expect(g.board[b]).toBeNull() // nothing stands on a blocked tile
        expect(new Set(g.blocked).size).toBe(g.blocked.length)
        if (g.winner) expect(g.line!.every((i) => g.board[i] === g.winner)).toBe(true)
        // revealed tiles only ever come from the hidden map
        for (const [i, e] of Object.entries(g.revealed)) expect(hidden[Number(i)]).toBe(e)
      }
    }
  })

  test("generateHidden hides roughly 18% of tiles", () => {
    const hidden = generateHidden(6)
    expect(Object.keys(hidden)).toHaveLength(6)
  })
})
