<script setup lang="ts">
import { computed } from "vue"
import { useGame } from "../store"
import { EFFECTS, other, type Mark } from "../utils/game"

const { state, actions } = useGame()

const me = computed<Mark>(() => state.you ?? "X")
const finished = computed(() => state.game.winner !== null || state.game.draw)
const myTurn = computed(() => state.you === state.game.turn && !finished.value)
const canUse = computed(() => myTurn.value && !state.game.powerUsed && state.opponentPresent && !state.opponentAway)

const hint = computed(() => {
  if (state.targeting) return `${EFFECTS[state.targeting].name}: ${EFFECTS[state.targeting].desc} Tap a highlighted tile.`
  if (myTurn.value && state.game.movesLeft > 1) return `You play ${state.game.movesLeft} tiles this turn`
  if (!myTurn.value && state.game.movesLeft > 1 && !finished.value) return `Opponent plays ${state.game.movesLeft} tiles`
  if (myTurn.value && state.game.powerUsed) return "Power-up used this turn"
  return ""
})
</script>

<template>
  <div class="w-full max-w-[28rem] flex flex-col gap-1 items-center" aria-label="Power-ups">
    <div class="flex flex-wrap justify-center gap-2 min-h-[2.75rem]">
      <button
        v-for="(effect, i) in state.game.hands[me]"
        :key="`${effect}${i}`"
        class="rounded-xl border-4 border-ink px-3 py-1 font-bold shadow-pop-sm flex items-center gap-1 transition-colors"
        :class="state.targeting === effect ? 'bg-coral text-white' : 'bg-sun'"
        :disabled="!canUse"
        :title="EFFECTS[effect].desc"
        @click="actions.usePowerUp(effect)">
        <span aria-hidden="true">{{ EFFECTS[effect].icon }}</span> {{ EFFECTS[effect].name }}
      </button>
      <span v-if="!state.game.hands[me].length" class="text-ink/50 font-semibold self-center">
        No power-ups yet. Some tiles hide them!
      </span>
    </div>
    <p class="text-sm font-semibold text-ink/70 min-h-[1.25rem]" role="status">{{ hint }}</p>
    <p v-if="state.game.hands[other(me)].length" class="text-xs text-ink/60">
      Opponent holds:
      <span v-for="(effect, i) in state.game.hands[other(me)]" :key="`${effect}${i}`" :title="EFFECTS[effect].name">
        {{ EFFECTS[effect].icon }}
      </span>
    </p>
  </div>
</template>
