<script setup lang="ts">
import ToastHost from "./components/ToastHost.vue"
import { useGame } from "./store"

const { state } = useGame()
</script>

<template>
  <main class="min-h-dvh flex flex-col items-center justify-center p-3 sm:p-8">
    <router-view />
  </main>
  <ToastHost />
  <div
    v-if="!state.connected && state.mode === 'online'"
    class="fixed top-3 left-1/2 -translate-x-1/2 bg-ink text-cream px-4 py-2 rounded-full text-sm font-semibold"
    role="status">
    Connecting to server…
  </div>
</template>
