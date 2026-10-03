<script setup lang="ts">
import { computed } from "vue"
import { useGame } from "../store"
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

const label = (i: number) => {
  const cell = state.game.board[i]
  return `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${cell ?? "empty"}`
}
</script>

<template>
  <div class="grid grid-cols-3 grid-rows-3 gap-3 sm:gap-4 w-[min(88vw,22rem)] h-[min(88vw,22rem)]" role="group" aria-label="Game board">
    <button
      v-for="(cell, i) in state.game.board"
      :key="i"
      class="cell relative block w-full h-full min-w-0 min-h-0 overflow-hidden rounded-2xl border-4 border-ink bg-white shadow-pop-sm"
      :class="{
        win: state.game.line?.includes(i),
        hint: !cell && canPlay,
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
.cell.hint:hover {
  cursor: pointer;
  transform: translateY(-3px) rotate(-1.5deg);
  background-color: #fff4dc;
}
.cell.hint:active {
  transform: translateY(2px);
}
.cell.win {
  background-color: #ffc83d;
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
