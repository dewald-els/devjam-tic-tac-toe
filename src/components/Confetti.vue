<script setup lang="ts">
const colors = ["#FF5D73", "#1FC8B4", "#FFC83D", "#7C5CFF"]
const pieces = Array.from({ length: 48 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.4,
  dur: 1.8 + Math.random() * 1.4,
  drift: (Math.random() - 0.5) * 160,
  color: colors[i % colors.length],
  round: i % 3 === 0,
}))
</script>

<template>
  <div class="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <span
      v-for="(p, i) in pieces"
      :key="i"
      class="piece"
      :class="{ 'rounded-full': p.round }"
      :style="({
        left: p.left + '%',
        background: p.color,
        animationDelay: p.delay + 's',
        animationDuration: p.dur + 's',
        '--drift': p.drift + 'px',
      } as any)" />
  </div>
</template>

<style scoped>
.piece {
  position: absolute;
  top: -20px;
  width: 12px;
  height: 16px;
  border: 2px solid #2d2a4a;
  animation: fall linear forwards;
}
@keyframes fall {
  to {
    transform: translate(var(--drift), 110vh) rotate(720deg);
  }
}
</style>
