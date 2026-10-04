<script setup lang="ts">
import InstallPrompt from "./components/InstallPrompt.vue"
import { computed } from "vue"
import { useRoute } from "vue-router"
import ToastHost from "./components/ToastHost.vue"
import { useGame } from "./store"

const { state } = useGame()
// The game screen is a fixed viewport-sized layout: nothing on it should ever scroll.
const inGame = computed(() => useRoute().path === "/play")
</script>

<template>
  <main
    class="flex flex-col items-center justify-center p-3 sm:p-8"
    :class="inGame ? 'game-screen h-dvh overflow-hidden' : 'min-h-dvh'">
    <router-view />
  </main>
  <ToastHost />
  <InstallPrompt />
  <div
    v-if="!state.connected && state.mode === 'online'"
    class="fixed top-3 left-1/2 -translate-x-1/2 bg-ink text-cream px-4 py-2 rounded-full text-sm font-semibold"
    role="status">
    Connecting to server…
  </div>
</template>
