<script setup lang="ts">import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from '../store';
import socket from '../utils/socket';

const store = useStore()
const router = useRouter()

const winner = computed(() => store.state.winner)
const isDraw = computed(() => store.state.isDraw)
const movesPlayed = computed(() => store.state.movesPlayed)
const roomId = computed(() => store.state.roomId)
const onlinePlayer = computed(() => store.state.onlinePlayer)


const onPlayAgainClick = () => {
    store.commit("resetGame")
}

const onLeaveGameClick = () => {
    store.commit("resetGame")
    socket.emit("leaveRoom", {
        roomId: roomId.value,
        player: onlinePlayer.value
    })
    router.replace("/")
}

</script>

<template>
    <section class="gameOutcome" v-if="winner !== null || isDraw === true">
        <h1 v-show="winner !== null">The winner is {{ winner }} in {{ movesPlayed }} moves.</h1>
        <h1 v-show="isDraw">Good game! It's a Draw</h1>

        <button @click="onPlayAgainClick">Play again</button>
        <button @click="onLeaveGameClick">Leave Room</button>
    </section>
</template>