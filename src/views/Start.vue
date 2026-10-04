<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import ModePicker from "../components/ModePicker.vue"
import { useGame } from "../store"
import { SABOTAGE_SIZE, SABOTAGE_WIN_LENGTH, type Variant } from "../utils/game"

const { state, actions } = useGame()
const route = useRoute()
const router = useRouter()

const variant = ref<Variant>("classic")
const choosingMode = ref(false)

const createRoom = () => {
  choosingMode.value = false
  actions.createRoom(variant.value)
}

const ALL_MODES: { id: Variant; name: string; desc: string; onlineOnly?: boolean }[] = [
  { id: "classic", name: "Classic", desc: "The original 3x3" },
  { id: "vanishing", name: "Vanishing", desc: "Only 3 marks each. The oldest fades away" },
  { id: "sabotage", name: "Sabotage", desc: `Big ${SABOTAGE_SIZE}x${SABOTAGE_SIZE} grid, ${SABOTAGE_WIN_LENGTH} in a row. Hidden traps and power-ups`, onlineOnly: true },
]
const modes = computed(() => ALL_MODES.filter((m) => !m.onlineOnly || screen.value === "online"))

const go = (to: typeof screen.value) => {
  screen.value = to
  if (!modes.value.some((m) => m.id === variant.value)) variant.value = "classic"
}
const screen = ref<"home" | "online" | "cpu" | "local">(route.query.room ? "online" : "home")
const code = ref(typeof route.query.room === "string" ? route.query.room.toUpperCase().slice(0, 4) : "")

// Invite links (/?room=ABCD) join straight away. The query is then removed so a
// refresh doesn't try to join again; the code stays in the box if it fails.
const closeOnEsc = (e: KeyboardEvent) => {
  if (e.key === "Escape") choosingMode.value = false
}
onUnmounted(() => window.removeEventListener("keydown", closeOnEsc))

onMounted(() => {
  window.addEventListener("keydown", closeOnEsc)
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

    <!-- Pick how to play; each screen then offers its own game modes -->
    <template v-if="screen === 'home'">
      <button class="btn btn-grape !text-2xl" @click="go('online')">🌐 Play online</button>
      <button class="btn" @click="go('cpu')">🤖 Vs computer</button>
      <button class="btn btn-ghost" @click="go('local')">👥 Pass &amp; play (one device)</button>
    </template>

    <template v-else-if="screen === 'online'">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost !py-1 !px-3 !text-base" aria-label="Back" @click="screen = 'home'">←</button>
        <h2 class="text-2xl font-bold">Play online</h2>
      </div>

      <!-- Random opponent: always Classic, so it has no mode picker -->
      <section class="card flex flex-col gap-3">
        <h3 class="text-xl font-bold">Quick match</h3>
        <template v-if="!state.queued">
          <p class="text-sm text-ink/70 -mt-2">Get paired with a random opponent. Classic 3x3 only.</p>
          <button class="btn btn-grape" @click="actions.quickMatch">Find an opponent</button>
        </template>
        <div v-else class="flex flex-col gap-3 items-center">
          <p class="font-bold animate-pulse" role="status">Searching for an opponent…</p>
          <button class="btn btn-ghost" @click="actions.cancelQueue">Cancel</button>
        </div>
      </section>

      <!-- Private room: Create a room asks for the game mode in a popup -->
      <section class="card flex flex-col gap-3">
        <h3 class="text-xl font-bold">Play with a friend</h3>
        <button class="btn" @click="choosingMode = true">Create a room</button>
        <div class="flex items-center gap-3 text-ink/50 font-semibold">
          <hr class="flex-1 border-2 border-ink/20" /> or join <hr class="flex-1 border-2 border-ink/20" />
        </div>
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
    </template>

    <section v-else-if="screen === 'cpu'" class="card flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost !py-1 !px-3 !text-base" aria-label="Back" @click="screen = 'home'">←</button>
        <h2 class="text-2xl font-bold">Vs computer</h2>
      </div>
      <ModePicker v-model="variant" :modes="modes" />
      <div class="grid grid-cols-2 gap-3">
        <button class="btn btn-ghost" @click="actions.startCpu('easy', variant)">Easy</button>
        <button class="btn btn-grape" @click="actions.startCpu('hard', variant)">Unbeatable</button>
      </div>
    </section>

    <section v-else class="card flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost !py-1 !px-3 !text-base" aria-label="Back" @click="screen = 'home'">←</button>
        <h2 class="text-2xl font-bold">Pass &amp; play</h2>
      </div>
      <ModePicker v-model="variant" :modes="modes" />
      <button class="btn btn-grape" @click="actions.startLocal(variant)">Start</button>
    </section>

    <div
      v-if="choosingMode"
      class="fixed inset-0 z-20 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a game mode"
      @click.self="choosingMode = false">
      <div class="card !p-5 w-full max-w-md flex flex-col gap-4">
        <h2 class="text-2xl font-bold text-center">Choose a game mode</h2>
        <ModePicker v-model="variant" :modes="modes" />
        <div class="flex justify-center gap-3">
          <button class="btn btn-ghost !py-2 !px-4 !text-base" @click="choosingMode = false">Cancel</button>
          <button class="btn !py-2 !px-4 !text-base" @click="createRoom">Create room</button>
        </div>
      </div>
    </div>
  </div>
</template>
