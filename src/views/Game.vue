<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import Grid from "../components/Grid.vue"
import { useStore } from "../store";
import socket from "../utils/socket";

const store = useStore()
const router = useRouter()

const roomId = computed(() => store.state.roomId)
const isLocal = computed(() => store.state.isLocalGame)

socket.on("opponentLeftRoom", player => {
    alert(player + " has left the room. You will be taken to the start screen")
    store.commit("resetGame")
    store.commit("setIsLocalGame", false)
    router.replace("/")
})

</script>
<template>
    <div class="flex flex-col justify-center items-center p-8 lg:p-16 text-center">
        <div>
            <h1>Tic Tac Toe</h1>
            <p v-if="isLocal === false">Room ID: {{ roomId }}</p>
            <Grid />
        </div>
    </div>
</template>