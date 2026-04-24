<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  getCompetitionPlayerAdjustments,
  getFormatLabel,
  getNetScore,
  getStablefordPoints,
  isPickedUp,
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
const isScramble = computed(() => competition.value?.format === 'scramble-2')

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

interface Cell {
  gross: number | null
  pickedUp: boolean
  net: number | null
  points: number | null
}

interface Row {
  id: string
  label: string
  cells: Cell[]
  total: number
  netTotal: number
  points: number
  tee?: string
}

const rows = computed<Row[]>(() => {
  const c = competition.value
  if (!c) return []

  return leaderboard.value.map((entry) => {
    const isSide = entry.entityType === 'side'
    const sidePlayers = isSide
      ? c.players.filter((player) => player.sideId === entry.id)
      : []
    const grossArray = isSide
      ? c.scores.sideScores[entry.id] ?? []
      : c.scores.playerScores[entry.id] ?? []
    const pickupArray = isSide
      ? c.scores.sidePickups?.[entry.id]
      : c.scores.playerPickups?.[entry.id]

    let adjustments: number[] = []
    let pars: number[] = holeDetails.value.map((h) => h.par)
    let tee: string | undefined

    if (isSide) {
      const referencePlayer = sidePlayers[0]
      tee = referencePlayer?.teeSnapshot.color
      if (isScramble.value) {
        const side = c.sides.find((s) => s.id === entry.id)
        const strokeIndexes = referencePlayer?.teeSnapshot.strokeIndexes ?? []
        adjustments = buildAdjustmentArray(side?.playingHandicap ?? 0, strokeIndexes)
        pars = referencePlayer?.teeSnapshot.holePars ?? pars
      }
    } else {
      const player = c.players.find((p) => p.id === entry.id)
      if (player) {
        adjustments = getCompetitionPlayerAdjustments(c, player)
        pars = player.teeSnapshot.holePars
        tee = player.teeSnapshot.color
      }
    }

    const cells: Cell[] = []
    for (let i = 0; i < holeCount.value; i += 1) {
      if (isSide && !isScramble.value) {
        const allPickedUp = sidePlayers.length > 0 && sidePlayers.every((player) => isPickedUp(c.scores.playerPickups?.[player.id], i))
        const playerHoleSummaries = sidePlayers
          .map((player) => {
            if (isPickedUp(c.scores.playerPickups?.[player.id], i)) {
              return null
            }

            const gross = c.scores.playerScores[player.id]?.[i] ?? null
            if (gross == null) {
              return null
            }

            const adjustment = getCompetitionPlayerAdjustments(c, player)[i] ?? 0
            const net = getNetScore(gross, adjustment)

            return {
              gross,
              net,
              points: getStablefordPoints(player.teeSnapshot.holePars[i], net),
            }
          })
          .filter((summary): summary is { gross: number; net: number | null; points: number } => summary !== null)

        if (playerHoleSummaries.length === 0) {
          cells.push({
            gross: null,
            pickedUp: allPickedUp,
            net: null,
            points: allPickedUp ? 0 : null,
          })
          continue
        }

        cells.push({
          gross: Math.min(...playerHoleSummaries.map((summary) => summary.gross)),
          pickedUp: false,
          net: Math.min(...playerHoleSummaries.map((summary) => summary.net ?? Number.POSITIVE_INFINITY)),
          points: Math.max(...playerHoleSummaries.map((summary) => summary.points)),
        })
        continue
      }

      const gross = grossArray[i] ?? null
      const pickedUp = isPickedUp(pickupArray, i)
      const par = pars[i] ?? 4
      const adj = adjustments[i] ?? 0
      const net = pickedUp ? null : getNetScore(gross, adj)
      const points = pickedUp ? 0 : gross == null ? null : getStablefordPoints(par, net)
      cells.push({ gross, pickedUp, net, points })
    }

    return {
      id: entry.id,
      label: isSide
        ? sidePlayers.map((player) => player.displayName.split(' ')[0]).join(' / ') || entry.label
        : entry.label,
      cells,
      total: entry.grossTotal,
      netTotal: entry.netTotal,
      points: entry.stablefordPoints,
      tee,
    }
  })
})

function buildAdjustmentArray(playingHandicap: number, strokeIndexes: number[]) {
  if (strokeIndexes.length === 0) return []
  const adjustments = Array.from({ length: strokeIndexes.length }, () => 0)
  if (playingHandicap === 0) return adjustments
  const isPlus = playingHandicap < 0
  const absolute = Math.abs(playingHandicap)
  const fullRounds = Math.floor(absolute / strokeIndexes.length)
  const remainder = absolute % strokeIndexes.length
  for (let i = 0; i < adjustments.length; i += 1) {
    adjustments[i] = isPlus ? -fullRounds : fullRounds
  }
  if (remainder === 0) return adjustments
  for (let i = 0; i < strokeIndexes.length; i += 1) {
    const si = strokeIndexes[i]
    const extra = isPlus ? si > strokeIndexes.length - remainder : si <= remainder
    if (extra) adjustments[i] += isPlus ? -1 : 1
  }
  return adjustments
}

function sumGrossRange(row: Row, from: number, to: number) {
  let total = 0
  let hasRecordedHole = false
  for (let i = from; i < to; i += 1) {
    const cell = row.cells[i]
    if (!cell) continue
    if (cell.gross != null) {
      total += cell.gross
      hasRecordedHole = true
      continue
    }
    if (cell.pickedUp) {
      hasRecordedHole = true
    }
  }
  return hasRecordedHole ? total : null
}

function sumPointsRange(row: Row, from: number, to: number) {
  let total = 0
  let hasRecordedHole = false
  for (let i = from; i < to; i += 1) {
    const cell = row.cells[i]
    if (!cell) continue
    if (cell.points != null) {
      total += cell.points
      hasRecordedHole = true
      continue
    }
    if (cell.pickedUp) {
      hasRecordedHole = true
    }
  }
  return hasRecordedHole ? total : null
}

function sumNetRange(row: Row, from: number, to: number) {
  let total = 0
  let hasRecordedHole = false
  for (let i = from; i < to; i += 1) {
    const cell = row.cells[i]
    if (!cell) continue
    if (cell.net != null) {
      total += cell.net
      hasRecordedHole = true
      continue
    }
    if (cell.pickedUp) {
      hasRecordedHole = true
    }
  }
  return hasRecordedHole ? total : null
}

function colorForStroke(cell: Cell | undefined, par: number) {
  if (!cell) return 'text-[color:var(--color-ink-dim)]'
  if (cell.pickedUp) return 'text-[color:var(--color-clay)]'
  if (cell.gross == null) return 'text-[color:var(--color-ink-dim)]'
  const d = cell.gross - par
  if (d <= -1) return 'text-[color:var(--color-emerald)]'
  if (d >= 2) return 'text-[color:var(--color-clay)]'
  return 'text-[color:var(--color-ink)]'
}

function teeDotClass(color?: string) {
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

type ViewMode = 'gross' | 'net' | 'points'
const viewMode = ref<ViewMode>(isStableford.value ? 'points' : 'gross')

function viewCellDisplay(cell: Cell | undefined) {
  if (!cell) return '–'
  if (cell.pickedUp) return 'PU'
  if (viewMode.value === 'points') return cell.points ?? '–'
  if (viewMode.value === 'net') return cell.net ?? '–'
  return cell.gross ?? '–'
}

function viewSumRange(row: Row, from: number, to: number) {
  if (viewMode.value === 'points') return sumPointsRange(row, from, to) ?? '–'
  if (viewMode.value === 'net') return sumNetRange(row, from, to) ?? '–'
  return sumGrossRange(row, from, to) ?? '–'
}

function viewCellColor(cell: Cell | undefined, par: number) {
  if (!cell || cell.pickedUp) return colorForStroke(cell, par)
  if (viewMode.value === 'points') {
    if (cell.points == null) return 'text-[color:var(--color-ink-dim)]'
    if (cell.points >= 3) return 'text-[color:var(--color-emerald)]'
    if (cell.points === 0) return 'text-[color:var(--color-clay)]'
    return 'text-[color:var(--color-ink)]'
  }
  if (viewMode.value === 'net') {
    if (cell.net == null) return 'text-[color:var(--color-ink-dim)]'
    const d = cell.net - par
    if (d <= -1) return 'text-[color:var(--color-emerald)]'
    if (d >= 2) return 'text-[color:var(--color-clay)]'
    return 'text-[color:var(--color-ink)]'
  }
  return colorForStroke(cell, par)
}

const skinsHoles = computed(() => summary.value?.skins?.holes ?? [])
const skinsMode = computed(() => summary.value?.skins?.mode)
const skinsTotals = computed(() => summary.value?.skins?.totalSkins ?? {})
const skinsParticipants = computed(() => {
  const c = competition.value
  if (!c || !summary.value?.skins) return [] as { id: string, label: string }[]
  if (c.format === 'scramble-2' || c.format === 'fourball-stroke' || c.format === 'fourball-stableford') {
    return c.sides.map((s) => ({
      id: s.id,
      label: c.players.filter((p) => p.sideId === s.id).map((p) => p.displayName.split(' ')[0]).join(' / ') || s.name,
    }))
  }
  return c.players.map((p) => ({ id: p.id, label: p.displayName }))
})
</script>

<template>
  <div v-if="competition" class="flex min-h-[100svh] flex-col pb-10">
    <header class="flex items-center justify-between px-5 pt-[calc(0.75rem+var(--safe-top))] pb-2.5">
      <button
        aria-label="Tilbake"
        class="flex items-center gap-1 p-1 text-[color:var(--color-ink-soft)]"
        @click="router.push('/')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
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
      <div class="flex items-center justify-between pb-2">
        <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Scorekort</p>
        <div class="flex gap-1">
          <button
            v-for="m in [
              { id: 'gross' as ViewMode, label: 'Slag' },
              { id: 'net' as ViewMode, label: 'Netto' },
              { id: 'points' as ViewMode, label: 'Poeng' },
            ]"
            :key="m.id"
            class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
            :class="viewMode === m.id
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-soft)]'"
            @click="viewMode = m.id"
          >{{ m.label }}</button>
        </div>
      </div>
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
                  v-for="(h, i) in frontHoles"
                  :key="'f' + i"
                  class="px-1 py-2 text-center text-[13px]"
                  :class="viewCellColor(row.cells[i], h.par)"
                  data-num
                >{{ viewCellDisplay(row.cells[i]) }}</td>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-medium text-[color:var(--color-ink)]" data-num>
                  {{ viewSumRange(row, 0, frontHoles.length) }}
                </td>
                <template v-if="backHoles.length">
                  <td
                    v-for="(h, i) in backHoles"
                    :key="'b' + i"
                    class="px-1 py-2 text-center text-[13px]"
                    :class="viewCellColor(row.cells[9 + i], h.par)"
                    data-num
                  >{{ viewCellDisplay(row.cells[9 + i]) }}</td>
                  <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-medium text-[color:var(--color-ink)]" data-num>
                    {{ viewSumRange(row, 9, 9 + backHoles.length) }}
                  </td>
                </template>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-semibold text-[color:var(--color-ink)]" data-num>
                  {{ viewSumRange(row, 0, holeCount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-if="summary?.skins" class="px-5 pt-[22px] pb-2">
      <div class="flex items-center justify-between pb-2">
        <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
          Skins · {{ skinsMode }}
        </p>
        <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
          {{ skinsHoles.filter((h) => h.winnerId).length }} avgjort
        </p>
      </div>
      <div class="overflow-hidden rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div
          v-for="participant in skinsParticipants"
          :key="participant.id"
          class="flex items-center justify-between border-b border-[color:var(--color-line-soft)] px-4 py-2.5 last:border-b-0"
        >
          <span class="text-sm font-medium text-[color:var(--color-ink)]">{{ participant.label }}</span>
          <span data-num class="text-[18px] font-semibold tracking-[-0.02em]">
            {{ skinsTotals[participant.id] ?? 0 }}
            <span data-mono class="ml-0.5 text-[10px] font-normal text-[color:var(--color-ink-muted)]">skins</span>
          </span>
        </div>
      </div>

      <div class="mt-3 overflow-hidden rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div class="flex items-center gap-3 border-b border-[color:var(--color-line-soft)] px-4 py-2">
          <span data-mono class="w-8 text-[10px] text-[color:var(--color-ink-muted)]">Hull</span>
          <span data-mono class="flex-1 text-[10px] text-[color:var(--color-ink-muted)]">Vinner</span>
          <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Skins</span>
        </div>
        <div
          v-for="h in skinsHoles"
          :key="h.hole"
          class="flex items-center gap-3 border-b border-[color:var(--color-line-soft)] px-4 py-2 last:border-b-0"
        >
          <span data-num class="w-8 text-[13px] font-medium">{{ h.hole }}</span>
          <span class="flex-1 truncate text-[13px]" :class="h.winnerId ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-muted)] italic'">
            {{ h.winnerId ? h.winnerLabel : (h.winningScore != null ? `Delt (${h.winningScore})` : '—') }}
          </span>
          <span data-num class="text-[13px] font-semibold"
            :class="h.winnerId ? 'text-[color:var(--color-gold)]' : 'text-[color:var(--color-ink-muted)]'"
          >{{ h.winnerId ? h.carryValue : (h.carryValue > 1 ? `+${h.carryValue - 1}` : '—') }}</span>
        </div>
      </div>
    </section>

    <p data-mono class="mt-5 text-center text-[10px] text-[color:var(--color-ink-muted)]">
      Lagret lokalt · ingen innlogging
    </p>
  </div>
</template>
