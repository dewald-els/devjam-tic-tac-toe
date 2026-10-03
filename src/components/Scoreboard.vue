<script setup lang="ts">
import { useGame } from "../store"

const { state } = useGame()

const tag = (mark: "X" | "O") => (state.you === mark ? " (you)" : "")
</script>

<template>
  <div class="grid grid-cols-3 gap-3 w-[min(88vw,22rem)] text-center">
    <div class="rounded-2xl border-4 border-ink bg-coral text-white py-2 shadow-pop-sm">
      <div class="text-sm font-semibold opacity-90">X{{ tag("X") }}</div>
      <div class="text-3xl font-bold leading-none">{{ state.scores.X }}</div>
    </div>
    <div class="rounded-2xl border-4 border-ink bg-white py-2 shadow-pop-sm">
      <div class="text-sm font-semibold opacity-70">Draws</div>
      <div class="text-3xl font-bold leading-none">{{ state.scores.draws }}</div>
    </div>
    <div class="rounded-2xl border-4 border-ink bg-teal text-ink py-2 shadow-pop-sm">
      <div class="text-sm font-semibold opacity-80">O{{ tag("O") }}</div>
      <div class="text-3xl font-bold leading-none">{{ state.scores.O }}</div>
    </div>
  </div>
</template>
