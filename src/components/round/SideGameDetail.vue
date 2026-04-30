<script setup lang="ts">
import { computed } from 'vue'
import type {
  CompetitionSideGame,
  LeaderboardEntry,
  NassauSegmentResult,
  NassauSummary,
  SkinsSummary,
} from '@/lib/golf'

const props = defineProps<{
  game: CompetitionSideGame
  skinsSummary: SkinsSummary | null
  nassauSummary: NassauSummary | null
  leaderboard: LeaderboardEntry[]
  currentHole?: number
  embedded?: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const skinsTotals = computed(() => {
  const summary = props.skinsSummary
  if (!summary) return [] as { id: string; label: string; count: number }[]
  return Object.entries(summary.totalSkins)
    .map(([id, count]) => ({
      id,
      label: props.leaderboard.find((entry) => entry.id === id)?.label ?? '—',
      count,
    }))
    .sort((left, right) => right.count - left.count)
})

const nassauSegments = computed<NassauSegmentResult[]>(() => props.nassauSummary?.segments ?? [])

function segmentTitle(segment: NassauSegmentResult['segment']) {
  if (segment === 'front') return 'Front 9'
  if (segment === 'back') return 'Back 9'
  return 'Totalt'
}

function nassauHoleTone(holeIndex: number) {
  const summary = props.nassauSummary
  if (!summary) return 'bg-[color:var(--color-surface)] text-[color:var(--color-ink-dim)]'
  const hole = summary.holes[holeIndex]
  if (!hole || hole.pending) return 'bg-[color:var(--color-surface)] text-[color:var(--color-ink-dim)]'
  if (hole.winnerId === summary.participants[0].id) return 'bg-[color:var(--color-emerald)]/20 text-[color:var(--color-emerald)]'
  if (hole.winnerId === summary.participants[1].id) return 'bg-[color:var(--color-clay)]/15 text-[color:var(--color-clay)]'
  return 'bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink-soft)]'
}

function nassauHoleLabel(holeIndex: number) {
  const summary = props.nassauSummary
  if (!summary) return '–'
  const hole = summary.holes[holeIndex]
  if (!hole || hole.pending) return '–'
  if (hole.winnerId === summary.participants[0].id) return summary.participants[0].label.split(' ')[0].slice(0, 1)
  if (hole.winnerId === summary.participants[1].id) return summary.participants[1].label.split(' ')[0].slice(0, 1)
  return 'H'
}

function close() {
  emit('close')
}
</script>

<template>
  <component
    :is="embedded ? 'div' : 'div'"
    v-bind="embedded
      ? { class: 'rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4' }
      : { class: 'fixed inset-0 z-40 flex flex-col justify-end bg-black/30', onClick: close }"
  >
    <div
      :class="embedded
        ? ''
        : 'rounded-t-3xl bg-[color:var(--color-bg)] px-4 pt-3 pb-[calc(1.75rem+var(--safe-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.25)]'"
      @click.stop
    >
      <div v-if="!embedded" class="mx-auto mb-3 h-1 w-9 rounded-sm bg-[color:var(--color-ink-dim)]" />

      <div class="mb-3 flex items-start justify-between">
        <div>
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
            <template v-if="game.type === 'skins'">Skins · {{ game.mode === 'gross' ? 'gross' : 'netto' }}</template>
            <template v-else-if="game.type === 'nassau'">Nassau · {{ game.mode === 'gross' ? 'gross' : 'netto' }}</template>
          </p>
          <p data-num class="mt-0.5 text-[22px] font-medium tracking-[-0.02em]">
            <template v-if="game.type === 'skins'">Per hull</template>
            <template v-else-if="game.type === 'nassau'">Stilling</template>
          </p>
        </div>
        <button
          v-if="!embedded"
          aria-label="Lukk"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)]"
          @click="close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" class="text-[color:var(--color-ink-soft)]">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <template v-if="game.type === 'skins' && skinsSummary">
        <div class="mb-4 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Totalt</p>
          <ul class="mt-2 grid grid-cols-2 gap-1.5 text-[12px]">
            <li
              v-for="entry in skinsTotals"
              :key="entry.id"
              class="flex items-center justify-between rounded-lg bg-[color:var(--color-surface-alt)] px-2.5 py-1.5"
            >
              <span class="truncate">{{ entry.label }}</span>
              <span data-num class="font-semibold">{{ entry.count }}</span>
            </li>
          </ul>
        </div>

        <p data-mono class="mb-1.5 text-[10px] text-[color:var(--color-ink-muted)]">Per hull</p>
        <ul class="grid max-h-[40vh] grid-cols-3 gap-1.5 overflow-y-auto pb-1 text-[11px] sm:grid-cols-6">
          <li
            v-for="hole in skinsSummary.holes"
            :key="hole.hole"
            class="flex items-center justify-between rounded-md border border-[color:var(--color-line-soft)] px-2 py-1.5"
            :class="hole.winnerId
              ? 'bg-[color:var(--color-emerald)]/10'
              : hole.carryValue > 1
                ? 'bg-[color:var(--color-clay)]/5'
                : 'bg-[color:var(--color-surface-alt)]'"
          >
            <span data-mono class="text-[color:var(--color-ink-muted)]">H{{ hole.hole }}</span>
            <span class="ml-1 truncate font-medium text-[color:var(--color-ink)]">
              {{ hole.winnerLabel ?? (hole.carryValue > 1 ? `+${hole.carryValue}` : '–') }}
            </span>
          </li>
        </ul>
      </template>

      <template v-else-if="game.type === 'nassau' && nassauSummary">
        <div class="mb-4 grid gap-2">
          <div
            v-for="segment in nassauSegments"
            :key="segment.segment"
            class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2.5"
          >
            <div class="flex items-center justify-between">
              <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
                {{ segmentTitle(segment.segment) }}
              </p>
              <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
                {{ segment.holesPlayed }}/{{ segment.holesInSegment }} hull
              </p>
            </div>
            <p
              class="mt-1 text-[14px] font-semibold tracking-tight"
              :class="segment.balance === 0
                ? 'text-[color:var(--color-ink)]'
                : segment.leaderId === nassauSummary.participants[0].id
                  ? 'text-[color:var(--color-emerald)]'
                  : 'text-[color:var(--color-clay)]'"
            >
              {{ segment.status }}
            </p>
          </div>
        </div>

        <p data-mono class="mb-1.5 text-[10px] text-[color:var(--color-ink-muted)]">
          Per hull · <span class="text-[color:var(--color-emerald)]">{{ nassauSummary.participants[0].label }}</span>
          /
          <span class="text-[color:var(--color-clay)]">{{ nassauSummary.participants[1].label }}</span>
        </p>
        <ul class="grid grid-cols-9 gap-1 text-[10px]">
          <li
            v-for="(_, holeIndex) in nassauSummary.holes"
            :key="holeIndex"
            class="flex h-7 flex-col items-center justify-center rounded-md"
            :class="nassauHoleTone(holeIndex)"
          >
            <span data-mono class="text-[8px] opacity-70">{{ holeIndex + 1 }}</span>
            <span data-num class="text-[10px] font-semibold leading-none">{{ nassauHoleLabel(holeIndex) }}</span>
          </li>
        </ul>
      </template>
    </div>
  </component>
</template>
