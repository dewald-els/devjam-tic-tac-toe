<script setup lang="ts">
import { dismissInstall, install, promptInstall } from "../utils/pwa"
</script>

<template>
  <Transition name="install">
    <div
      v-if="install.visible"
      class="fixed top-3 inset-x-3 z-40 mx-auto max-w-sm card !p-3 flex items-center gap-3"
      role="dialog"
      aria-label="Install Tic Tac Toe">
      <img src="/icon-192.png" alt="" class="w-12 h-12 rounded-xl shrink-0" />
      <div class="flex-1 min-w-0 leading-tight">
        <p class="font-bold">Install Tic Tac Toe</p>
        <p v-if="install.canPrompt" class="text-sm opacity-70">Play full screen, right from your home screen.</p>
        <p v-else class="text-sm opacity-70">Tap Share, then “Add to Home Screen”.</p>
      </div>
      <button v-if="install.canPrompt" class="btn !px-3 !py-1.5 !text-base" @click="promptInstall">Install</button>
      <button class="text-2xl leading-none px-1 opacity-60" aria-label="Dismiss" @click="dismissInstall">×</button>
    </div>
  </Transition>
</template>

<style scoped>
.install-enter-active,
.install-leave-active {
  transition: all 0.25s ease;
}
.install-enter-from,
.install-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>
