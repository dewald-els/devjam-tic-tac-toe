<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import Grid from "../components/Grid.vue";
import { useStore } from "../store";
import socket from "../utils/socket";
import TurnNotification from "../components/TurnNotification.vue";

const store = useStore();
const router = useRouter();

const roomId = computed(() => store.state.roomId);
const isLocal = computed(() => store.state.isLocalGame);

socket.on("opponentLeftRoom", ({ player, roomId }) => {
  console.log("socket.opponentLeftRoom", player, roomId);
  if (store.state.roomId === roomId) {
    if (player !== store.state.player) {
      alert(
        player + " has left the room. You will be taken to the start screen"
      );
    }
    store.commit("resetGame");
    store.commit("setIsLocalGame", false);
    router.replace("/");
  }
});
</script>
<template>
  <div
    class="flex flex-col justify-center items-center p-8 lg:p-16 text-center">
    <div>
      <h1 class="text-4xl text-slate-300 font-bold mb-6">Tic Tac Toe</h1>
      <div class="bg-slate-700 rounded-md mb-6">
        <p v-if="isLocal">Playing locally</p>
        <p v-if="isLocal === false">Room ID: {{ roomId }}</p>
      </div>
      <Grid />
    </div>
    <TurnNotification />
  </div>
</template>
