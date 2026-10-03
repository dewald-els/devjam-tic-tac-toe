<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useGame } from "../store"

const { state, actions } = useGame()
const route = useRoute()
const router = useRouter()

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
  <div class="w-full max-w-md flex flex-col gap-6">
    <header class="text-center">
      <h1 class="text-5xl sm:text-6xl font-bold leading-tight">
        <span class="text-coral inline-block -rotate-6">X</span>
        Tic Tac Toe
        <span class="text-teal inline-block rotate-6">O</span>
      </h1>
      <p class="text-lg text-ink/70 mt-1">Three in a row. Bragging rights forever.</p>
    </header>

    <section class="card flex flex-col gap-3">
      <h2 class="text-2xl font-bold">Quick match</h2>
      <p class="text-ink/70 -mt-2">Get paired with another player who's looking for a game.</p>
      <button v-if="!state.queued" class="btn btn-grape" @click="actions.quickMatch">Find an opponent</button>
      <div v-else class="flex flex-col gap-3 items-center">
        <p class="font-bold animate-pulse" role="status">Searching for an opponent…</p>
        <button class="btn btn-ghost" @click="actions.cancelQueue">Cancel</button>
      </div>
    </section>

    <section class="card flex flex-col gap-3">
      <h2 class="text-2xl font-bold">Play with a friend</h2>
      <button class="btn" @click="actions.createRoom">Create a room</button>
      <div class="flex items-center gap-3 text-ink/50 font-semibold">
        <hr class="flex-1 border-2 border-ink/20" /> or <hr class="flex-1 border-2 border-ink/20" />
      </div>
      <form class="flex flex-col gap-3" @submit.prevent="actions.joinRoom(code)">
        <input
          v-model.trim="code"
          class="input"
          maxlength="4"
          placeholder="Enter room code"
          autocomplete="off"
          autocapitalize="characters"
          aria-label="Room code" />
        <button class="btn btn-grape" type="submit" :disabled="code.length < 4">Join room</button>
      </form>
    </section>

    <section class="card flex flex-col gap-3">
      <h2 class="text-2xl font-bold">Play the computer</h2>
      <div class="grid grid-cols-2 gap-3">
        <button class="btn btn-ghost" @click="actions.startCpu('easy')">Easy</button>
        <button class="btn btn-grape" @click="actions.startCpu('hard')">Unbeatable</button>
      </div>
    </section>

    <section class="card flex flex-col gap-3">
      <h2 class="text-2xl font-bold">Same device?</h2>
      <p class="text-ink/70 -mt-2">Pass the screen back and forth with a friend.</p>
      <button class="btn btn-ghost" @click="actions.startLocal">Play locally</button>
    </section>
  </div>
</template>
