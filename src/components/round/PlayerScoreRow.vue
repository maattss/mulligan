<script setup lang="ts">
import { computed } from 'vue'
import {
  getNetScore,
  getStablefordPoints,
  type CompetitionPlayer,
} from '@/lib/golf'

const props = defineProps<{
  player: CompetitionPlayer
  par: number
  gross: number | null
  pickedUp: boolean
  strokeAdjustment: number
  cumulativePoints: number
  cumulativeNet: number
  isStableford: boolean
}>()

defineEmits<{
  (event: 'open'): void
}>()

function scoreLabel(gross: number, par: number) {
  const d = gross - par
  if (d <= -3) return 'Albatross'
  if (d === -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d === 0) return 'Par'
  if (d === 1) return 'Bogey'
  if (d === 2) return 'Double'
  return `+${d}`
}

function teeDotClass(color: string) {
  switch (color) {
    case 'red': return 'bg-[color:var(--color-tee-red)]'
    case 'yellow': return 'bg-[color:var(--color-tee-yellow)]'
    case 'orange': return 'bg-[color:var(--color-tee-orange)]'
    case 'blue': return 'bg-[color:var(--color-tee-blue)]'
    case 'black': return 'bg-[color:var(--color-ink)]'
    case 'white': return 'bg-[color:var(--color-tee-white)] border border-[color:var(--color-line)]'
    default: return 'bg-[color:var(--color-tee-green)]'
  }
}

const grossColor = computed(() => {
  if (props.pickedUp) return 'text-[color:var(--color-clay)]'
  if (props.gross == null) return 'text-[color:var(--color-ink-dim)]'
  const d = props.gross - props.par
  if (d <= -1) return 'text-[color:var(--color-emerald)]'
  if (d >= 2) return 'text-[color:var(--color-clay)]'
  return 'text-[color:var(--color-ink)]'
})

const pointsForHole = computed(() => {
  if (props.pickedUp) return 0
  if (props.gross == null) return null
  return getStablefordPoints(props.par, getNetScore(props.gross, props.strokeAdjustment))
})

const netForHole = computed(() => {
  if (props.pickedUp) return null
  if (props.gross == null) return null
  return getNetScore(props.gross, props.strokeAdjustment)
})
</script>

<template>
  <button
    class="mb-2 flex w-full items-center gap-3.5 rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5 text-left"
    @click="$emit('open')"
  >
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span
          class="h-2 w-2 flex-shrink-0 rounded-full"
          :class="teeDotClass(player.teeSnapshot.color)"
        />
        <span class="truncate text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
          {{ player.displayName }}
        </span>
      </div>
      <div class="mt-1 flex items-center gap-2 pl-4">
        <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
          HCP {{ player.playingHandicap }}
        </span>
        <template v-if="strokeAdjustment > 0">
          <div class="flex items-center gap-0.5">
            <span
              v-for="i in strokeAdjustment"
              :key="i"
              class="h-1 w-1 rounded-full bg-[color:var(--color-accent)]"
            />
          </div>
        </template>
      </div>
    </div>

    <div
      class="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[16px]"
      :class="pickedUp
        ? 'border-[1.5px] border-[color:var(--color-clay)] bg-[color:var(--color-clay)]/5'
        : gross != null
          ? 'border-[1.5px] border-[color:var(--color-line)]'
          : 'border border-dashed border-[color:var(--color-ink-dim)] bg-[color:var(--color-bg)]'"
    >
      <template v-if="pickedUp">
        <span data-num class="text-[28px] leading-none font-semibold tracking-[-0.02em] text-[color:var(--color-clay)]">PU</span>
        <span data-mono class="mt-1 text-[9px] text-[color:var(--color-clay)]">plukket opp</span>
      </template>
      <template v-else-if="gross != null">
        <span data-num class="text-[34px] leading-none font-semibold tracking-[-0.02em]" :class="grossColor">
          {{ gross }}
        </span>
        <span data-mono class="mt-1 text-[9px] text-[color:var(--color-ink-muted)]">
          {{ scoreLabel(gross, par) }}
        </span>
      </template>
      <template v-else>
        <svg width="22" height="22" viewBox="0 0 22 22" class="text-[color:var(--color-ink-muted)]">
          <path d="M11 4v14M4 11h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </template>
    </div>

    <div class="flex w-12 flex-col items-end">
      <span
        data-num
        class="text-2xl leading-none font-medium tracking-[-0.02em]"
        :class="(pickedUp || gross != null) ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-dim)]'"
      >
        {{ isStableford
          ? (pointsForHole ?? (pickedUp ? 0 : '–'))
          : (netForHole ?? (pickedUp ? 0 : '–')) }}
      </span>
      <span data-mono class="mt-1 text-[9px] text-[color:var(--color-ink-muted)]">
        {{ isStableford ? 'pts' : 'netto' }}
      </span>
      <span data-num class="mt-1.5 text-xs text-[color:var(--color-ink-soft)]">
        <span class="font-semibold text-[color:var(--color-ink)]">
          {{ isStableford ? cumulativePoints : cumulativeNet }}
        </span>
        <span class="text-[10px] text-[color:var(--color-ink-muted)]"> totalt</span>
      </span>
    </div>
  </button>
</template>
