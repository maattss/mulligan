<script setup lang="ts">
import { getFormatLabel, type CompetitionFormat, type CourseDetail, type PlayerProfile, type SkinsMode } from '@/lib/golf'
import { teeDotClass, type PlayerSelection } from './shared'

defineProps<{
  name: string
  format: CompetitionFormat
  holes: 9 | 18
  selectedCourse?: CourseDetail
  selectedPlayers: PlayerProfile[]
  selections: Record<string, PlayerSelection>
  allowanceLabel: string
  skinsEnabled: boolean
  skinsMode: SkinsMode
  issue: string
}>()
</script>

<template>
  <div class="mt-6 space-y-3">
    <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Runde</p>
      <p data-num class="mt-1 text-2xl font-medium tracking-tight">{{ name }}</p>
      <p class="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        {{ selectedCourse?.clubName }} · {{ getFormatLabel(format) }} · {{ holes }} hull
      </p>
      <p data-mono class="mt-2 text-[10px] text-[color:var(--color-ink-muted)]">
        Allowance · {{ allowanceLabel }}
      </p>
    </div>

    <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Spillere</p>
      <ul class="mt-2 space-y-2">
        <li
          v-for="p in selectedPlayers"
          :key="p.id"
          class="flex items-center gap-2 text-[13px]"
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="teeDotClass(selectedCourse?.tees.find((t) => t.id === selections[p.id]?.teeId)?.color ?? 'green')"
          />
          <span class="flex-1">{{ p.name }}</span>
          <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
            HCP {{ p.handicapIndex.toFixed(1) }}
          </span>
        </li>
      </ul>
    </div>

    <div v-if="skinsEnabled" class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Sidegame</p>
      <p class="mt-1 text-sm">Skins · {{ skinsMode }}</p>
    </div>

    <p v-if="issue" class="text-sm text-[color:var(--color-clay)]">{{ issue }}</p>
  </div>
</template>
