<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useGame } from "../store"
import type { Variant } from "../utils/game"

const { state, actions } = useGame()
const route = useRoute()
const router = useRouter()

const variant = ref<Variant>("classic")
const vanishing = computed(() => variant.value === "vanishing")
const screen = ref<"home" | "online" | "cpu">(route.query.room ? "online" : "home")
const code = ref(typeof route.query.room === "string" ? route.query.room.toUpperCase().slice(0, 4) : "")

// Invite links (/?room=ABCD) join straight away. The query is then removed so a
// refresh doesn't try to join again; the code stays in the box if it fails.
onMounted(() => {
  if (code.value.length === 4) {
    actions.joinRoom(code.value)
    router.replace({ path: "/", query: {} })
  }
})
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-5">
    <header class="text-center">
      <h1 class="text-5xl sm:text-6xl font-bold leading-tight">
        <span class="text-coral inline-block -rotate-6">X</span>
        Tic Tac Toe
        <span class="text-teal inline-block rotate-6">O</span>
      </h1>
      <p class="text-lg text-ink/70 mt-1">Three in a row. Bragging rights forever.</p>
    </header>

    <!-- 1. Pick a mode -->
    <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Game mode">
      <button
        v-for="m in [
          { id: 'classic', name: 'Classic', desc: 'The original 3x3' },
          { id: 'vanishing', name: 'Vanishing', desc: 'Only 3 marks each. The oldest fades away' },
        ]"
        :key="m.id"
        role="radio"
        :aria-checked="variant === m.id"
        class="rounded-2xl border-4 border-ink p-3 text-left shadow-pop-sm transition-colors"
        :class="variant === m.id ? 'bg-sun' : 'bg-white'"
        @click="variant = m.id as Variant">
        <div class="text-xl font-bold">{{ m.name }}</div>
        <div class="text-sm text-ink/70 leading-tight">{{ m.desc }}</div>
      </button>
    </div>

    <!-- 2. Pick how to play -->
    <template v-if="screen === 'home'">
      <button class="btn btn-grape !text-2xl" @click="screen = 'online'">🌐 Play online</button>
      <button class="btn" @click="screen = 'cpu'">🤖 Vs computer</button>
      <button class="btn btn-ghost" @click="actions.startLocal(variant)">👥 Pass &amp; play (one device)</button>
    </template>

    <section v-else-if="screen === 'online'" class="card flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost !py-1 !px-3 !text-base" aria-label="Back" @click="screen = 'home'">←</button>
        <h2 class="text-2xl font-bold">Play online</h2>
      </div>

      <template v-if="!state.queued">
        <button class="btn btn-grape" :disabled="vanishing" @click="actions.quickMatch">Quick match</button>
        <p v-if="vanishing" class="text-sm text-ink/60 -mt-2">Quick match is Classic only. Invite a friend to play Vanishing.</p>
      </template>
      <div v-else class="flex flex-col gap-3 items-center">
        <p class="font-bold animate-pulse" role="status">Searching for an opponent…</p>
        <button class="btn btn-ghost" @click="actions.cancelQueue">Cancel</button>
      </div>

      <div class="flex items-center gap-3 text-ink/50 font-semibold">
        <hr class="flex-1 border-2 border-ink/20" /> friends <hr class="flex-1 border-2 border-ink/20" />
      </div>
      <button class="btn" @click="actions.createRoom(variant)">Create a room</button>
      <form class="flex gap-3" @submit.prevent="actions.joinRoom(code)">
        <input
          v-model.trim="code"
          class="input min-w-0 flex-1"
          maxlength="4"
          placeholder="Room code"
          autocomplete="off"
          autocapitalize="characters"
          aria-label="Room code" />
        <button class="btn btn-grape" type="submit" :disabled="code.length < 4">Join</button>
      </form>
    </section>

    <section v-else class="card flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost !py-1 !px-3 !text-base" aria-label="Back" @click="screen = 'home'">←</button>
        <h2 class="text-2xl font-bold">Vs computer</h2>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button class="btn btn-ghost" @click="actions.startCpu('easy', variant)">Easy</button>
        <button class="btn btn-grape" @click="actions.startCpu('hard', variant)">Unbeatable</button>
      </div>
    </section>
  </div>
</template>
