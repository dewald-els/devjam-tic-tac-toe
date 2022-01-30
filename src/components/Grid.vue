<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '../store';
import socket from '../utils/socket';
import GameOutcome from './GameOutcome.vue';

const store = useStore()

const player = computed(() => store.state.currentPlayer)
const onlinePlayer = computed(() => store.state.onlinePlayer)
const movesPlayed = computed(() => store.state.movesPlayed)
const winner = computed(() => store.state.winner)
const isDraw = computed(() => store.state.isDraw)
const grid = computed(() => store.state.grid)
const isLocal = computed(() => store.state.isLocalGame)

const updateGrid = (currentPlayer: string, x: number, y: number): void => {
  console.log("On updated");

  if (winner.value !== null) {
    return
  }

  store.commit("setGridCell", { x, y, player: currentPlayer })
  store.commit("incrementMovesPlayed")
  store.commit("changePlayer")
  store.commit("setWinner")
  store.commit("setIsDraw")
}

socket.on("updatePlayed", (data: any) => {
  console.log("updatePlayed", data);

  updateGrid(data.playedBy, data.playedAt.x, data.playedAt.y)
})

const onCellClick = (x: number, y: number) => {
  const currentPlayer = player.value

  if (isLocal.value === false && onlinePlayer.value !== currentPlayer) {
    alert("Not your turn.")
    return
  }

  updateGrid(currentPlayer, x, y)

  if (isLocal.value) {
    return
  }

  socket.emit("played", {
    grid: [...grid.value],
    playedAt: {
      x, y
    },
    playedBy: currentPlayer
  })
}
const onPlayAgainClick = () => {
  store.commit("resetGame")
}
</script>

<template>
  <section class="gameInProgress">
    <div class="grid">
      <template v-for="(row, rowIdx) in grid">
        <span
          class="cell"
          :class="{ winner: (winner === grid[rowIdx][cellIdx]) }"
          v-for="(_, cellIdx) in row"
          @click="onCellClick(rowIdx, cellIdx)"
        >{{ grid[rowIdx][cellIdx] }}</span>
      </template>
    </div>

    <p>Player turn: {{ player }}</p>
  </section>

  <GameOutcome />
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
  border: 1px solid #474747;
  display: flex;
  justify-content: center;
  align-items: center;
}
.cell.winner {
  background-color: lavender;
}
</style>