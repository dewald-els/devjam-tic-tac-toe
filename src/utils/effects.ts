import type { Cell, GameState, Mark } from "./game"

/**
 * Sabotage effects, one strategy object per effect.
 *
 * To add an effect: add one entry to `EFFECTS` below. The engine (`game.ts`), server, store and UI all
 * work off this registry, so nothing else needs to change:
 *  - `trap(...)`    triggers immediately when its tile is claimed (override `onClaim`)
 *  - `powerUp(...)` goes into the claimer's hand and is played later (override `use`)
 * Any hook you leave out falls back to the base defaults, like an inherited method.
 */

/** Mutable copy of the game that strategies edit. The engine turns it back into an immutable state. */
export interface Draft {
  /** Whose turn it is (the player claiming the tile / playing the power-up). */
  turn: Mark
  board: Cell[]
  blocked: number[]
  hands: Record<Mark, string[]>
  /** Tiles the current player may still place this turn. */
  movesLeft: number
  /** Set by a trap to make the mover miss their next turn. */
  skipMover: boolean
}

export interface EffectDef {
  name: string
  icon: string
  /** Shown to the player. Keep it neutral: both players read it. */
  desc: string
  kind: "trap" | "powerup"
  /** Relative chance of being hidden under a tile. */
  weight: number
  /** Power-ups only: the player must pick a tile before it can be played. */
  needsTarget: boolean
  /** Whether `index` is a legal target. Used to validate on the server and highlight tiles in the UI. */
  canTarget(game: GameState, index: number): boolean
  /** Runs when a tile hiding this effect is claimed. */
  onClaim(draft: Draft, id: string, index: number): void
  /** Runs when the power-up is played from a hand. */
  use(draft: Draft, target?: number): void
}

type EffectSpec = Partial<EffectDef> & Pick<EffectDef, "name" | "icon" | "desc">

const base: Omit<EffectDef, "name" | "icon" | "desc" | "kind"> = {
  weight: 1,
  needsTarget: false,
  canTarget: () => false,
  onClaim: () => {},
  use: () => {},
}

/** Triggers on claim. */
const trap = (spec: EffectSpec): EffectDef => ({ ...base, kind: "trap", ...spec })

/** Goes into the claimer's hand by default. */
const powerUp = (spec: EffectSpec): EffectDef => ({
  ...base,
  kind: "powerup",
  onClaim: (draft, id) => void draft.hands[draft.turn].push(id),
  ...spec,
})

const registry = <T extends Record<string, EffectDef>>(effects: T) => effects

export const EFFECTS = registry({
  skip: trap({
    name: "Skip",
    icon: "⏭️",
    desc: "Trap! They lose their next turn.",
    onClaim: (d) => void (d.skipMover = true),
  }),

  bomb: trap({
    name: "Bomb",
    icon: "💣",
    desc: "Trap! The mark is blown away and the tile is blocked.",
    onClaim: (d, _id, index) => {
      d.board[index] = null
      d.blocked.push(index)
    },
  }),

  block: powerUp({
    name: "Block",
    icon: "🚧",
    desc: "Lock any empty tile for the rest of the game.",
    weight: 2,
    needsTarget: true,
    canTarget: (g, i) => g.board[i] === null && !g.blocked.includes(i),
    use: (d, target) => void d.blocked.push(target!),
  }),

  double: powerUp({
    name: "Double",
    icon: "✌️",
    desc: "Play two tiles this turn.",
    weight: 2,
    use: (d) => void (d.movesLeft += 1),
  }),

  remove: powerUp({
    name: "Remove",
    icon: "🧹",
    desc: "Wipe one of your opponent's marks off the board.",
    weight: 2,
    needsTarget: true,
    canTarget: (g, i) => g.board[i] !== null && g.board[i] !== g.turn,
    use: (d, target) => void (d.board[target!] = null),
  }),

  reverse: powerUp({
    name: "Reverse",
    icon: "🔄",
    desc: "Swap every X and O on the board.",
    use: (d) => {
      for (let i = 0; i < d.board.length; i++) if (d.board[i]) d.board[i] = d.board[i] === "X" ? "O" : "X"
    },
  }),
})

export type Effect = keyof typeof EFFECTS

const IDS = Object.keys(EFFECTS) as Effect[]
export const POWER_UPS: Effect[] = IDS.filter((id) => EFFECTS[id].kind === "powerup")

export const isEffect = (id: unknown): id is Effect =>
  typeof id === "string" && Object.prototype.hasOwnProperty.call(EFFECTS, id)
export const isPowerUp = (id: unknown): id is Effect => isEffect(id) && EFFECTS[id].kind === "powerup"

/** Random effect, weighted by each strategy's `weight`. */
export function pickEffect(): Effect {
  let roll = Math.random() * IDS.reduce((sum, id) => sum + EFFECTS[id].weight, 0)
  for (const id of IDS) {
    roll -= EFFECTS[id].weight
    if (roll < 0) return id
  }
  return IDS[IDS.length - 1]
}
