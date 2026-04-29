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
  getStrokeAdjustments,
  isPickedUp,
  type Competition,
  type CompetitionPlayer,
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

function buildPlayerCell(c: Competition, player: CompetitionPlayer, holeIndex: number): Cell {
  const gross = c.scores.playerScores[player.id]?.[holeIndex] ?? null
  const pickedUp = isPickedUp(c.scores.playerPickups?.[player.id], holeIndex)
  const par = player.teeSnapshot.holePars[holeIndex] ?? 4
  const adj = getCompetitionPlayerAdjustments(c, player)[holeIndex] ?? 0
  if (pickedUp) {
    return { gross: null, pickedUp: true, net: null, points: 0 }
  }
  if (gross === null) {
    return { gross: null, pickedUp: false, net: null, points: null }
  }
  const net = getNetScore(gross, adj)
  return { gross, pickedUp: false, net, points: getStablefordPoints(par, net) }
}

const rows = computed<Row[]>(() => {
  const c = competition.value
  if (!c) return []

  return leaderboard.value.map((entry) => {
    const isSide = entry.entityType === 'side'
    const sidePlayers = isSide ? c.players.filter((player) => player.sideId === entry.id) : []
    const cells: Cell[] = []

    if (isSide && isScramble.value) {
      const side = c.sides.find((s) => s.id === entry.id)
      const sideGrossArr = c.scores.sideScores[entry.id] ?? []
      const sidePickupArr = c.scores.sidePickups?.[entry.id]
      const referencePlayer = sidePlayers[0]
      const strokeIndexes = referencePlayer?.teeSnapshot.strokeIndexes ?? []
      const adjustments = getStrokeAdjustments(side?.playingHandicap ?? 0, strokeIndexes)
      const pars = referencePlayer?.teeSnapshot.holePars ?? holeDetails.value.map((h) => h.par)

      for (let i = 0; i < holeCount.value; i += 1) {
        const pickedUp = isPickedUp(sidePickupArr, i)
        const gross = sideGrossArr[i] ?? null
        const par = pars[i] ?? 4
        const adj = adjustments[i] ?? 0
        if (pickedUp) {
          cells.push({ gross: null, pickedUp: true, net: null, points: 0 })
        } else if (gross === null) {
          cells.push({ gross: null, pickedUp: false, net: null, points: null })
        } else {
          const net = getNetScore(gross, adj)
          cells.push({ gross, pickedUp: false, net, points: getStablefordPoints(par, net) })
        }
      }
    } else if (isSide) {
      // Fourball: derive per-hole cells from member players' scores
      for (let i = 0; i < holeCount.value; i += 1) {
        const memberCells = sidePlayers.map((player) => buildPlayerCell(c, player, i))
        const allPickedUp = memberCells.length > 0 && memberCells.every((cell) => cell.pickedUp)
        const scoring = memberCells.filter((cell) => cell.gross !== null)
        if (scoring.length === 0) {
          cells.push({
            gross: null,
            pickedUp: allPickedUp,
            net: null,
            points: allPickedUp ? 0 : null,
          })
          continue
        }
        const bestGross = Math.min(...scoring.map((cell) => cell.gross ?? Number.POSITIVE_INFINITY))
        const bestNet = Math.min(...scoring.map((cell) => cell.net ?? Number.POSITIVE_INFINITY))
        const bestPoints = Math.max(...scoring.map((cell) => cell.points ?? 0))
        cells.push({ gross: bestGross, pickedUp: false, net: bestNet, points: bestPoints })
      }
    } else {
      const player = c.players.find((p) => p.id === entry.id)
      if (player) {
        for (let i = 0; i < holeCount.value; i += 1) {
          cells.push(buildPlayerCell(c, player, i))
        }
      }
    }

    const tee = isSide
      ? sidePlayers[0]?.teeSnapshot.color
      : c.players.find((player) => player.id === entry.id)?.teeSnapshot.color

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

function sumRange(extract: (cell: Cell) => number | null, row: Row, from: number, to: number) {
  let total = 0
  let hasRecorded = false
  for (let i = from; i < to; i += 1) {
    const cell = row.cells[i]
    if (!cell) continue
    const value = extract(cell)
    if (value != null) {
      total += value
      hasRecorded = true
    } else if (cell.pickedUp) {
      hasRecorded = true
    }
  }
  return hasRecorded ? total : null
}

function sumGrossRange(row: Row, from: number, to: number) {
  return sumRange((cell) => cell.gross, row, from, to)
}
function sumNetRange(row: Row, from: number, to: number) {
  return sumRange((cell) => cell.net, row, from, to)
}
function sumPointsRange(row: Row, from: number, to: number) {
  return sumRange((cell) => cell.points, row, from, to)
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

const viewModes: { id: ViewMode; label: string }[] = [
  { id: 'gross', label: 'Slag' },
  { id: 'net', label: 'Netto' },
  { id: 'points', label: 'Poeng' },
]

function viewCellDisplay(cell: Cell | undefined) {
  if (!cell) return '–'
  if (cell.pickedUp) return 'PU'
  if (viewMode.value === 'points') return cell.points ?? '–'
  if (viewMode.value === 'net') return cell.net ?? '–'
  return cell.gross ?? '–'
}

function viewSumRange(row: Row, from: number, to: number) {
  const value = viewMode.value === 'points'
    ? sumPointsRange(row, from, to)
    : viewMode.value === 'net'
      ? sumNetRange(row, from, to)
      : sumGrossRange(row, from, to)
  return value ?? '–'
}

function viewCellColor(cell: Cell | undefined, par: number) {
  if (!cell || cell.pickedUp) {
    return cell?.pickedUp ? 'text-[color:var(--color-clay)]' : 'text-[color:var(--color-ink-dim)]'
  }
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
  if (cell.gross == null) return 'text-[color:var(--color-ink-dim)]'
  const d = cell.gross - par
  if (d <= -1) return 'text-[color:var(--color-emerald)]'
  if (d >= 2) return 'text-[color:var(--color-clay)]'
  return 'text-[color:var(--color-ink)]'
}

const skinsSummary = computed(() => summary.value?.skins ?? null)
const skinsHoleResults = computed(() => skinsSummary.value?.holes ?? [])

function skinsTotalForEntry(entryId: string) {
  return skinsSummary.value?.totalSkins[entryId] ?? 0
}
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
        <div v-if="!isMatchPlay" class="flex gap-1">
          <button
            v-for="m in viewModes"
            :key="m.id"
            class="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition"
            :class="viewMode === m.id
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
            @click="viewMode = m.id"
          >
            {{ m.label }}
          </button>
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
                  v-for="(cell, i) in row.cells.slice(0, frontHoles.length)"
                  :key="'f' + i"
                  class="px-1 py-2 text-center text-[13px]"
                  :class="viewCellColor(cell, frontHoles[i].par)"
                  data-num
                >{{ viewCellDisplay(cell) }}</td>
                <td class="border-l border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-1 py-2 text-center text-[13px] font-medium text-[color:var(--color-ink)]" data-num>
                  {{ viewSumRange(row, 0, frontHoles.length) }}
                </td>
                <template v-if="backHoles.length">
                  <td
                    v-for="(cell, i) in row.cells.slice(9, 9 + backHoles.length)"
                    :key="'b' + i"
                    class="px-1 py-2 text-center text-[13px]"
                    :class="viewCellColor(cell, backHoles[i].par)"
                    data-num
                  >{{ viewCellDisplay(cell) }}</td>
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

    <section v-if="skinsSummary" class="px-5 pt-[22px] pb-2">
      <p data-mono class="pb-2 text-[10px] text-[color:var(--color-ink-muted)]">Skins · {{ skinsSummary.mode }}</p>
      <div class="overflow-hidden rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div class="px-4 py-3">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Total</p>
          <ul class="mt-1.5 grid grid-cols-2 gap-1.5 text-[12px]">
            <li
              v-for="entry in leaderboard"
              :key="entry.id"
              class="flex items-center justify-between rounded-lg bg-[color:var(--color-surface-alt)] px-2.5 py-1.5"
            >
              <span class="truncate">{{ entry.label }}</span>
              <span data-num class="font-semibold">{{ skinsTotalForEntry(entry.id) }}</span>
            </li>
          </ul>
        </div>
        <div class="border-t border-[color:var(--color-line-soft)] px-4 py-3">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Per hull</p>
          <ul class="mt-1.5 grid grid-cols-3 gap-1 text-[11px] sm:grid-cols-6">
            <li
              v-for="hole in skinsHoleResults"
              :key="hole.hole"
              class="flex items-center justify-between rounded-md border border-[color:var(--color-line-soft)] px-2 py-1"
              :class="hole.winnerId
                ? 'bg-[color:var(--color-emerald)]/10'
                : 'bg-[color:var(--color-surface-alt)]'"
            >
              <span data-mono class="text-[color:var(--color-ink-muted)]">H{{ hole.hole }}</span>
              <span class="ml-1 truncate font-medium text-[color:var(--color-ink)]">
                {{ hole.winnerLabel ?? `+${hole.carryValue}` }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <p data-mono class="mt-5 text-center text-[10px] text-[color:var(--color-ink-muted)]">
      Lagret lokalt · ingen innlogging
    </p>
  </div>
</template>
