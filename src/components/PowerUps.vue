<script setup lang="ts">
import { computed, ref } from "vue"
import { useGame } from "../store"
import { EFFECTS, other, type Effect, type Mark } from "../utils/game"

const { state, actions } = useGame()

const me = computed<Mark>(() => state.you ?? "X")
const finished = computed(() => state.game.winner !== null || state.game.draw)
const myTurn = computed(() => state.you === state.game.turn && !finished.value)
const canUse = computed(() => myTurn.value && !state.game.powerUsed && state.opponentPresent && !state.opponentAway)

// Tapping a power-up shows what it does; it's only played from the Use button
const picked = ref<Effect | null>(null)
const info = computed(() => (picked.value && state.game.hands[me.value].includes(picked.value) ? picked.value : null))
const helpOpen = ref(false)

const pick = (effect: Effect) => {
  if (state.targeting && state.targeting !== effect) state.targeting = null
  picked.value = info.value === effect ? null : effect
}
const use = (effect: Effect) => {
  actions.usePowerUp(effect)
  if (!EFFECTS[effect].needsTarget) picked.value = null
}
const cancelTargeting = () => {
  state.targeting = null
}

const hint = computed(() => {
  if (state.targeting) return "Tap a highlighted tile on the board"
  if (myTurn.value && state.game.movesLeft > 1) return `You play ${state.game.movesLeft} tiles this turn`
  if (!myTurn.value && state.game.movesLeft > 1 && !finished.value) return `Opponent plays ${state.game.movesLeft} tiles`
  if (myTurn.value && state.game.powerUsed) return "Power-up used this turn"
  return ""
})
</script>

<template>
  <div class="w-full shrink-0 flex flex-col gap-1 items-center" aria-label="Power-ups">
    <div class="flex flex-wrap justify-center items-center gap-2">
      <button
        v-for="(effect, i) in state.game.hands[me]"
        :key="`${effect}${i}`"
        class="rounded-xl border-4 border-ink px-2.5 py-0.5 sm:px-3 sm:py-1 font-bold shadow-pop-sm flex items-center gap-1 transition-colors"
        :class="state.targeting === effect ? 'bg-coral text-white' : info === effect ? 'bg-white' : 'bg-sun'"
        :aria-pressed="info === effect"
        @click="pick(effect)">
        <span aria-hidden="true">{{ EFFECTS[effect].icon }}</span> {{ EFFECTS[effect].name }}
      </button>
      <span v-if="!state.game.hands[me].length" class="text-ink/50 font-semibold">
        No power-ups yet. Some tiles hide them!
      </span>
      <button
        class="w-8 h-8 rounded-full border-4 border-ink bg-white font-bold text-sm leading-none shadow-pop-sm"
        aria-label="What do the traps and power-ups do?"
        @click="helpOpen = true">
        ?
      </button>
    </div>

    <!-- What the tapped power-up does, and the button that actually plays it -->
    <div
      v-if="info && !state.targeting"
      class="fixed inset-x-3 bottom-3 z-10 mx-auto max-w-sm card !p-3 flex flex-col gap-2 text-center"
      role="status">
      <p class="font-bold">{{ EFFECTS[info].icon }} {{ EFFECTS[info].name }}</p>
      <p class="text-sm text-ink/80 leading-tight">
        {{ EFFECTS[info].desc }}
        <span v-if="EFFECTS[info].endsTurn"> Uses up your turn.</span>
      </p>
      <div class="flex justify-center gap-2">
        <button class="btn btn-ghost !py-1 !px-4 !text-base" @click="picked = null">Close</button>
        <button class="btn !py-1 !px-4 !text-base" :disabled="!canUse" @click="info && use(info)">
          {{ canUse ? (EFFECTS[info].needsTarget ? "Use, then pick a tile" : "Use") : myTurn ? "Already used one" : "Wait for your turn" }}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-center gap-2 text-sm font-semibold text-ink/70 h-7" role="status">
      <span class="leading-tight">{{ hint }}</span>
      <button v-if="state.targeting" class="btn btn-ghost !py-0 !px-3 !text-sm !border-2" @click="cancelTargeting">Cancel</button>
    </div>
    <p v-if="state.game.hands[other(me)].length" class="text-xs text-ink/60 leading-tight">
      Opponent holds:
      <span v-for="(effect, i) in state.game.hands[other(me)]" :key="`${effect}${i}`" :title="EFFECTS[effect].name">
        {{ EFFECTS[effect].icon }}
      </span>
    </p>

    <!-- Every effect in the game, straight from the registry -->
    <div
      v-if="helpOpen"
      class="fixed inset-0 z-20 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Traps and power-ups"
      @click.self="helpOpen = false">
      <div class="card !p-5 w-full max-w-sm flex flex-col gap-3 max-h-[85dvh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-center">Traps &amp; power-ups</h2>
        <p class="text-sm text-ink/70 text-center leading-tight">
          Some tiles hide something. You find out when someone claims the tile.
        </p>
        <ul class="flex flex-col gap-2">
          <li v-for="(e, id) in EFFECTS" :key="id" class="flex gap-3 items-start">
            <span class="text-2xl leading-none" aria-hidden="true">{{ e.icon }}</span>
            <div class="leading-tight">
              <p class="font-bold">
                {{ e.name }}
                <span class="text-xs font-semibold text-ink/60">{{ e.kind === "trap" ? "trap" : "power-up" }}</span>
              </p>
              <p class="text-sm text-ink/80">
                {{ e.desc }}
                <span v-if="e.kind === 'powerup' && e.endsTurn"> Uses up your turn.</span>
              </p>
            </div>
          </li>
        </ul>
        <button class="btn !py-2 !px-4 !text-base self-center" @click="helpOpen = false">Got it</button>
      </div>
    </div>
  </div>
</template>
