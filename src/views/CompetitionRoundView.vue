<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  getCompetitionPlayerAdjustments,
  getFormatLabel,
  getNetScore,
  getStablefordPoints,
  isTeamFormat,
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

const currentHole = ref(1)
const padTarget = ref<string | null>(null) // playerId or sideId
const padValue = ref('')

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
const isTeam = computed(() => competition.value ? isTeamFormat(competition.value.format) : false)

const visibleHoles = computed(() => {
  const total = holeCount.value
  const maxVisible = Math.min(9, total)
  const start = Math.max(1, Math.min(total - maxVisible + 1, currentHole.value - Math.floor(maxVisible / 2)))
  return Array.from({ length: maxVisible }, (_, i) => start + i).filter((n) => n <= total)
})

const skinsGame = computed(() => competition.value?.sideGames.find((g) => g.type === 'skins' && g.enabled))

function allPlayed(holeNumber: number) {
  const c = competition.value
  if (!c) return false
  if (isScramble.value) {
    return c.sides.every((s) => c.scores.sideScores[s.id]?.[holeNumber - 1] != null)
  }
  return c.players.every((p) => c.scores.playerScores[p.id]?.[holeNumber - 1] != null)
}

function adjustmentsFor(player: CompetitionPlayer) {
  if (!competition.value) return []
  return getCompetitionPlayerAdjustments(competition.value, player)
}

function strokesForHole(player: CompetitionPlayer, holeIndex: number) {
  return adjustmentsFor(player)[holeIndex] ?? 0
}

function getScore(playerId: string, holeIndex: number) {
  return competition.value?.scores.playerScores[playerId]?.[holeIndex] ?? null
}

function getSideScore(sideId: string, holeIndex: number) {
  return competition.value?.scores.sideScores[sideId]?.[holeIndex] ?? null
}

function cumulativePoints(player: CompetitionPlayer) {
  const c = competition.value
  if (!c) return 0
  const scores = c.scores.playerScores[player.id] ?? []
  const adjustments = adjustmentsFor(player)
  let total = 0
  scores.forEach((gross, i) => {
    if (gross == null) return
    total += getStablefordPoints(player.teeSnapshot.holePars[i], getNetScore(gross, adjustments[i] ?? 0))
  })
  return total
}

function cumulativeNet(player: CompetitionPlayer) {
  const c = competition.value
  if (!c) return 0
  const scores = c.scores.playerScores[player.id] ?? []
  const adjustments = adjustmentsFor(player)
  return scores.reduce((acc, gross, i) => {
    if (gross == null) return acc
    return acc + (getNetScore(gross, adjustments[i] ?? 0) ?? 0)
  }, 0)
}

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

function openPad(id: string) {
  padTarget.value = id
  const holeIndex = currentHole.value - 1
  const existing = isScramble.value ? getSideScore(id, holeIndex) : getScore(id, holeIndex)
  padValue.value = existing != null ? String(existing) : ''
}

function closePad() {
  padTarget.value = null
  padValue.value = ''
}

async function setScore(id: string, gross: number | null) {
  const c = competition.value
  if (!c) return
  const next: Competition = JSON.parse(JSON.stringify(c))
  const holeIndex = currentHole.value - 1
  if (isScramble.value) {
    const arr = next.scores.sideScores[id] ?? []
    arr[holeIndex] = gross
    next.scores.sideScores[id] = arr
  } else {
    const arr = next.scores.playerScores[id] ?? []
    arr[holeIndex] = gross
    next.scores.playerScores[id] = arr
  }
  next.currentHole = currentHole.value
  await competitionsStore.saveCompetition(next)
}

async function submitPad() {
  if (!padTarget.value) return
  const n = parseInt(padValue.value, 10)
  if (!Number.isFinite(n) || n <= 0) {
    toast.error('Skriv inn et positivt tall.')
    return
  }
  await setScore(padTarget.value, n)
  closePad()
}

async function clearPadScore() {
  if (!padTarget.value) return
  await setScore(padTarget.value, null)
  closePad()
}

function padKey(k: string) {
  if (k === 'del') {
    padValue.value = padValue.value.slice(0, -1)
  } else if (padValue.value.length < 2) {
    padValue.value += k
  }
}

function setPadFromPar(n: number) {
  padValue.value = String(n)
}

async function finishRound() {
  const c = competition.value
  if (!c) return
  if (summary.value && summary.value.completeHoles < c.holes) {
    const ok = confirm('Ikke alle hull er scoret. Avslutt likevel?')
    if (!ok) return
  }
  const next: Competition = JSON.parse(JSON.stringify(c))
  next.status = 'completed'
  await competitionsStore.saveCompetition(next)
  router.replace(`/competitions/${c.id}/review`)
}

const padPar = computed(() => hole.value?.par ?? 4)
const padQuick = computed(() => {
  const par = padPar.value
  return [
    { label: 'Eagle', n: par - 2 },
    { label: 'Birdie', n: par - 1 },
    { label: 'Par', n: par },
    { label: 'Bogey', n: par + 1 },
    { label: 'Double', n: par + 2 },
  ].filter((q) => q.n > 0)
})

const padPreviewLabel = computed(() => {
  const n = parseInt(padValue.value, 10)
  if (!Number.isFinite(n)) return 'slag'
  return scoreLabel(n, padPar.value)
})

const padPreviewPoints = computed(() => {
  if (!competition.value || !padTarget.value || !hole.value) return null
  const n = parseInt(padValue.value, 10)
  if (!Number.isFinite(n)) return null
  if (isScramble.value) {
    const side = competition.value.sides.find((s) => s.id === padTarget.value)
    if (!side) return null
    const player = competition.value.players.find((p) => p.sideId === side.id)
    if (!player) return null
    return getStablefordPoints(
      player.teeSnapshot.holePars[currentHole.value - 1],
      getNetScore(n, 0),
    )
  }
  const player = competition.value.players.find((p) => p.id === padTarget.value)
  if (!player) return null
  const adj = strokesForHole(player, currentHole.value - 1)
  return getStablefordPoints(
    player.teeSnapshot.holePars[currentHole.value - 1],
    getNetScore(n, adj),
  )
})

function padTargetLabel() {
  if (!padTarget.value || !competition.value) return ''
  if (isScramble.value) {
    const side = competition.value.sides.find((s) => s.id === padTarget.value)
    if (!side) return ''
    const players = competition.value.players.filter((p) => p.sideId === side.id)
    return players.map((p) => p.displayName.split(' ')[0]).join(' / ') || side.name
  }
  return competition.value.players.find((p) => p.id === padTarget.value)?.displayName ?? ''
}
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
      <div class="flex justify-center gap-1 overflow-x-auto no-scrollbar">
        <button
          v-for="n in visibleHoles"
          :key="n"
          class="flex flex-shrink-0 items-center justify-center transition"
          :class="[
            n === currentHole
              ? 'h-11 w-11 rounded-[14px] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : allPlayed(n)
                ? 'h-[30px] w-[30px] rounded-[10px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'
                : 'h-[30px] w-[30px] rounded-[10px] text-[color:var(--color-ink-muted)]',
          ]"
          @click="currentHole = n"
        >
          <span
            data-num
            :class="n === currentHole ? 'text-[17px] font-bold' : 'text-[13px] font-medium'"
          >
            {{ n }}
          </span>
        </button>
      </div>

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
        <button
          v-for="player in competition.players"
          :key="player.id"
          class="mb-2 flex w-full items-center gap-3.5 rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5 text-left"
          @click="openPad(player.id)"
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
              <template v-if="strokesForHole(player, currentHole - 1) > 0">
                <div class="flex items-center gap-0.5">
                  <span
                    v-for="i in strokesForHole(player, currentHole - 1)"
                    :key="i"
                    class="h-1 w-1 rounded-full bg-[color:var(--color-accent)]"
                  />
                </div>
              </template>
            </div>
          </div>

          <div
            class="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[16px]"
            :class="getScore(player.id, currentHole - 1) != null
              ? 'border-[1.5px] border-[color:var(--color-line)]'
              : 'border border-dashed border-[color:var(--color-ink-dim)] bg-[color:var(--color-bg)]'"
          >
            <template v-if="getScore(player.id, currentHole - 1) != null">
              <span
                data-num
                class="text-[34px] leading-none font-semibold tracking-[-0.02em]"
                :class="(() => {
                  const g = getScore(player.id, currentHole - 1)!
                  const d = g - hole!.par
                  if (d <= -1) return 'text-[color:var(--color-emerald)]'
                  if (d >= 2) return 'text-[color:var(--color-clay)]'
                  return 'text-[color:var(--color-ink)]'
                })()"
              >
                {{ getScore(player.id, currentHole - 1) }}
              </span>
              <span data-mono class="mt-1 text-[9px] text-[color:var(--color-ink-muted)]">
                {{ scoreLabel(getScore(player.id, currentHole - 1)!, hole!.par) }}
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
              :class="getScore(player.id, currentHole - 1) != null
                ? 'text-[color:var(--color-ink)]'
                : 'text-[color:var(--color-ink-dim)]'"
            >
              {{ isStableford
                ? (getScore(player.id, currentHole - 1) != null
                  ? getStablefordPoints(hole!.par, getNetScore(getScore(player.id, currentHole - 1), strokesForHole(player, currentHole - 1)))
                  : '–')
                : (getScore(player.id, currentHole - 1) != null
                  ? getNetScore(getScore(player.id, currentHole - 1), strokesForHole(player, currentHole - 1))
                  : '–') }}
            </span>
            <span data-mono class="mt-1 text-[9px] text-[color:var(--color-ink-muted)]">
              {{ isStableford ? 'pts' : 'netto' }}
            </span>
            <span data-num class="mt-1.5 text-xs text-[color:var(--color-ink-soft)]">
              <span class="font-semibold text-[color:var(--color-ink)]">
                {{ isStableford ? cumulativePoints(player) : cumulativeNet(player) }}
              </span>
              <span class="text-[10px] text-[color:var(--color-ink-muted)]"> totalt</span>
            </span>
          </div>
        </button>
      </template>

      <template v-else>
        <button
          v-for="side in competition.sides"
          :key="side.id"
          class="mb-2 flex w-full items-center gap-3.5 rounded-[16px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5 text-left"
          @click="openPad(side.id)"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15px] font-semibold tracking-tight">
              {{ competition.players.filter((p) => p.sideId === side.id).map((p) => p.displayName).join(' / ') || side.name }}
            </p>
            <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">
              HCP {{ side.playingHandicap ?? 0 }}
            </p>
          </div>
          <div
            class="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[16px]"
            :class="getSideScore(side.id, currentHole - 1) != null
              ? 'border-[1.5px] border-[color:var(--color-line)]'
              : 'border border-dashed border-[color:var(--color-ink-dim)] bg-[color:var(--color-bg)]'"
          >
            <template v-if="getSideScore(side.id, currentHole - 1) != null">
              <span data-num class="text-[34px] leading-none font-semibold">
                {{ getSideScore(side.id, currentHole - 1) }}
              </span>
            </template>
            <template v-else>
              <svg width="22" height="22" viewBox="0 0 22 22" class="text-[color:var(--color-ink-muted)]">
                <path d="M11 4v14M4 11h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </template>
          </div>
        </button>
      </template>

      <p data-mono class="mt-3 text-center text-[10px] text-[color:var(--color-ink-muted)]">
        — trykk på et felt for å registrere —
      </p>
    </section>

    <footer class="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-5 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
      <div class="flex items-baseline justify-between">
        <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
          Leaderboard · etter {{ Math.max(0, currentHole - 1) }}
        </p>
      </div>
      <ul class="mt-2">
        <li
          v-for="(entry, i) in leaderboard"
          :key="entry.id"
          class="flex items-center justify-between py-1"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2.5">
            <span data-mono class="w-3.5 text-[11px] text-[color:var(--color-ink-muted)]">{{ i + 1 }}</span>
            <span class="truncate text-[13px] font-medium tracking-tight" :class="i === 0 ? 'font-semibold' : ''">
              {{ entry.label }}
            </span>
            <span v-if="i > 0" data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
              −{{ Math.max(0, (leaderboard[0]?.[isStableford ? 'stablefordPoints' : 'netTotal'] ?? 0) - (entry[isStableford ? 'stablefordPoints' : 'netTotal'] ?? 0)) }}
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

    <!-- Number pad overlay -->
    <div
      v-if="padTarget"
      class="absolute inset-0 z-40 flex flex-col justify-end bg-black/30"
      @click="closePad"
    >
      <div
        class="rounded-t-3xl bg-[color:var(--color-bg)] px-4 pt-3 pb-[calc(1.75rem+var(--safe-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.25)]"
        @click.stop
      >
        <div class="mx-auto mb-3 h-1 w-9 rounded-sm bg-[color:var(--color-ink-dim)]" />

        <div class="mb-3.5 flex items-start justify-between">
          <div>
            <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
              {{ padTargetLabel() }} · Hull {{ currentHole }}
            </p>
            <p data-num class="mt-0.5 text-[22px] font-medium tracking-[-0.02em]">Score</p>
          </div>
          <button
            aria-label="Lukk"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)]"
            @click="closePad"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" class="text-[color:var(--color-ink-soft)]">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="mb-3.5 flex items-center justify-between rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5">
          <div>
            <p data-num class="text-[46px] leading-none font-medium tracking-[-0.03em]" :class="padValue ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-dim)]'">
              {{ padValue || '–' }}
            </p>
            <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">
              {{ padPreviewLabel }}
            </p>
          </div>
          <div class="text-right">
            <p data-num class="text-[34px] leading-none font-medium tracking-[-0.02em]" :class="padPreviewPoints != null ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-ink-dim)]'">
              {{ padPreviewPoints ?? '–' }}
            </p>
            <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">poeng</p>
          </div>
        </div>

        <div class="mb-3.5 flex gap-1.5">
          <button
            v-for="q in padQuick"
            :key="q.label"
            class="flex-1 rounded-xl border py-2.5 text-center transition"
            :class="padValue === String(q.n)
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'"
            @click="setPadFromPar(q.n)"
          >
            <span data-num class="block text-[18px] font-semibold">{{ q.n }}</span>
            <span data-mono class="block text-[9px] opacity-70">{{ q.label }}</span>
          </button>
        </div>

        <div class="grid gap-2">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="k in ['1','2','3']"
              :key="k"
              class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
              data-num
              @click="padKey(k)"
            >{{ k }}</button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="k in ['4','5','6']"
              :key="k"
              class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
              data-num
              @click="padKey(k)"
            >{{ k }}</button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="k in ['7','8','9']"
              :key="k"
              class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
              data-num
              @click="padKey(k)"
            >{{ k }}</button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-sm font-medium"
              @click="clearPadScore"
            >Tøm</button>
            <button
              class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
              data-num
              @click="padKey('0')"
            >0</button>
            <button
              class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-sm font-medium"
              @click="padKey('del')"
            >⌫</button>
          </div>
          <button
            data-testid="pad-submit"
            class="h-[54px] rounded-2xl bg-[color:var(--color-accent)] text-[15px] font-semibold text-[color:var(--color-bg)] disabled:opacity-50"
            :disabled="!padValue"
            @click="submitPad"
          >
            Lagre score
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
