<script setup lang="ts">
import { computed, effect, ref } from "vue";
import { useStore } from "../store";
import socket from "../utils/socket";
import GameOutcome from "./GameOutcome.vue";

const store = useStore();

const player = computed(() => store.state.player);
const currentPlayer = computed(() => store.state.currentPlayer);
const roomId = computed(() => store.state.roomId);
const winner = computed(() => store.state.winner);
const grid = computed(() => store.state.grid);
const isLocal = computed(() => store.state.isLocalGame);
const gameStarted = computed(() => store.state.gameStarted);

socket.on("playerTwoJoined", (room) => {
  console.log("playerTwoJoined in room: " + room.id);
  if (room.id === roomId.value) {
    store.commit("setGameStarted", true);
  }
});

const updateGrid = (currentPlayer: string, x: number, y: number): void => {
  console.log("updateGrid: ", { currentPlayer, x, y });

  if (!isLocal && !gameStarted.value) {
    return;
  }

  if (winner.value !== null) {
    return;
  }

  store.commit("setGridCell", { x, y, player: currentPlayer });
  store.commit("incrementMovesPlayed");
  store.commit("changePlayer");
  store.commit("setWinner");
  store.commit("setIsDraw");
};

const onCellClick = (x: number, y: number) => {
  console.log("Clicked Cell: ", x, y);

  if (!isLocal && !gameStarted.value) {
    return;
  }

  if (grid.value[x][y] !== "") {
    alert(
      "Nice try! But there's already a " + grid.value[x][y] + " in that spot."
    );
    return;
  }

  if (isLocal.value === false && player.value !== currentPlayer.value) {
    alert("Not your turn.");
    return;
  }

  if (isLocal.value) {
    console.log("Update local grid");
    updateGrid(currentPlayer.value, x, y);
  } else {
    const playedBy = currentPlayer.value;
    updateGrid(playedBy, x, y);
    const playedData = {
      grid: [...grid.value],
      playedAt: { x, y },
      playedBy,
    };
    console.log("Emit 'played' to socket server with: ", playedData);
    socket.emit("played", playedData);
  }
};

socket.on("updatePlayed", (data: any) => {
  console.log("Received 'updatePlayed' with: ", data);

  updateGrid(data.playedBy, data.playedAt.x, data.playedAt.y);
});
</script>

<template>
  <div class="flex justify-center flex-col items-center">
    <div class="mb-4">
      <div>
        <span class="text-slate-400 font-bold">You are {{ player }}</span>
      </div>
    </div>

    <section class="gameInProgress mb-6">
      <div class="grid border-slate-500 rounded-md border-2 overflow-hidden">
        <template v-for="(row, rowIdx) in grid">
          <span
            class="cell flex justify-center items-center text-3xl font-bold text-slate-300 border-slate-500 border"
            :class="{ winner: winner === grid[rowIdx][cellIdx] }"
            v-for="(_, cellIdx) in row"
            @click="onCellClick(rowIdx, cellIdx)"
            >{{ grid[rowIdx][cellIdx] }}</span
          >
        </template>
      </div>
    </section>

    <div v-if="!isLocal && !gameStarted">
      <div class="mb-4 bg-red-500 rounded-md text-white p-2">
        <span class="block">Waiting for other player to join.</span>
        <span>Share the room ID with your friend.</span>
      </div>
    </div>

    <GameOutcome />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: calc(var(--cell-size) * 3);
  height: calc(var(--cell-size) * 3);
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
}

.cell.winner {
  background-color: lavender;
}
</style>
