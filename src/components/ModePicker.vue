<script setup lang="ts">
import type { Variant } from "../utils/game"

defineProps<{ modes: { id: Variant; name: string; desc: string }[]; modelValue: Variant }>()
defineEmits<{ (e: "update:modelValue", value: Variant): void }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Game mode">
    <button
      v-for="m in modes"
      :key="m.id"
      role="radio"
      :aria-checked="modelValue === m.id"
      class="rounded-2xl border-4 border-ink p-3 text-left shadow-pop-sm transition-colors"
      :class="modelValue === m.id ? 'bg-green-500 text-white' : 'bg-white'"
      @click="$emit('update:modelValue', m.id)">
      <div class="text-xl font-bold">{{ m.name }}</div>
      <div class="text-sm leading-tight" :class="modelValue === m.id ? 'text-white/90' : 'text-ink/70'">{{ m.desc }}</div>
    </button>
  </div>
</template>
