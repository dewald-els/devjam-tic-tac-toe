<script setup lang="ts">
import { useGame } from "../store"

const { state } = useGame()

const tag = (mark: "X" | "O") => (state.you === mark ? " (you)" : "")
</script>

<template>
  <div class="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[22rem] shrink-0 text-center">
    <div class="rounded-2xl border-4 border-ink bg-coral text-white py-1 sm:py-2 short:rounded-xl shadow-pop-sm">
      <div class="text-xs sm:text-sm leading-tight font-semibold opacity-90">X{{ tag("X") }}</div>
      <div class="text-2xl sm:text-3xl font-bold leading-none">{{ state.scores.X }}</div>
    </div>
    <div class="rounded-2xl border-4 border-ink bg-white py-1 sm:py-2 short:rounded-xl shadow-pop-sm">
      <div class="text-xs sm:text-sm leading-tight font-semibold opacity-70">Draws</div>
      <div class="text-2xl sm:text-3xl font-bold leading-none">{{ state.scores.draws }}</div>
    </div>
    <div class="rounded-2xl border-4 border-ink bg-teal text-ink py-1 sm:py-2 short:rounded-xl shadow-pop-sm">
      <div class="text-xs sm:text-sm leading-tight font-semibold opacity-80">O{{ tag("O") }}</div>
      <div class="text-2xl sm:text-3xl font-bold leading-none">{{ state.scores.O }}</div>
    </div>
  </div>
</template>
