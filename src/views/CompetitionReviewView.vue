<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  getFormatLabel,
  isTeamFormat,
  type Competition,
  type LeaderboardEntry,
} from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'

const route = useRoute()
const router = useRouter()
const competitionsStore = useCompetitionsStore()

const competitionId = computed(() => String(route.params.competitionId))
const competition = computed<Competition | undefined>(() =>
  competitionsStore.findCompetition(competitionId.value),
)

const summary = computed(() => (competition.value ? buildCompetitionSummary(competition.value) : null))
const leaderboard = computed<LeaderboardEntry[]>(() => summary.value?.leaderboard ?? [])
const winner = computed(() => leaderboard.value[0] ?? null)
const isStableford = computed(() =>
  competition.value?.format === 'stableford' || competition.value?.format === 'fourball-stableford',
)
const isMatchPlay = computed(() => competition.value?.format === 'match-play')
const isTeam = computed(() => competition.value ? isTeamFormat(competition.value.format) : false)

const holeDetails = computed(() => {
  const c = competition.value
  if (!c) return []
  return buildHoleDetails(c.players[0]?.teeSnapshot ?? c.courseSnapshot.tees[0])
})

const holeCount = computed(() => competition.value?.holes ?? 18)
const frontHoles = computed(() => holeDetails.value.slice(0, Math.min(9, holeCount.value)))
const backHoles = computed(() => (holeCount.value > 9 ? holeDetails.value.slice(9, 18) : []))

const frontPar = computed(() => frontHoles.value.reduce((s, h) => s + h.par, 0))
const backPar = computed(() => backHoles.value.reduce((s, h) => s + h.par, 0))
const totalPar = computed(() => frontPar.value + backPar.value)

interface Row {
  id: string
  label: string
  strokes: (number | null)[]
  pts: number
  net: number
  tee?: string
}

const rows = computed<Row[]>(() => {
  const c = competition.value
  if (!c) return []
  return leaderboard.value.map((entry) => {
    const isSide = entry.entityType === 'side'
    const strokes = isSide
      ? c.scores.sideScores[entry.id] ?? []
      : c.scores.playerScores[entry.id] ?? []
    const player = c.players.find((p) => p.id === entry.id)
    return {
      id: entry.id,
      label: isSide
        ? c.players.filter((p) => p.sideId === entry.id).map((p) => p.displayName.split(' ')[0]).join(' / ') || entry.label
        : entry.label,
      strokes: Array.from({ length: holeCount.value }, (_, i) => strokes[i] ?? null),
      pts: entry.stablefordPoints,
      net: entry.netTotal,
      tee: player?.teeSnapshot.color,
    }
  })
})

function sumRange(row: Row, from: number, to: number) {
  let total = 0
  for (let i = from; i < to; i++) {
    const v = row.strokes[i]
    if (v != null) total += v
  }
  return total
}

function colorForStroke(stroke: number | null, par: number) {
  if (stroke == null) return 'text-[color:var(--color-ink-dim)]'
  const d = stroke - par
  if (d <= -1) return 'text-[color:var(--color-emerald)]'
  if (d >= 2) return 'text-[color:var(--color-clay)]'
  return 'text-[color:var(--color-ink)]'
}

function teeDotClass(color?: string) {
  switch (color) {
    case 'red': return 'bg-[color:var(--color-tee-red)]'
    case 'yellow': return 'bg-[color:var(--color-tee-yellow)]'
    case 'blue': return 'bg-[color:var(--color-tee-blue)]'
    case 'black': return 'bg-[color:var(--color-ink)]'
    case 'white': return 'bg-[color:var(--color-tee-white)] border border-[color:var(--color-line)]'
    default: return 'bg-[color:var(--color-tee-green)]'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function metricValue(entry: LeaderboardEntry) {
  if (isMatchPlay.value) return entry.matchStatus ?? '–'
  return isStableford.value ? entry.stablefordPoints : entry.netTotal
}

function metricLabel() {
  if (isMatchPlay.value) return ''
  return isStableford.value ? 'pts' : 'netto'
}

function exportText() {
  const c = competition.value
  if (!c) return
  const lines = [
    `${c.name}`,
    `${formatDate(c.date)} · ${c.courseSnapshot.clubName} · ${getFormatLabel(c.format)}`,
    '',
    'Resultater',
    ...leaderboard.value.map((e, i) => `${i + 1}. ${e.label} — ${metricValue(e)} ${metricLabel()}`.trim()),
  ]
  const text = lines.join('\n')
  if (navigator.share) {
    navigator.share({ title: c.name, text }).catch(() => copyText(text))
  } else {
    copyText(text)
  }
}

function copyText(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}
</script>

<template>
  <div v-if="competition" class="flex min-h-[100svh] flex-col pb-10">
    <header class="flex items-center justify-between px-5 pt-[calc(3.5rem+var(--safe-top))] pb-2.5">
      <button
        aria-label="Tilbake"
        class="flex items-center gap-1 p-1 text-[color:var(--color-ink-soft)]"
        @click="router.push('/')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button
        class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-1.5 text-[13px] font-medium text-[color:var(--color-ink)]"
        @click="exportText"
      >
        Del
      </button>
    </header>

    <div class="px-5 pt-3 pb-1.5">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
        {{ formatDate(competition.date) }} · {{ competition.courseSnapshot.clubName }} · {{ getFormatLabel(competition.format) }}
      </p>
      <h1 data-num class="mt-1.5 text-[34px] font-medium leading-[1.05] tracking-[-0.035em] text-[color:var(--color-ink)]">
        {{ competition.name }}
      </h1>
    </div>

    <div v-if="winner" class="px-5 pt-4">
      <div class="flex items-center gap-3.5 rounded-[20px] bg-[color:var(--color-accent)] px-5 py-[18px] text-[color:var(--color-bg)]">
        <div class="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/15">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M7 4h10v3a5 5 0 01-10 0V4zM17 4h3v2a3 3 0 01-3 3M7 4H4v2a3 3 0 003 3M9 15h6v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3zM8 19h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p data-mono class="text-[10px] opacity-70">Vinner</p>
          <p data-num class="mt-0.5 truncate text-[22px] font-medium tracking-[-0.02em]">
            {{ winner.label }}
          </p>
        </div>
        <div class="text-right">
          <p data-num class="text-[36px] leading-none font-semibold tracking-[-0.035em]">
            {{ metricValue(winner) }}
          </p>
          <p data-mono class="mt-[3px] text-[10px] opacity-70">{{ metricLabel() }}</p>
        </div>
      </div>
    </div>

    <section class="px-5 pt-[22px] pb-2">
      <p data-mono class="pb-2 text-[10px] text-[color:var(--color-ink-muted)]">Resultater</p>
      <div class="overflow-hidden rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div
          v-for="(entry, i) in leaderboard"
          :key="entry.id"
          class="flex items-center gap-3 px-4 py-3"
          :class="i < leaderboard.length - 1 ? 'border-b border-[color:var(--color-line-soft)]' : ''"
        >
          <span data-num class="w-5 text-[18px] font-semibold text-[color:var(--color-ink-muted)]">
            {{ i + 1 }}
          </span>
          <span
            class="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            :class="teeDotClass(rows[i]?.tee)"
          />
          <span class="flex-1 truncate text-sm font-medium text-[color:var(--color-ink)]">
            {{ entry.label }}
          </span>
          <span data-num class="text-[22px] font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
            {{ metricValue(entry) }}
            <span data-mono class="ml-0.5 text-[10px] font-normal text-[color:var(--color-ink-muted)]">
              {{ metricLabel() }}
            </span>
          </span>
        </div>
      </div>
    </section>

    <section class="px-5 pt-[22px] pb-2">
      <p data-mono class="pb-2 text-[10px] text-[color:var(--color-ink-muted)]">Scorekort</p>
      <div class="overflow-hidden rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[680px] border-collapse">
            <thead>
              <tr class="bg-[color:var(--color-surface-alt)]">
                <th class="py-2 pl-3.5 pr-1 text-left text-[12px] font-medium text-[color:var(--color-ink-soft)]" data-num>Hull</th>
                <th
                  v-for="h in frontHoles"
                  :key="h.number"
                  class="px-1 py-2 text-center text-[12px] font-medium text-[color:var(--color-ink-soft)]"
                  data-num
                >{{ h.number }}</th>
                <th class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[12px] font-medium text-[color:var(--color-ink-soft)]" data-num>Ut</th>
                <template v-if="backHoles.length">
                  <th
                    v-for="h in backHoles"
                    :key="h.number"
                    class="px-1 py-2 text-center text-[12px] font-medium text-[color:var(--color-ink-soft)]"
                    data-num
                  >{{ h.number }}</th>
                  <th class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[12px] font-medium text-[color:var(--color-ink-soft)]" data-num>Inn</th>
                </template>
                <th class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[12px] font-medium text-[color:var(--color-ink-soft)]" data-num>Tot</th>
              </tr>
              <tr>
                <td class="py-2 pl-3.5 pr-1 text-left text-[10px] text-[color:var(--color-ink-muted)]" data-mono>Par</td>
                <td
                  v-for="h in frontHoles"
                  :key="h.number"
                  class="px-1 py-2 text-center text-[11px] text-[color:var(--color-ink-muted)]"
                  data-num
                >{{ h.par }}</td>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[12px] text-[color:var(--color-ink-muted)]" data-num>{{ frontPar }}</td>
                <template v-if="backHoles.length">
                  <td
                    v-for="h in backHoles"
                    :key="h.number"
                    class="px-1 py-2 text-center text-[11px] text-[color:var(--color-ink-muted)]"
                    data-num
                  >{{ h.par }}</td>
                  <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[12px] text-[color:var(--color-ink-muted)]" data-num>{{ backPar }}</td>
                </template>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[12px] text-[color:var(--color-ink-muted)]" data-num>{{ totalPar }}</td>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.id"
                class="border-t border-[color:var(--color-line-soft)]"
              >
                <td class="whitespace-nowrap py-2 pl-3.5 pr-1 text-left text-[11px] text-[color:var(--color-ink)]">
                  {{ row.label.split(' ')[0] }}
                </td>
                <td
                  v-for="(s, i) in row.strokes.slice(0, frontHoles.length)"
                  :key="'f' + i"
                  class="px-1 py-2 text-center text-[13px]"
                  :class="colorForStroke(s, frontHoles[i].par)"
                  data-num
                >{{ s ?? '–' }}</td>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-medium text-[color:var(--color-ink)]" data-num>
                  {{ sumRange(row, 0, frontHoles.length) || '–' }}
                </td>
                <template v-if="backHoles.length">
                  <td
                    v-for="(s, i) in row.strokes.slice(9, 9 + backHoles.length)"
                    :key="'b' + i"
                    class="px-1 py-2 text-center text-[13px]"
                    :class="colorForStroke(s, backHoles[i].par)"
                    data-num
                  >{{ s ?? '–' }}</td>
                  <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-medium text-[color:var(--color-ink)]" data-num>
                    {{ sumRange(row, 9, 9 + backHoles.length) || '–' }}
                  </td>
                </template>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-semibold text-[color:var(--color-ink)]" data-num>
                  {{ sumRange(row, 0, holeCount) || '–' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <p data-mono class="mt-5 text-center text-[10px] text-[color:var(--color-ink-muted)]">
      Lagret lokalt · ingen innlogging
    </p>
  </div>
</template>
