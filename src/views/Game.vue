<script setup lang="ts">
import { computed, ref } from "vue"
import Board from "../components/Board.vue"
import Confetti from "../components/Confetti.vue"
import Reactions from "../components/Reactions.vue"
import Scoreboard from "../components/Scoreboard.vue"
import { toast, useGame } from "../store"
import { isMuted, setMuted } from "../utils/sound"

const { state, actions } = useGame()

const muted = ref(isMuted())
const toggleMute = () => {
  muted.value = !muted.value
  setMuted(muted.value)
}

const finished = computed(() => state.game.winner !== null || state.game.draw)
const waiting = computed(() => state.mode === "online" && !state.opponentPresent)
const iAskedRematch = computed(() => !!state.you && state.rematch.includes(state.you))
const opponentAskedRematch = computed(() => state.rematch.length > 0 && !iAskedRematch.value)
const iWon = computed(() => state.game.winner !== null && (state.you === null || state.game.winner === state.you))

const status = computed(() => {
  const g = state.game
  if (state.mode === "online" && !state.connected) return "Reconnecting…"
  if (waiting.value) return "Waiting for a friend…"
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

const turnColor = computed(() => (state.game.turn === "X" ? "bg-coral text-white" : "bg-teal text-ink"))
const shareUrl = computed(() => `${location.origin}/?room=${state.code}`)

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(message)
  } catch {
    toast("Couldn't copy. Please copy it manually.", "error")
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-5">
    <div class="flex items-center gap-3">
      <h1 class="text-4xl font-bold">
        <span class="text-coral">X</span> Tic Tac Toe <span class="text-teal">O</span>
      </h1>
      <button
        class="w-11 h-11 text-xl rounded-xl border-4 border-ink bg-white shadow-pop-sm"
        :aria-label="muted ? 'Unmute sounds' : 'Mute sounds'"
        @click="toggleMute">
        {{ muted ? "🔇" : "🔊" }}
      </button>
    </div>

    <div v-if="state.mode === 'online'" class="card !p-3 flex flex-col items-center gap-2">
      <div class="leading-tight text-center">
        <div class="text-xs font-semibold text-ink/60 uppercase tracking-wide">Room code</div>
        <div class="text-2xl font-bold tracking-[0.25em]">{{ state.code }}</div>
      </div>
      <button class="btn btn-ghost !py-2 !px-3 !text-base" @click="copy(shareUrl, 'Invite link copied!')">
        Copy link
      </button>
    </div>
    <div v-else-if="state.mode === 'cpu'" class="font-semibold text-ink/70">
      You (X) vs computer · {{ state.cpuLevel === "hard" ? "unbeatable" : "easy" }}
    </div>
    <div v-else class="font-semibold text-ink/70">Playing locally on one device</div>

    <div
      class="px-5 py-2 rounded-full border-4 border-ink font-bold text-xl shadow-pop-sm"
      :class="finished || waiting || (state.mode === 'online' && !state.connected) || state.opponentAway ? 'bg-sun' : turnColor"
      role="status">
      {{ status }}
    </div>

    <Board />
    <Scoreboard />

    <Reactions v-if="state.mode === 'online' && state.opponentPresent" />

    <div class="flex flex-wrap justify-center gap-3 items-center min-h-[4.5rem]">
      <button v-if="finished" class="btn" :disabled="iAskedRematch" @click="actions.rematch">
        {{ iAskedRematch ? "Waiting for opponent…" : opponentAskedRematch ? "Accept rematch" : "Play again" }}
      </button>
      <button class="btn btn-ghost" @click="actions.leave">
        {{ state.mode === "online" ? "Leave room" : "Back to menu" }}
      </button>
    </div>
    <p v-if="opponentAskedRematch" class="font-bold text-grape -mt-3">Your opponent wants a rematch!</p>

    <Confetti v-if="iWon" :key="state.scores.X + '-' + state.scores.O" />
  </div>
</template>
