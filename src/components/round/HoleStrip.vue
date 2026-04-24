<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentHole: number
  holeCount: number
  isComplete: (hole: number) => boolean
}>()

const emit = defineEmits<{
  (event: 'update:currentHole', hole: number): void
}>()

const visibleHoles = computed(() => {
  const total = props.holeCount
  const maxVisible = Math.min(9, total)
  const start = Math.max(1, Math.min(total - maxVisible + 1, props.currentHole - Math.floor(maxVisible / 2)))
  return Array.from({ length: maxVisible }, (_, i) => start + i).filter((n) => n <= total)
})
</script>

<template>
  <div class="flex justify-center gap-1 overflow-x-auto no-scrollbar">
    <button
      v-for="n in visibleHoles"
      :key="n"
      class="flex flex-shrink-0 items-center justify-center transition"
      :class="[
        n === currentHole
          ? 'h-11 w-11 rounded-[14px] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
          : isComplete(n)
            ? 'h-[30px] w-[30px] rounded-[10px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'
            : 'h-[30px] w-[30px] rounded-[10px] text-[color:var(--color-ink-muted)]',
      ]"
      @click="emit('update:currentHole', n)"
    >
      <span
        data-num
        :class="n === currentHole ? 'text-[17px] font-bold' : 'text-[13px] font-medium'"
      >{{ n }}</span>
    </button>
  </div>
</template>
