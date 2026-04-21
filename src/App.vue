<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()

const ready = computed(() => playersStore.hydrated && competitionsStore.hydrated)

onMounted(async () => {
  await Promise.all([
    playersStore.hydrate(),
    competitionsStore.hydrate(),
  ])
})
</script>

<template>
  <div class="mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col bg-[color:var(--color-bg)] shadow-[0_0_0_1px_rgba(23,51,42,0.06)]">
    <RouterView v-if="ready" />

    <div v-else class="flex flex-1 items-center justify-center px-6">
      <div class="text-center">
        <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Mulligan</p>
        <p data-num class="mt-2 text-3xl font-medium tracking-tight">Laster…</p>
      </div>
    </div>

    <Toaster position="top-center" />
  </div>
</template>
