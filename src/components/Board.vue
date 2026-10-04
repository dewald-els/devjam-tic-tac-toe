<script setup lang="ts">
import { computed } from "vue"
import { useGame } from "../store"
import { MAX_MARKS } from "../utils/game"
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

const label = (i: number) => {
  const cell = state.game.board[i]
  const size = state.game.size
  return `Row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}: ${cell ?? "empty"}`
}
</script>

<template>
  <div
    class="grid"
    :class="
      state.game.size > 3
        ? 'gap-1 sm:gap-2 w-[min(92vw,28rem,50dvh)] h-[min(92vw,28rem,50dvh)]'
        : 'gap-2 sm:gap-4 w-[min(88vw,22rem,46dvh)] h-[min(88vw,22rem,46dvh)]'
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
        hint: !cell && canPlay,
        fading: i === fading,
      }"
      :disabled="!!cell || !canPlay"
      :aria-label="label(i)"
      @click="actions.play(i)">
      <Mark v-if="cell" :mark="cell" class="absolute inset-0 m-auto w-[72%] h-[72%]" />
    </button>
  </div>
</template>

<style scoped>
.cell {
  transition: transform 0.12s, background-color 0.2s;
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
