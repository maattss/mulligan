<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  createEmptyPickupArray,
  createEmptyScoreArray,
  getCompetitionPlayerAdjustments,
  getFormatLabel,
  getNetScore,
  getStablefordPoints,
  isHoleRecorded,
  isPickedUp,
  isTeamFormat,
  type Competition,
  type CompetitionPlayer,
  type LeaderboardEntry,
} from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'
import HoleStrip from '@/components/round/HoleStrip.vue'
import NumberPad from '@/components/round/NumberPad.vue'
import PlayerScoreRow from '@/components/round/PlayerScoreRow.vue'
import SideScoreRow from '@/components/round/SideScoreRow.vue'
import RoundLeaderboard from '@/components/round/RoundLeaderboard.vue'

const route = useRoute()
const router = useRouter()
const competitionsStore = useCompetitionsStore()

const competitionId = computed(() => String(route.params.competitionId))
const competition = computed<Competition | undefined>(() =>
  competitionsStore.findCompetition(competitionId.value),
)

const currentHole = ref(1)
const padTarget = ref<string | null>(null)

onMounted(() => {
  const c = competition.value
  if (!c) {
    router.replace('/')
    return
  }
  currentHole.value = Math.max(1, Math.min(c.holes, c.currentHole))
  if (c.status === 'completed') {
    router.replace(`/competitions/${c.id}/review`)
  }
})

watch(competition, (c) => {
  if (c?.status === 'completed') {
    router.replace(`/competitions/${c.id}/review`)
  }
})

const holeCount = computed(() => competition.value?.holes ?? 18)
const holeDetails = computed(() => {
  const c = competition.value
  if (!c) return []
  return buildHoleDetails(c.players[0]?.teeSnapshot ?? c.courseSnapshot.tees[0])
})

const hole = computed(() => holeDetails.value[currentHole.value - 1])

const summary = computed(() => (competition.value ? buildCompetitionSummary(competition.value) : null))
const leaderboard = computed<LeaderboardEntry[]>(() => summary.value?.leaderboard ?? [])
const isStableford = computed(() =>
  competition.value?.format === 'stableford' || competition.value?.format === 'fourball-stableford',
)
const isScramble = computed(() => competition.value?.format === 'scramble-2')
const isMatchPlay = computed(() => competition.value?.format === 'match-play')
const _isTeam = computed(() => competition.value ? isTeamFormat(competition.value.format) : false)
void _isTeam

const skinsGame = computed(() => competition.value?.sideGames.find((g) => g.type === 'skins' && g.enabled))

function holeRecorded(holeNumber: number) {
  const c = competition.value
  if (!c) return false
  const index = holeNumber - 1
  if (isScramble.value) {
    return c.sides.every((s) => isHoleRecorded(
      c.scores.sideScores[s.id]?.[index] ?? null,
      c.scores.sidePickups?.[s.id],
      index,
    ))
  }
  return c.players.every((p) => isHoleRecorded(
    c.scores.playerScores[p.id]?.[index] ?? null,
    c.scores.playerPickups?.[p.id],
    index,
  ))
}

function adjustmentsFor(player: CompetitionPlayer) {
  if (!competition.value) return []
  return getCompetitionPlayerAdjustments(competition.value, player)
}

function strokesForHole(player: CompetitionPlayer, holeIndex: number) {
  return adjustmentsFor(player)[holeIndex] ?? 0
}

function getPlayerGross(playerId: string, holeIndex: number) {
  return competition.value?.scores.playerScores[playerId]?.[holeIndex] ?? null
}

function getPlayerPickup(playerId: string, holeIndex: number) {
  return isPickedUp(competition.value?.scores.playerPickups?.[playerId], holeIndex)
}

function getSideGross(sideId: string, holeIndex: number) {
  return competition.value?.scores.sideScores[sideId]?.[holeIndex] ?? null
}

function getSidePickup(sideId: string, holeIndex: number) {
  return isPickedUp(competition.value?.scores.sidePickups?.[sideId], holeIndex)
}

function cumulativePoints(player: CompetitionPlayer) {
  const c = competition.value
  if (!c) return 0
  const scores = c.scores.playerScores[player.id] ?? []
  const pickups = c.scores.playerPickups?.[player.id]
  const adjustments = adjustmentsFor(player)
  let total = 0
  scores.forEach((gross, i) => {
    if (isPickedUp(pickups, i)) return
    if (gross == null) return
    total += getStablefordPoints(player.teeSnapshot.holePars[i], getNetScore(gross, adjustments[i] ?? 0))
  })
  return total
}

function cumulativeNet(player: CompetitionPlayer) {
  const c = competition.value
  if (!c) return 0
  const scores = c.scores.playerScores[player.id] ?? []
  const pickups = c.scores.playerPickups?.[player.id]
  const adjustments = adjustmentsFor(player)
  return scores.reduce((acc, gross, i) => {
    if (isPickedUp(pickups, i)) return acc
    if (gross == null) return acc
    return acc + (getNetScore(gross, adjustments[i] ?? 0) ?? 0)
  }, 0)
}

function openPad(id: string) {
  padTarget.value = id
}

function closePad() {
  padTarget.value = null
}

function ensurePickupArrays(next: Competition) {
  next.scores.playerPickups = next.scores.playerPickups ?? {}
  next.scores.sidePickups = next.scores.sidePickups ?? {}
  for (const p of next.players) {
    if (!next.scores.playerPickups[p.id]) {
      next.scores.playerPickups[p.id] = createEmptyPickupArray(next.holes)
    }
  }
  for (const s of next.sides) {
    if (!next.scores.sidePickups[s.id]) {
      next.scores.sidePickups[s.id] = createEmptyPickupArray(next.holes)
    }
  }
}

async function writeScore(id: string, options: { gross?: number | null; pickedUp: boolean }) {
  const c = competition.value
  if (!c) return
  const next: Competition = structuredClone(c)
  ensurePickupArrays(next)
  const holeIndex = currentHole.value - 1

  if (isScramble.value) {
    const scoreArr = next.scores.sideScores[id] ?? createEmptyScoreArray(next.holes)
    const pickupArr = next.scores.sidePickups![id] ?? createEmptyPickupArray(next.holes)
    if (options.pickedUp) {
      scoreArr[holeIndex] = null
      pickupArr[holeIndex] = true
    } else if (options.gross === null) {
      scoreArr[holeIndex] = null
      pickupArr[holeIndex] = false
    } else if (options.gross !== undefined) {
      scoreArr[holeIndex] = options.gross
      pickupArr[holeIndex] = false
    }
    next.scores.sideScores[id] = scoreArr
    next.scores.sidePickups![id] = pickupArr
  } else {
    const scoreArr = next.scores.playerScores[id] ?? createEmptyScoreArray(next.holes)
    const pickupArr = next.scores.playerPickups![id] ?? createEmptyPickupArray(next.holes)
    if (options.pickedUp) {
      scoreArr[holeIndex] = null
      pickupArr[holeIndex] = true
    } else if (options.gross === null) {
      scoreArr[holeIndex] = null
      pickupArr[holeIndex] = false
    } else if (options.gross !== undefined) {
      scoreArr[holeIndex] = options.gross
      pickupArr[holeIndex] = false
    }
    next.scores.playerScores[id] = scoreArr
    next.scores.playerPickups![id] = pickupArr
  }

  next.currentHole = currentHole.value
  await competitionsStore.saveCompetition(next)
}

async function handleCommit(gross: number) {
  if (!padTarget.value) return
  await writeScore(padTarget.value, { gross, pickedUp: false })
}

async function handlePickup() {
  if (!padTarget.value) return
  await writeScore(padTarget.value, { pickedUp: true })
  closePad()
}

async function handleClear() {
  if (!padTarget.value) return
  await writeScore(padTarget.value, { gross: null, pickedUp: false })
  closePad()
}

async function finishRound() {
  const c = competition.value
  if (!c) return
  if (summary.value && summary.value.completeHoles < c.holes) {
    const ok = confirm('Ikke alle hull er scoret. Avslutt likevel?')
    if (!ok) return
  }
  const next: Competition = structuredClone(c)
  next.status = 'completed'
  await competitionsStore.saveCompetition(next)
  router.replace(`/competitions/${c.id}/review`)
}

const padContext = computed(() => {
  const c = competition.value
  if (!c || !padTarget.value) return null
  const holeIndex = currentHole.value - 1
  if (isScramble.value) {
    const side = c.sides.find((s) => s.id === padTarget.value)
    if (!side) return null
    const label = c.players.filter((p) => p.sideId === side.id).map((p) => p.displayName.split(' ')[0]).join(' / ') || side.name
    return {
      label,
      par: hole.value?.par ?? 4,
      strokeAdjustment: 0,
      initialScore: getSideGross(side.id, holeIndex),
      isPickedUp: getSidePickup(side.id, holeIndex),
    }
  }
  const player = c.players.find((p) => p.id === padTarget.value)
  if (!player) return null
  return {
    label: player.displayName,
    par: hole.value?.par ?? 4,
    strokeAdjustment: strokesForHole(player, holeIndex),
    initialScore: getPlayerGross(player.id, holeIndex),
    isPickedUp: getPlayerPickup(player.id, holeIndex),
  }
})
</script>

<template>
  <div v-if="competition" class="relative flex min-h-[100svh] flex-col bg-[color:var(--color-bg)]">
    <header class="flex items-center justify-between border-b border-[color:var(--color-line-soft)] px-4 pt-[calc(0.75rem+var(--safe-top))] pb-2.5">
      <div class="flex min-w-0 items-center gap-2.5">
        <button
          aria-label="Tilbake"
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          @click="router.push('/')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-accent)]">
          <svg width="12" height="12" viewBox="0 0 12 12" class="text-[color:var(--color-bg)]">
            <path d="M2 1v10M2 2h7l-1 2 1 2H2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="truncate text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">
            {{ competition.name }}
          </p>
          <p data-mono class="mt-0.5 text-[10px] text-[color:var(--color-ink-muted)]">
            {{ competition.courseSnapshot.clubName }} · {{ getFormatLabel(competition.format) }}
          </p>
        </div>
      </div>
      <button
        class="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--color-ink)]"
        @click="finishRound"
      >
        Avslutt
      </button>
    </header>

    <section class="px-4 pt-3 pb-2">
      <HoleStrip
        :current-hole="currentHole"
        :hole-count="holeCount"
        :is-complete="holeRecorded"
        @update:current-hole="currentHole = $event"
      />

      <div v-if="hole" class="mt-3 flex items-baseline justify-between px-2">
        <div>
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Hull {{ currentHole }}</p>
          <p data-num class="mt-0.5 text-[clamp(32px,9vw,42px)] font-medium leading-none tracking-[-0.04em] text-[color:var(--color-ink)]">
            Par {{ hole.par }}
          </p>
        </div>
        <div class="space-y-1 text-right">
          <div class="flex items-baseline justify-end gap-2.5">
            <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">SI</span>
            <span data-num class="text-[17px] font-medium">{{ hole.strokeIndex }}</span>
          </div>
          <div class="flex items-baseline justify-end gap-2.5">
            <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Lengde</span>
            <span data-num class="text-[17px] font-medium">{{ hole.yardage }}</span>
          </div>
        </div>
      </div>
    </section>

    <div v-if="skinsGame" class="mx-4 mb-1 flex items-center justify-between rounded-xl border border-[color:var(--color-line)] bg-gradient-to-r from-[color:var(--color-surface)] to-[color:var(--color-surface-alt)] px-3.5 py-2.5">
      <div class="flex items-center gap-2">
        <span class="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[color:var(--color-gold)]/90 text-[10px] font-bold text-[color:var(--color-surface)]" data-num>S</span>
        <span class="text-xs font-medium text-[color:var(--color-ink)]">Skins · {{ skinsGame.mode }}</span>
      </div>
    </div>

    <section class="flex-1 overflow-y-auto px-4 pt-3 pb-3">
      <template v-if="!isScramble">
        <PlayerScoreRow
          v-for="player in competition.players"
          :key="player.id"
          :player="player"
          :par="hole?.par ?? 4"
          :gross="getPlayerGross(player.id, currentHole - 1)"
          :picked-up="getPlayerPickup(player.id, currentHole - 1)"
          :stroke-adjustment="strokesForHole(player, currentHole - 1)"
          :cumulative-points="cumulativePoints(player)"
          :cumulative-net="cumulativeNet(player)"
          :is-stableford="isStableford"
          @open="openPad(player.id)"
        />
      </template>

      <template v-else>
        <SideScoreRow
          v-for="side in competition.sides"
          :key="side.id"
          :label="competition.players.filter((p) => p.sideId === side.id).map((p) => p.displayName).join(' / ') || side.name"
          :playing-handicap="side.playingHandicap ?? 0"
          :gross="getSideGross(side.id, currentHole - 1)"
          :picked-up="getSidePickup(side.id, currentHole - 1)"
          @open="openPad(side.id)"
        />
      </template>

      <p data-mono class="mt-3 text-center text-[10px] text-[color:var(--color-ink-muted)]">
        — trykk på et felt for å registrere —
      </p>
    </section>

    <RoundLeaderboard
      :entries="leaderboard"
      :current-hole="currentHole"
      :is-stableford="isStableford"
      :is-match-play="isMatchPlay"
    />

    <NumberPad
      v-if="padContext"
      :label="padContext.label"
      :hole="currentHole"
      :par="padContext.par"
      :stroke-adjustment="padContext.strokeAdjustment"
      :initial-score="padContext.initialScore"
      :is-picked-up="padContext.isPickedUp"
      @commit="handleCommit"
      @pickup="handlePickup"
      @clear="handleClear"
      @close="closePad"
    />
  </div>
</template>
