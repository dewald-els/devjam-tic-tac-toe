<script setup lang="ts">
defineProps<{ mark: "X" | "O" }>()
</script>

<template>
  <svg viewBox="0 0 100 100" class="w-full h-full" fill="none" stroke-width="14" stroke-linecap="round" aria-hidden="true">
    <template v-if="mark === 'X'">
      <path class="draw" d="M24 24 L76 76" stroke="#FF5D73" pathLength="1" />
      <path class="draw delay" d="M76 24 L24 76" stroke="#FF5D73" pathLength="1" />
    </template>
    <circle v-else class="draw" cx="50" cy="50" r="27" stroke="#1FC8B4" pathLength="1" />
  </svg>
</template>

<style scoped>
.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 0.3s ease-out forwards;
}
.delay {
  animation-delay: 0.15s;
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
