<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { CheckCheckIcon, FlagIcon, RotateCcwIcon } from 'lucide-vue-next'
import NumberPadSheet from '@/components/competition/NumberPadSheet.vue'
import { Button } from '@/components/ui/button'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  getCompetitionPlayerAdjustments,
  getFormatLabel,
  getStrokeAdjustments,
  type Competition,
  type CompetitionFormat,
  type LeaderboardEntry,
} from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'

const route = useRoute()
const router = useRouter()
const competitionsStore = useCompetitionsStore()

const competition = computed(() =>
  competitionsStore.findCompetition(String(route.params.competitionId)),
)

const summary = computed(() =>
  competition.value ? buildCompetitionSummary(competition.value) : null,
)

const summaryById = computed(() => {
  const map = new Map<string, LeaderboardEntry>()
  summary.value?.leaderboard.forEach((entry) => map.set(entry.id, entry))
  return map
})

const mixedTees = computed(() => {
  const players = competition.value?.players ?? []
  if (players.length <= 1) return false
  const firstTeeId = players[0].teeId
  return players.some((player) => player.teeId !== firstTeeId)
})

const referenceTee = computed(() => {
  const current = competition.value
  if (!current) return null
  return current.players[0]?.teeSnapshot ?? current.courseSnapshot.tees[0] ?? null
})

const holeDetails = computed(() =>
  referenceTee.value ? buildHoleDetails(referenceTee.value) : [],
)

const currentHoleIndex = computed(() =>
  Math.max(0, (competition.value?.currentHole ?? 1) - 1),
)

const currentHole = computed(() => holeDetails.value[currentHoleIndex.value])

const isStablefordFormat = computed(() => {
  const format = competition.value?.format
  return format === 'stableford' || format === 'fourball-stableford'
})

const isMatchPlay = computed(() => competition.value?.format === 'match-play')

type ScoreEntity = {
  id: string
  label: string
  teeColor: string
  playingHandicap: number
  strokesGiven: number
  value: number | null
  par: number
  summaryEntry: LeaderboardEntry | undefined
  update: (value: number | null) => Promise<void>
}

const entities = computed<ScoreEntity[]>(() => {
  const current = competition.value
  if (!current) return []
  const map = summaryById.value

  if (current.format === 'scramble-2') {
    return current.sides.map((side) => {
      const sideScores = current.scores.sideScores[side.id] ?? []
      const teeSnapshot = current.players.find((p) => p.sideId === side.id)?.teeSnapshot
      const teeColor = teeSnapshot?.color ?? '#3B7A5C'
      const adjustments = teeSnapshot
        ? getStrokeAdjustments(side.playingHandicap ?? 0, teeSnapshot.strokeIndexes)
        : []
      const par = teeSnapshot?.holePars[currentHoleIndex.value] ?? currentHole.value?.par ?? 4
      return {
        id: side.id,
        label: side.name,
        teeColor,
        playingHandicap: side.playingHandicap ?? 0,
        strokesGiven: adjustments[currentHoleIndex.value] ?? 0,
        value: sideScores[currentHoleIndex.value] ?? null,
        par,
        summaryEntry: map.get(side.id),
        update: (value: number | null) => updateSideScore(side.id, value),
      }
    })
  }

  return current.players.map((player) => {
    const playerScores = current.scores.playerScores[player.id] ?? []
    const adjustments = getCompetitionPlayerAdjustments(current, player)
    const par = player.teeSnapshot.holePars[currentHoleIndex.value] ?? 4
    return {
      id: player.id,
      label: player.displayName,
      teeColor: player.teeSnapshot.color,
      playingHandicap: player.playingHandicap,
      strokesGiven: adjustments[currentHoleIndex.value] ?? 0,
      value: playerScores[currentHoleIndex.value] ?? null,
      par,
      summaryEntry: map.get(player.id),
      update: (value: number | null) => updatePlayerScore(player.id, value),
    }
  })
})

const leaderboard = computed<LeaderboardEntry[]>(() => summary.value?.leaderboard ?? [])

const teeColorById = computed(() => {
  const map = new Map<string, string>()
  const current = competition.value
  if (!current) return map
  for (const player of current.players) {
    map.set(player.id, player.teeSnapshot.color)
  }
  for (const side of current.sides) {
    const color = current.players.find((p) => p.sideId === side.id)?.teeSnapshot.color
    if (color) map.set(side.id, color)
  }
  return map
})

const holesPlayed = computed(() => summary.value?.completeHoles ?? 0)

const visibleHoles = computed(() => {
  const holes = holeDetails.value
  if (holes.length === 0) return []
  const total = holes.length
  const max = Math.min(9, total)
  const half = Math.floor(max / 2)
  const start = Math.max(0, Math.min(total - max, currentHoleIndex.value - half))
  return holes.slice(start, start + max)
})

const isHoleCompleted = (holeNumber: number) => {
  const current = competition.value
  if (!current) return false
  const index = holeNumber - 1
  if (current.format === 'scramble-2') {
    return current.sides.every((side) => current.scores.sideScores[side.id]?.[index] != null)
  }
  return current.players.every((p) => current.scores.playerScores[p.id]?.[index] != null)
}

const openEntityId = ref<string | null>(null)

const openEntity = computed(() =>
  openEntityId.value ? entities.value.find((e) => e.id === openEntityId.value) ?? null : null,
)

async function mutateCompetition(mutator: (draft: Competition) => void) {
  if (!competition.value) return
  const draft = JSON.parse(JSON.stringify(competition.value)) as Competition
  mutator(draft)
  await competitionsStore.saveCompetition(draft)
}

async function updatePlayerScore(playerId: string, value: number | null) {
  await mutateCompetition((draft) => {
    draft.scores.playerScores[playerId][currentHoleIndex.value] = value
  })
}

async function updateSideScore(sideId: string, value: number | null) {
  await mutateCompetition((draft) => {
    draft.scores.sideScores[sideId][currentHoleIndex.value] = value
  })
}

async function setCurrentHole(holeNumber: number) {
  await mutateCompetition((draft) => {
    draft.currentHole = holeNumber
  })
}

async function toggleCompletion() {
  if (!competition.value) return
  const previousStatus = competition.value.status
  await mutateCompetition((draft) => {
    draft.status = draft.status === 'completed' ? 'in_progress' : 'completed'
  })
  toast.success(
    previousStatus === 'completed'
      ? 'Competition reopened.'
      : 'Competition marked complete.',
  )
}

const isSubmittingScore = ref(false)

async function handleSubmitScore(value: number) {
  const entity = openEntity.value
  if (!entity || isSubmittingScore.value) return
  isSubmittingScore.value = true
  try {
    await entity.update(value)
    openEntityId.value = null
  } finally {
    isSubmittingScore.value = false
  }
}

async function handleClearScore() {
  const entity = openEntity.value
  if (!entity || isSubmittingScore.value) return
  isSubmittingScore.value = true
  try {
    await entity.update(null)
    openEntityId.value = null
  } finally {
    isSubmittingScore.value = false
  }
}

const completionActionLabel = computed(() =>
  competition.value?.status === 'completed' ? 'Reopen competition' : 'Mark competition complete',
)

function scoreColor(value: number | null, par: number) {
  if (value == null) return 'text-fw-ink'
  const diff = value - par
  if (diff <= -1) return 'text-fw-emerald'
  if (diff >= 2) return 'text-fw-clay'
  return 'text-fw-ink'
}

function scoreLabelShort(value: number, par: number) {
  const diff = value - par
  if (diff <= -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return `+${diff}`
}

type PrimaryValue = { display: string; label: string; numeric: number }

function primaryValueFor(entry: LeaderboardEntry | undefined, format: CompetitionFormat | undefined): PrimaryValue {
  if (!entry || !format) return { display: '–', label: 'pts', numeric: 0 }
  if (format === 'stableford' || format === 'fourball-stableford') {
    return { display: String(entry.stablefordPoints), label: 'pts', numeric: entry.stablefordPoints }
  }
  if (format === 'match-play') {
    return { display: String(entry.stablefordPoints), label: entry.stablefordPoints === 1 ? 'hole' : 'holes', numeric: entry.stablefordPoints }
  }
  return { display: String(entry.netTotal), label: 'net', numeric: entry.netTotal }
}

function perHoleValue(entity: ScoreEntity): { display: string; label: string } {
  if (entity.value == null) return { display: '–', label: isStablefordFormat.value ? 'pts' : 'net' }
  const net = entity.value - entity.strokesGiven
  if (isStablefordFormat.value) {
    return { display: String(Math.max(0, 2 + entity.par - net)), label: 'pts' }
  }
  return { display: String(net), label: 'net' }
}

function gapLabel(index: number) {
  const entries = leaderboard.value
  if (index === 0 || entries.length === 0) return ''
  const format = competition.value?.format
  const top = primaryValueFor(entries[0], format).numeric
  const current = primaryValueFor(entries[index], format).numeric
  if (format === 'stroke' || format === 'fourball-stroke' || format === 'scramble-2') {
    const diff = current - top
    return diff > 0 ? `+${diff}` : ''
  }
  const diff = top - current
  return diff > 0 ? `−${diff}` : ''
}
</script>

<template>
  <div>
    <div v-if="!competition" class="flex min-h-[80svh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p class="font-serif text-2xl text-fw-ink">Competition not found</p>
      <p class="text-sm text-fw-ink-soft">
        The requested local round could not be loaded from IndexedDB.
      </p>
      <Button variant="outline" class="rounded-full" @click="router.push('/')">
        Back to scoreboard
      </Button>
    </div>

    <div
      v-else
      class="relative mx-auto flex min-h-[100svh] max-w-md flex-col bg-fw-bg text-fw-ink"
    >
      <!-- Header -->
      <header class="flex items-center justify-between border-b border-fw-line-soft px-5 pb-3 pt-8">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-fw-accent">
            <FlagIcon class="size-3.5 text-fw-bg" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-[15px] font-semibold tracking-tight text-fw-ink">
              {{ competition.name }}
            </div>
            <div class="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-fw-ink-muted">
              {{ competition.courseSnapshot.clubName }} · {{ getFormatLabel(competition.format) }}
            </div>
          </div>
        </div>
        <button
          type="button"
          class="p-2 text-fw-ink"
          :aria-label="completionActionLabel"
          @click="toggleCompletion"
        >
          <CheckCheckIcon v-if="competition.status !== 'completed'" class="size-4" />
          <RotateCcwIcon v-else class="size-4" />
        </button>
      </header>

      <!-- Hole switcher -->
      <section class="px-0 pb-3 pt-4">
        <div class="flex justify-center gap-1 overflow-x-auto px-4">
          <button
            v-for="hole in visibleHoles"
            :key="hole.number"
            type="button"
            class="flex shrink-0 items-center justify-center font-serif tabular-nums transition-all"
            :class="[
              hole.number === competition.currentHole
                ? 'size-11 rounded-[14px] bg-fw-accent text-base font-bold text-fw-bg'
                : isHoleCompleted(hole.number)
                  ? 'size-8 rounded-[10px] border border-fw-line bg-fw-surface text-sm font-medium text-fw-ink'
                  : 'size-8 rounded-[10px] text-sm font-medium text-fw-ink-muted',
            ]"
            @click="setCurrentHole(hole.number)"
          >
            {{ hole.number }}
          </button>
        </div>

        <div class="mt-4 flex items-baseline justify-between px-6">
          <div>
            <div class="font-mono text-[10px] uppercase tracking-[0.16em] text-fw-ink-muted">
              Hole {{ competition.currentHole }}
            </div>
            <div
              class="mt-0.5 font-serif text-[42px] font-medium leading-[48px] tracking-tight tabular-nums text-fw-ink"
            >
              Par {{ currentHole?.par ?? 4 }}
            </div>
          </div>
          <div v-if="!mixedTees" class="text-right">
            <div class="flex items-baseline justify-end gap-2.5">
              <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-fw-ink-muted">SI</span>
              <span class="font-serif text-[17px] font-medium tabular-nums text-fw-ink">
                {{ currentHole?.strokeIndex ?? '–' }}
              </span>
            </div>
            <div class="mt-0.5 flex items-baseline justify-end gap-2.5">
              <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-fw-ink-muted">Yards</span>
              <span class="font-serif text-[17px] font-medium tabular-nums text-fw-ink">
                {{ currentHole?.yardage ?? '–' }}
              </span>
            </div>
          </div>
          <div v-else class="text-right">
            <div class="font-mono text-[10px] uppercase tracking-[0.16em] text-fw-ink-muted">
              Mixed tees
            </div>
            <div class="mt-0.5 font-serif text-[13px] italic text-fw-ink-soft">
              per-player SI
            </div>
          </div>
        </div>
      </section>

      <!-- Skins ribbon -->
      <div
        v-if="summary?.skins"
        class="mx-4 mb-0.5 flex items-center justify-between rounded-xl border border-fw-line bg-gradient-to-r from-fw-surface to-fw-surface-alt px-3.5 py-2.5"
      >
        <div class="flex items-center gap-2">
          <div
            class="flex size-4 items-center justify-center rounded-full bg-fw-gold font-serif text-[10px] font-bold text-fw-surface"
          >
            S
          </div>
          <span class="text-xs font-medium text-fw-ink">Skins · {{ summary.skins.mode }}</span>
        </div>
        <span class="font-mono text-[11px] text-fw-ink-soft">
          {{ summary.skins.holes.filter((h) => h.winnerLabel).length }}/{{ summary.skins.holes.length }} holes
        </span>
      </div>

      <!-- Player rows -->
      <section class="flex-1 overflow-y-auto px-4 py-3.5">
        <button
          v-for="entity in entities"
          :key="entity.id"
          type="button"
          class="mb-2 flex w-full items-center gap-3.5 rounded-2xl border border-fw-line bg-fw-surface px-4 py-3.5 text-left"
          :aria-label="`Edit score for ${entity.label}`"
          @click="openEntityId = entity.id"
        >
          <!-- Left: name + meta -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span
                class="block size-2 shrink-0 rounded-full border"
                :style="{ backgroundColor: entity.teeColor, borderColor: 'var(--fw-line)' }"
              />
              <span class="truncate text-[15px] font-semibold tracking-tight text-fw-ink">
                {{ entity.label }}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 pl-4">
              <span class="font-mono text-[10px] tracking-wide text-fw-ink-muted">
                PH {{ entity.playingHandicap }}
              </span>
              <div v-if="entity.strokesGiven > 0" class="flex items-center gap-0.5">
                <span
                  v-for="n in entity.strokesGiven"
                  :key="n"
                  class="block size-1 rounded-full bg-fw-accent"
                />
                <span class="ml-1 font-mono text-[9px] tracking-wide text-fw-ink-muted">
                  stroke{{ entity.strokesGiven > 1 ? 's' : '' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Center: score box -->
          <div
            class="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl"
            :class="
              entity.value != null
                ? 'border-[1.5px] border-fw-line bg-transparent'
                : 'border border-dashed border-fw-ink-dim bg-fw-bg'
            "
          >
            <template v-if="entity.value != null">
              <div
                class="font-serif text-[34px] font-semibold leading-none tracking-tight tabular-nums"
                :class="scoreColor(entity.value, entity.par)"
              >
                {{ entity.value }}
              </div>
              <div class="mt-1 font-mono text-[9px] uppercase tracking-wide text-fw-ink-muted">
                {{ scoreLabelShort(entity.value, entity.par) }}
              </div>
            </template>
            <template v-else>
              <span class="font-serif text-2xl leading-none text-fw-ink-muted">+</span>
            </template>
          </div>

          <!-- Right: per-hole value + running total (format-aware) -->
          <div class="min-w-[48px] text-right">
            <div
              class="font-serif text-2xl font-medium leading-none tabular-nums"
              :class="entity.value != null ? 'text-fw-ink' : 'text-fw-ink-dim'"
            >
              {{ perHoleValue(entity).display }}
            </div>
            <div class="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-fw-ink-muted">
              {{ perHoleValue(entity).label }}
            </div>
            <div class="mt-1.5 font-serif text-xs tabular-nums text-fw-ink-soft">
              <span class="font-semibold text-fw-ink">
                {{ primaryValueFor(entity.summaryEntry, competition.format).display }}
              </span>
              <span class="ml-0.5 text-[10px] text-fw-ink-muted">
                {{ isMatchPlay ? 'won' : 'total' }}
              </span>
            </div>
          </div>
        </button>

        <p class="py-2 text-center font-mono text-[10px] uppercase tracking-wider text-fw-ink-muted">
          — tap a row to enter score —
        </p>
      </section>

      <!-- Sticky leaderboard footer (sourced from summary.leaderboard) -->
      <footer
        class="border-t border-fw-line bg-fw-surface-alt px-5 pb-6 pt-3.5 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]"
      >
        <div class="mb-2.5 flex items-baseline justify-between">
          <div class="font-mono text-[10px] uppercase tracking-wider text-fw-ink-muted">
            Leaderboard · thru {{ holesPlayed }}
          </div>
          <div class="text-[11px] text-fw-ink-soft">
            {{ competition.status === 'completed' ? 'Final' : 'Live' }}
          </div>
        </div>
        <ol class="space-y-1">
          <li
            v-for="(entry, index) in leaderboard"
            :key="entry.id"
            class="flex items-center justify-between py-0.5"
          >
            <div class="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                class="w-3.5 shrink-0 font-mono text-[11px] tabular-nums text-fw-ink-muted"
              >{{ entry.position ?? index + 1 }}</span>
              <span
                class="block size-1.5 shrink-0 rounded-full border"
                :style="{ backgroundColor: teeColorById.get(entry.id) ?? '#3B7A5C', borderColor: 'var(--fw-line)' }"
              />
              <span
                class="truncate text-[13px] tracking-tight text-fw-ink"
                :class="(entry.position ?? index + 1) === 1 ? 'font-semibold' : 'font-medium'"
              >
                {{ entry.label }}
              </span>
              <span
                v-if="gapLabel(index)"
                class="font-mono text-[10px] text-fw-ink-muted"
              >{{ gapLabel(index) }}</span>
              <span
                v-if="entry.matchStatus"
                class="font-mono text-[10px] uppercase tracking-wide text-fw-ink-muted"
              >{{ entry.matchStatus }}</span>
            </div>
            <div class="font-serif text-lg font-semibold tracking-tight tabular-nums text-fw-ink">
              {{ primaryValueFor(entry, competition.format).display }}
              <span class="ml-0.5 font-mono text-[10px] font-normal text-fw-ink-muted">
                {{ primaryValueFor(entry, competition.format).label }}
              </span>
            </div>
          </li>
        </ol>
      </footer>

      <NumberPadSheet
        :open="openEntity != null"
        :label="openEntity?.label ?? ''"
        :hole-number="competition.currentHole"
        :par="currentHole?.par ?? 4"
        :strokes-given="openEntity?.strokesGiven ?? 0"
        :current-value="openEntity?.value ?? null"
        @close="openEntityId = null"
        @submit="handleSubmitScore"
        @clear="handleClearScore"
      />
    </div>
  </div>
</template>
