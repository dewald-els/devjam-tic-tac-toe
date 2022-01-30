<script setup lang="ts">
import { computed } from "vue";
import Grid from "../components/Grid.vue"
import { useStore } from "../store";

const store = useStore()

const roomId = computed(() => store.state.roomId)
const isLocal = computed(() => store.state.isLocalGame)


</script>
<template>
    <main>
        <h1>Tic Tac Toe</h1>
        <p v-if="isLocal === false">Room ID: {{ roomId }}</p>
        <Grid />
    </main>
</template>

<style>
main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 960px;
    margin: 0 auto;
    padding-left: 1rem;
    padding-right: 1rem;
    text-align: center;
}
</style>