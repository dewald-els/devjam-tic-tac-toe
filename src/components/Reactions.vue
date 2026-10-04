<script setup lang="ts">
import { useGame } from "../store"

const { state, actions } = useGame()
const emojis = ["😂", "😮", "😈", "🎉", "❤️"]
</script>

<template>
  <div class="flex gap-2 shrink-0" role="group" aria-label="Send a reaction">
    <button
      v-for="e in emojis"
      :key="e"
      class="w-10 h-10 sm:w-11 sm:h-11 text-xl sm:text-2xl rounded-xl border-4 border-ink bg-white shadow-pop-sm active:translate-y-0.5 transition-transform"
      :aria-label="`React ${e}`"
      @click="actions.react(e)">
      {{ e }}
    </button>
  </div>

  <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <span
      v-for="r in state.reactions"
      :key="r.id"
      class="float text-6xl"
      :style="{ left: 15 + ((r.id * 37) % 70) + '%' }">
      {{ r.emoji }}
    </span>
  </div>
</template>

<style scoped>
.float {
  position: absolute;
  bottom: 12%;
  animation: rise 2.2s ease-out forwards;
}
@keyframes rise {
  to {
    transform: translateY(-55vh) scale(1.3);
    opacity: 0;
  }
}
</style>
