<script setup lang="ts">
import { computed, ref, watch } from "vue"
import Board from "../components/Board.vue"
import Confetti from "../components/Confetti.vue"
import Reactions from "../components/Reactions.vue"
import Scoreboard from "../components/Scoreboard.vue"
import { toast, useGame } from "../store"
import { isMuted, setMuted } from "../utils/sound"

const { state, actions } = useGame()

const muted = ref(isMuted())
const settingsOpen = ref(false)
const toggleMute = () => {
  muted.value = !muted.value
  setMuted(muted.value)
}

const finished = computed(() => state.game.winner !== null || state.game.draw)
const waiting = computed(() => state.mode === "online" && !state.opponentPresent)
const iAskedRematch = computed(() => !!state.you && state.rematch.includes(state.you))
const opponentAskedRematch = computed(() => state.rematch.length > 0 && !iAskedRematch.value)
const rematchDismissed = ref(false)
// a fresh request (or a new game) should pop up again after a "Not now"
watch(opponentAskedRematch, () => (rematchDismissed.value = false))
const iWon = computed(() => state.game.winner !== null && (state.you === null || state.game.winner === state.you))

const status = computed(() => {
  const g = state.game
  if (state.mode === "online" && !state.connected) return "Reconnecting…"
  if (waiting.value) return state.hadOpponent ? "Opponent left the game" : "Waiting for a friend…"
  if (state.opponentAway) return "Opponent reconnecting…"
  if (g.draw) return "It's a draw! 🤝"
  if (g.winner) {
    if (state.you === null) return `${g.winner} wins! 🎉`
    return g.winner === state.you ? "You win! 🎉" : state.mode === "cpu" ? "The computer wins 🤖" : "You lost. Rematch? 😈"
  }
  const first = g.moves === 0 ? " (goes first)" : ""
  if (state.you === null) return `${g.turn}'s turn${first}`
  return g.turn === state.you ? `Your turn!${first}` : state.mode === "cpu" ? "Computer is thinking…" : "Opponent's turn…"
})

// Split a trailing emoji off the status so it can sit on its own white badge
const statusParts = computed(() => {
  const m = status.value.match(/^(.*?)\s*(\p{Extended_Pictographic}\uFE0F?)$/u)
  return m ? { text: m[1], emoji: m[2] } : { text: status.value, emoji: "" }
})
const statusText = computed(() => statusParts.value.text)
const statusEmoji = computed(() => statusParts.value.emoji)

// Blue when it's your turn, yellow when it's the opponent's. Local play has one "you", so it keeps X/O colours.
const turnColor = computed(() => {
  if (state.you === null) return state.game.turn === "X" ? "bg-coral text-white" : "bg-teal text-ink"
  return state.game.turn === state.you ? "bg-sky text-white" : "bg-sun"
})
const inviteBase = (import.meta.env.VITE_INVITE_BASE as string | undefined) ?? location.origin
const shareUrl = computed(() => `${inviteBase}/?room=${state.code}`)

// Clipboard API can fail on iOS (permissions / non-secure contexts), so fall back to a selection copy.
function legacyCopy(text: string): boolean {
  const el = document.createElement("textarea")
  el.value = text
  el.setAttribute("readonly", "")
  el.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px"
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, text.length)
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    document.body.removeChild(el)
  }
}

const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function" && /iPhone|iPad|Android/i.test(navigator.userAgent)

async function copy(text: string, message: string) {
  if (canShare) {
    try {
      await navigator.share({ title: "Tic Tac Toe", text: `Join my game! Room ${state.code}`, url: text })
      return
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return // user closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    toast(message)
  } catch {
    if (legacyCopy(text)) toast(message)
    else toast("Couldn't copy. Please copy it manually.", "error")
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-2.5 sm:gap-5">
    <div class="flex items-center justify-between gap-3 w-full max-w-[22rem] sm:max-w-md">
      <h1 class="text-2xl sm:text-4xl font-bold">
        <span class="text-coral">X</span> Tic Tac Toe <span class="text-teal">O</span>
      </h1>
      <div class="relative flex items-center gap-2">
        <button
          class="w-9 h-9 sm:w-11 sm:h-11 text-lg sm:text-xl rounded-xl border-4 border-ink bg-white shadow-pop-sm"
          :aria-label="muted ? 'Unmute sounds' : 'Mute sounds'"
          @click="toggleMute">
          {{ muted ? "🔇" : "🔊" }}
        </button>
        <button
          class="w-9 h-9 sm:w-11 sm:h-11 text-lg sm:text-xl rounded-xl border-4 border-ink bg-white shadow-pop-sm"
          aria-label="Settings"
          :aria-expanded="settingsOpen"
          @click="settingsOpen = !settingsOpen">
          ⚙️
        </button>
        <div
          v-if="settingsOpen"
          class="absolute right-0 top-full mt-2 z-10 card !p-2 flex flex-col gap-2 min-w-[10rem]">
          <button class="btn btn-ghost !py-2 !px-3 !text-base" @click="actions.leave">
            {{ state.mode === "online" ? "Leave room" : "Back to menu" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="state.mode === 'online' && !state.opponentPresent" class="card !py-2 !px-4 sm:!px-5 flex flex-row items-center justify-between gap-5 min-w-[17rem]">
      <div class="leading-tight text-left">
        <div class="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Room code</div>
        <div class="text-lg font-bold tracking-[0.2em]">{{ state.code }}</div>
      </div>
      <button class="btn bg-green-500 text-white !py-1 !px-3 !text-sm" @click="copy(shareUrl, 'Invite link copied!')">
        Copy link
      </button>
    </div>
    <div v-else-if="state.mode === 'cpu'" class="font-semibold text-ink/70">
      You (X) vs computer · {{ state.cpuLevel === "hard" ? "unbeatable" : "easy" }}
    </div>
    <div v-else-if="state.mode === 'local'" class="font-semibold text-ink/70">Playing locally on one device</div>
    <div v-if="state.game.variant === 'vanishing'" class="font-semibold text-ink/70 text-center">
      Vanishing mode: only 3 marks each, your oldest fades away
    </div>

    <div
      class="mt-4 mb-3 sm:my-0 flex items-stretch overflow-hidden rounded-full border-4 border-ink font-bold text-lg sm:text-xl shadow-pop-sm"
      :class="
        iWon
          ? 'bg-green-600 text-white'
          : state.game.winner
            ? 'bg-red-600 text-white'
            : finished || waiting || (state.mode === 'online' && !state.connected) || state.opponentAway
            ? 'bg-sun'
            : turnColor
      "
      role="status">
      <span class="px-4 sm:px-5 py-1 sm:py-2" :class="statusEmoji ? 'pr-3 sm:pr-4' : ''">{{ statusText }}</span>
      <!-- emoji sits on white, flush left edge, right edge follows the banner's curve (clipped by overflow-hidden) -->
      <span v-if="statusEmoji" class="flex items-center bg-white pl-3 pr-4 sm:pr-5 py-1 sm:py-2" aria-hidden="true">{{ statusEmoji }}</span>
    </div>

    <Board />
    <Scoreboard />

    <Reactions v-if="state.mode === 'online' && state.opponentPresent" />

    <div v-if="waiting && state.hadOpponent" class="card !p-3 text-center max-w-xs">
      <p class="font-semibold">
        Your opponent left before the game started. Share the code
        <b class="tracking-widest">{{ state.code }}</b> with someone else, or find a new opponent.
      </p>
      <button class="btn btn-grape mt-3" @click="actions.findNewOpponent">Find a new opponent</button>
    </div>

    <div class="flex flex-wrap justify-center gap-3 items-center sm:min-h-[4.5rem]">
      <button v-if="finished" class="btn" :disabled="iAskedRematch" @click="actions.rematch">
        {{ iAskedRematch ? "Waiting for opponent…" : opponentAskedRematch ? "Accept rematch" : "Play again" }}
      </button>
    </div>

    <div
      v-if="opponentAskedRematch && !rematchDismissed"
      class="fixed inset-0 z-20 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rematch request">
      <div class="card !p-5 text-center max-w-xs">
        <p class="text-xl font-bold">Rematch? 🔁</p>
        <p class="font-semibold text-ink/70 mt-1">Your opponent wants to play again.</p>
        <div class="flex justify-center gap-3 mt-4">
          <button class="btn btn-ghost !py-2 !px-4 !text-base" @click="rematchDismissed = true">Not now</button>
          <button class="btn !py-2 !px-4 !text-base" @click="actions.rematch">Accept</button>
        </div>
      </div>
    </div>

    <Confetti v-if="iWon" :key="state.scores.X + '-' + state.scores.O" />
  </div>
</template>
