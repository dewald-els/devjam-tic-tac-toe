<script setup lang="ts">
import { useGame } from "../store"

const { state } = useGame()
</script>

<template>
  <div class="fixed bottom-4 inset-x-4 flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in state.toasts"
        :key="t.id"
        class="border-4 border-ink rounded-2xl px-4 py-2 font-bold shadow-pop-sm max-w-sm text-center"
        :class="t.kind === 'error' ? 'bg-coral text-white' : 'bg-white'">
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.9);
}
</style>
