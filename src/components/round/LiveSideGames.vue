<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  CompetitionSideGame,
  LeaderboardEntry,
  NassauSummary,
  SkinsSummary,
} from '@/lib/golf'
import SideGameDetail from './SideGameDetail.vue'

const props = defineProps<{
  sideGames: CompetitionSideGame[]
  skinsSummary: SkinsSummary | null
  nassauSummary: NassauSummary | null
  leaderboard: LeaderboardEntry[]
  currentHole: number
}>()

const openGameId = ref<string | null>(null)

interface SkinsLeaderInfo {
  label: string
  count: number
}

const enabledGames = computed(() => props.sideGames.filter((game) => game.enabled))

const skinsLeader = computed<SkinsLeaderInfo | null>(() => {
  const summary = props.skinsSummary
  if (!summary) return null
  const totals = Object.entries(summary.totalSkins) as [string, number][]
  if (totals.length === 0) return null
  const max = Math.max(...totals.map(([, value]) => value))
  if (max === 0) return null
  const winners = totals.filter(([, value]) => value === max)
  if (winners.length !== 1) return { label: 'Delt ledelse', count: max }
  const id = winners[0][0]
  const entry = props.leaderboard.find((leaderboardEntry) => leaderboardEntry.id === id)
  return { label: entry?.label ?? '—', count: max }
})

const skinsCarryValue = computed(() => {
  const summary = props.skinsSummary
  if (!summary) return 1
  return summary.holes[props.currentHole - 1]?.carryValue ?? 1
})

const skinsHasResolvedHole = computed(() => {
  const summary = props.skinsSummary
  if (!summary) return false
  return summary.holes.some((hole) => hole.winnerId !== null || hole.winningScore !== null)
})

const nassauTotalSegment = computed(() =>
  props.nassauSummary?.segments.find((segment) => segment.segment === 'total') ?? null,
)

function statusForSegmentLabel(label: 'F' | 'B' | 'T') {
  if (!props.nassauSummary) return null
  const key = label === 'F' ? 'front' : label === 'B' ? 'back' : 'total'
  return props.nassauSummary.segments.find((segment) => segment.segment === key) ?? null
}

function nassauPillTone(balance: number, holesPlayed: number) {
  if (holesPlayed === 0) return 'bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]'
  if (balance === 0) return 'bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'
  if (balance > 0) return 'bg-[color:var(--color-emerald)]/10 text-[color:var(--color-emerald)]'
  return 'bg-[color:var(--color-clay)]/10 text-[color:var(--color-clay)]'
}

function nassauPillText(balance: number, holesPlayed: number) {
  if (holesPlayed === 0) return '–'
  if (balance === 0) return 'AS'
  const margin = Math.abs(balance)
  return `${margin}${balance > 0 ? '↑' : '↓'}`
}

function openGame(id: string) {
  openGameId.value = id
}

function closeGame() {
  openGameId.value = null
}

const openGame_ = computed(() => {
  if (!openGameId.value) return null
  return enabledGames.value.find((game) => game.id === openGameId.value) ?? null
})
</script>

<template>
  <div v-if="enabledGames.length" class="mx-4 mb-1 space-y-2">
    <button
      v-for="game in enabledGames"
      :key="game.id"
      class="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-2.5 text-left transition active:bg-[color:var(--color-surface-alt)]"
      @click="openGame(game.id)"
    >
      <template v-if="game.type === 'skins'">
        <span
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-gold)]/90 text-[11px] font-bold text-[color:var(--color-surface)]"
          data-num
        >S</span>
        <div class="min-w-0 flex-1">
          <p class="text-[12px] font-semibold text-[color:var(--color-ink)]">
            Skins <span data-mono class="text-[10px] font-normal text-[color:var(--color-ink-muted)]">· {{ game.mode === 'gross' ? 'gross' : 'netto' }}</span>
          </p>
          <p data-mono class="mt-0.5 truncate text-[10px] text-[color:var(--color-ink-muted)]">
            <template v-if="skinsLeader">
              {{ skinsLeader.label }} · {{ skinsLeader.count }} skins
            </template>
            <template v-else-if="skinsHasResolvedHole">
              Ingen vinner ennå
            </template>
            <template v-else>
              Venter på første hull
            </template>
          </p>
        </div>
        <div class="flex flex-col items-end">
          <span data-num class="text-[16px] font-semibold leading-none text-[color:var(--color-ink)]">
            {{ skinsLeader?.count ?? 0 }}
          </span>
          <span data-mono class="mt-0.5 text-[9px] text-[color:var(--color-clay)]">
            Carry +{{ skinsCarryValue }}
          </span>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" class="text-[color:var(--color-ink-muted)]">
          <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </template>

      <template v-else-if="game.type === 'nassau'">
        <span
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent)]/15 text-[11px] font-bold text-[color:var(--color-accent)]"
          data-num
        >N</span>
        <div class="min-w-0 flex-1">
          <p class="text-[12px] font-semibold text-[color:var(--color-ink)]">
            Nassau <span data-mono class="text-[10px] font-normal text-[color:var(--color-ink-muted)]">· {{ game.mode === 'gross' ? 'gross' : 'netto' }}</span>
          </p>
          <p data-mono class="mt-0.5 truncate text-[10px] text-[color:var(--color-ink-muted)]">
            <template v-if="!nassauSummary">
              Ikke tilgjengelig
            </template>
            <template v-else-if="nassauTotalSegment">
              {{ nassauTotalSegment.status }}
            </template>
          </p>
        </div>
        <div v-if="nassauSummary" class="flex flex-shrink-0 gap-1">
          <template v-for="label in ['F', 'B', 'T'] as const" :key="label">
            <span
              v-if="statusForSegmentLabel(label)"
              :class="[
                'flex h-6 min-w-[28px] items-center justify-center rounded-md px-1 text-[10px] font-semibold tracking-tight',
                nassauPillTone(statusForSegmentLabel(label)!.balance, statusForSegmentLabel(label)!.holesPlayed),
              ]"
              data-num
            >
              <span data-mono class="opacity-60 mr-0.5 text-[8px]">{{ label }}</span>
              {{ nassauPillText(statusForSegmentLabel(label)!.balance, statusForSegmentLabel(label)!.holesPlayed) }}
            </span>
          </template>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" class="text-[color:var(--color-ink-muted)]">
          <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </template>
    </button>

    <SideGameDetail
      v-if="openGame_"
      :game="openGame_"
      :skins-summary="skinsSummary"
      :nassau-summary="nassauSummary"
      :leaderboard="leaderboard"
      :current-hole="currentHole"
      @close="closeGame"
    />
  </div>
</template>
