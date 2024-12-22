<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "../store";
import socket from "../utils/socket";

const store = useStore();
const router = useRouter();

const roomId = ref("");

socket.on("createRoomSuccess", (room) => {
  store.commit("setRoomId", room.id);
  router.push("/play");
});

socket.on("joinRoomSuccess", (room) => {
  console.log("Joined");
  store.commit("setRoomId", room.id);
  store.commit("setGameStarted", true);
  router.push("/play");
});

const onLocalClick = () => {
  store.commit("setIsLocalGame", true);
  router.push("/play");
};

const onJoinClick = () => {
  if (!roomId.value) {
    alert("Enter a Room ID");
    return;
  }
  store.commit("setPlayer", "O");
  store.commit("setRoomId", roomId.value);
  store.commit("setIsLocalGame", false);
  socket.emit("joinRoom", roomId.value);
};

const onCreateClick = () => {
  store.commit("setPlayer", "X");
  store.commit("setIsLocalGame", false);
  socket.emit("createRoom");
};
</script>
<template>
  <div class="inline-flex flex-col justify-center p-8 lg:p-16">
    <header class="mb-4">
      <h1 class="text-4xl font-bold text-slate-300">X - Tic tac toe - O</h1>
      <p class="text-slate-500">Play online or locally</p>
    </header>

    <section class="border border-slate-600 p-4 rounded-md mb-4">
      <div class="mb-4">
        <span class="text-2xl text-slate-300">Play a local game</span>
        <p class="text-slate-500">
          Don't want to play online? Share a computer and play a local game.
        </p>
      </div>
      <button
        @click="onLocalClick"
        class="bg-green-500 font-bold p-2 rounded-lg border border-green-700">
        Play local
      </button>
    </section>

    <section class="border border-slate-600 p-4 rounded-md mb-4">
      <div class="mb-4">
        <span class="text-2xl text-slate-300">Join existing room</span>
        <p class="text-slate-500">Join an existing room using a Room ID</p>
      </div>
      <div>
        <input
          type="text"
          placeholder="Enter room code"
          v-model.trim="roomId"
          class="border p-2 rounded-tl-md rounded-bl-md" />
        <button
          @click="onJoinClick"
          class="bg-green-500 font-bold p-2 rounded-tr-md rounded-br-md border border-green-700">
          Join Room
        </button>
      </div>
    </section>

    <section class="border border-slate-600 p-4 rounded-md mb-4">
      <div class="mb-4">
        <span class="text-2xl text-slate-300">Create Room</span>
        <p class="text-slate-500">Create a new room and get a Room ID</p>
      </div>

      <button
        @click="onCreateClick"
        class="bg-green-500 font-bold p-2 rounded-lg border border-green-700">
        Create Room
      </button>
    </section>
  </div>
</template>
