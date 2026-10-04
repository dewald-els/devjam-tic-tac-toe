<script setup lang="ts">
import { computed } from "vue"
import { useGame } from "../store"
import { EFFECTS, MAX_MARKS } from "../utils/game"
import Mark from "./Mark.vue"

const { state, actions } = useGame()

const finished = computed(() => state.game.winner !== null || state.game.draw)
const canPlay = computed(
  () =>
    !finished.value &&
    state.opponentPresent &&
    !state.opponentAway &&
    (state.mode !== "online" || state.connected) &&
    (state.mode === "local" || state.you === state.game.turn)
)

// Vanishing games: the mover's oldest mark is about to disappear, so warn them.
const fading = computed(() => {
  const g = state.game
  if (g.variant !== "vanishing" || finished.value) return -1
  const mine = g.history.filter((i) => g.board[i] === g.turn)
  return mine.length >= MAX_MARKS ? mine[0] : -1
})

// Sabotage: while a Block/Remove power-up is armed, only valid target tiles can be clicked
const validTarget = (i: number) => !!state.targeting && EFFECTS[state.targeting].canTarget(state.game, i)
const enabled = (i: number) =>
  state.targeting
    ? validTarget(i)
    : state.game.board[i] === null && !state.game.blocked.includes(i) && canPlay.value

const label = (i: number) => {
  const g = state.game
  const cell = g.board[i]
  const extra = g.blocked.includes(i) ? ", blocked" : g.revealed[i] ? `, ${EFFECTS[g.revealed[i]].name}` : ""
  return `Row ${Math.floor(i / g.size) + 1}, column ${(i % g.size) + 1}: ${cell ?? "empty"}${extra}`
}
</script>

<template>
  <div
    class="grid"
    :class="
      state.game.size > 3
        ? 'gap-1 sm:gap-2 w-[min(92vw,28rem,50dvh)] h-[min(92vw,28rem,50dvh)] short:w-[min(92vw,28rem,44dvh)] short:h-[min(92vw,28rem,44dvh)]'
        : 'gap-2 sm:gap-4 w-[min(88vw,22rem,46dvh)] h-[min(88vw,22rem,46dvh)] short:w-[min(88vw,22rem,41dvh)] short:h-[min(88vw,22rem,41dvh)]'
    "
    :style="{ gridTemplateColumns: `repeat(${state.game.size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.game.size}, minmax(0, 1fr))` }"
    role="group"
    aria-label="Game board">
    <button
      v-for="(cell, i) in state.game.board"
      :key="i"
      class="cell relative block w-full h-full min-w-0 min-h-0 overflow-hidden border-ink bg-white shadow-pop-sm"
      :class="{
        'rounded-lg border-2': state.game.size > 3,
        'rounded-2xl border-4': state.game.size <= 3,
        win: state.game.line?.includes(i),
        hint: enabled(i),
        blocked: state.game.blocked.includes(i),
        target: !!state.targeting && validTarget(i),
        fading: i === fading,
      }"
      :disabled="!enabled(i)"
      :aria-label="label(i)"
      @click="actions.play(i)">
      <Mark
        v-if="cell"
        :mark="cell"
        class="absolute"
        :class="state.game.revealed[i] ? 'left-[5%] bottom-[5%] w-[66%] h-[66%]' : 'inset-0 m-auto w-[72%] h-[72%]'" />
      <span
        v-else-if="state.game.blocked.includes(i)"
        class="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl"
        aria-hidden="true">{{ state.game.revealed[i] === "bomb" ? "💥" : "🚧" }}</span>
      <!-- Effect found under this tile: round badge in the top-right corner -->
      <span
        v-if="cell && state.game.revealed[i]"
        class="badge absolute top-[5%] right-[5%] flex items-center justify-center rounded-full border-ink bg-white"
        :class="state.game.size > 3 ? 'border-2' : 'border-4'"
        aria-hidden="true">{{ EFFECTS[state.game.revealed[i]].icon }}</span>
    </button>
  </div>
</template>

<style scoped>
.cell {
  container-type: size;
  transition: transform 0.12s, background-color 0.2s;
}
/* Sized from the tile itself (cqw = 1% of its width), so it scales with the board */
.badge {
  width: 42cqw;
  height: 42cqw;
  font-size: 26cqw;
  line-height: 1;
}
.cell:disabled {
  cursor: default;
}
/* Only on real hover devices: iOS keeps :hover stuck on the last tapped cell */
@media (hover: hover) {
  .cell.hint:hover {
    cursor: pointer;
    transform: translateY(-3px) rotate(-1.5deg);
    background-color: #fff4dc;
  }
}
.cell.fading > * {
  animation: fade 1.2s ease-in-out infinite;
}
@keyframes fade {
  50% {
    opacity: 0.3;
  }
}
.cell.blocked {
  background-color: #d9d6e8;
}
.cell.target {
  outline: 3px dashed #ff6b5b;
  outline-offset: -3px;
}
.cell.hint:active {
  transform: translateY(2px);
}
/* Dark tile: coral and teal marks both stay clearly visible (yellow washed out the teal O) */
.cell.win {
  background-color: #2d2a4a;
  animation: bounce 0.6s ease-out;
}
@keyframes bounce {
  40% {
    transform: scale(1.12) rotate(3deg);
  }
  70% {
    transform: scale(0.96) rotate(-2deg);
  }
}
</style>
