<script setup lang="ts">
defineProps<{
  label: string
  playingHandicap: number
  gross: number | null
  pickedUp: boolean
}>()

const emit = defineEmits<{
  (event: 'open'): void
}>()
</script>

<template>
  <button
    class="mb-2 flex w-full items-center gap-3.5 rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5 text-left"
    @click="emit('open')"
  >
    <div class="min-w-0 flex-1">
      <p class="truncate text-[15px] font-semibold tracking-tight">{{ label }}</p>
      <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">HCP {{ playingHandicap }}</p>
    </div>
    <div
      class="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[16px]"
      :class="pickedUp
        ? 'border-[1.5px] border-[color:var(--color-clay)] bg-[color:var(--color-clay)]/10'
        : gross != null
          ? 'border-[1.5px] border-[color:var(--color-line)]'
          : 'border border-dashed border-[color:var(--color-ink-dim)] bg-[color:var(--color-bg)]'"
    >
      <template v-if="pickedUp">
        <span data-num class="text-[28px] leading-none font-semibold text-[color:var(--color-clay)]">PU</span>
      </template>
      <template v-else-if="gross != null">
        <span data-num class="text-[34px] leading-none font-semibold">{{ gross }}</span>
      </template>
      <template v-else>
        <svg width="22" height="22" viewBox="0 0 22 22" class="text-[color:var(--color-ink-muted)]">
          <path d="M11 4v14M4 11h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </template>
    </div>
  </button>
</template>
