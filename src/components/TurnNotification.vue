<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '../store';

const store = useStore();
const player = computed(() => store?.state.currentPlayer);

</script>

<template>
    <div class="absolute bottom-4 w-full">
        <div class="flex justify-between px-6">
            <div>&nbsp;</div>
            <div class="bg-green-500 rounded-lg">
                <span class="font-bold p-2">It's {{ player }} turn.</span>
            </div>
            <div>
                <button>Quit</button>
            </div>
        </div>
    </div>
</template>