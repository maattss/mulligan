<script setup lang="ts">
import type { LeaderboardEntry } from '@/lib/golf'

defineProps<{
  entries: LeaderboardEntry[]
  currentHole: number
  isStableford: boolean
  isMatchPlay: boolean
}>()

function metricFor(entry: LeaderboardEntry, isStableford: boolean) {
  return isStableford ? entry.stablefordPoints : entry.netTotal
}
</script>

<template>
  <footer class="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
    <div class="flex items-baseline justify-between">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
        Leaderboard · etter {{ Math.max(0, currentHole - 1) }}
      </p>
    </div>
    <ul class="mt-2">
      <li
        v-for="(entry, i) in entries"
        :key="entry.id"
        class="flex items-center justify-between py-1"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          <span data-mono class="w-3.5 text-[11px] text-[color:var(--color-ink-muted)]">{{ i + 1 }}</span>
          <span class="truncate text-[13px] font-medium tracking-tight" :class="i === 0 ? 'font-semibold' : ''">
            {{ entry.label }}
          </span>
          <span v-if="i > 0 && !isMatchPlay" data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
            −{{ Math.max(0, metricFor(entries[0], isStableford) - metricFor(entry, isStableford)) }}
          </span>
        </div>
        <div data-num class="text-[18px] font-semibold tracking-[-0.02em]">
          {{ isMatchPlay ? (entry.matchStatus ?? '–') : isStableford ? entry.stablefordPoints : entry.netTotal }}
          <span data-mono class="ml-0.5 text-[10px] font-normal text-[color:var(--color-ink-muted)]">
            {{ isMatchPlay ? '' : isStableford ? 'pts' : 'netto' }}
          </span>
        </div>
      </li>
    </ul>
  </footer>
</template>
