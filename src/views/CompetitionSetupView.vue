<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getCourseById, getCourses } from '@/lib/course-catalog'
import {
  buildPercentageAllowance,
  createCompetitionFromSetup,
  getDefaultAllowanceRule,
  isTeamFormat,
  supportsSkins,
  type AllowanceRuleSnapshot,
  type CompetitionFormat,
  type CompetitionSideGame,
  type PlayerProfile,
  type SkinsMode,
} from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'
import StepFormat from '@/components/setup/StepFormat.vue'
import StepCourse from '@/components/setup/StepCourse.vue'
import StepPlayers from '@/components/setup/StepPlayers.vue'
import StepOptions from '@/components/setup/StepOptions.vue'
import StepReview from '@/components/setup/StepReview.vue'
import type { PlayerSelection } from '@/components/setup/shared'

const router = useRouter()
const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const courses = getCourses()

const STEPS = ['Format', 'Bane', 'Spillere', 'Valg', 'Start'] as const

const step = ref(0)

const form = reactive({
  name: defaultName(),
  date: new Date().toISOString().slice(0, 10),
  format: 'stableford' as CompetitionFormat,
  holes: 18 as 9 | 18,
  courseId: courses[0]?.id ?? '',
  skinsEnabled: false,
  skinsMode: 'net' as SkinsMode,
  allowancePercentage: getDefaultPercentage('stableford'),
})

const ALLOWANCE_PRESETS = [0, 0.5, 0.75, 0.85, 0.9, 1] as const
const allowanceIsPercentage = computed(() => form.format !== 'scramble-2')

const selections = reactive<Record<string, PlayerSelection>>({})

const selectedCourse = computed(() => getCourseById(form.courseId))
const selectedPlayers = computed(() =>
  playersStore.sortedPlayers.filter((p) => selections[p.id]?.selected),
)
const isTeamCompetition = computed(() => isTeamFormat(form.format))
const requiresPair = computed(() => form.format === 'match-play')

watch(
  () => [playersStore.sortedPlayers, selectedCourse.value?.id] as const,
  () => {
    const defaultTeeId = selectedCourse.value?.tees[0]?.id ?? ''
    for (const player of playersStore.sortedPlayers) {
      selections[player.id] ??= { selected: false, teeId: defaultTeeId, sideId: 'side-1' }
      if (!selectedCourse.value?.tees.some((t) => t.id === selections[player.id].teeId)) {
        selections[player.id].teeId = defaultTeeId
      }
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => form.format,
  (format) => {
    if (!supportsSkins(format)) form.skinsEnabled = false
    const rule = getDefaultAllowanceRule(format)
    if (rule.kind === 'percentage') {
      form.allowancePercentage = rule.percentage
    }
    autoAssignSides()
  },
  { immediate: true },
)

watch(
  () => selectedPlayers.value.map((p) => p.id).join(','),
  () => autoAssignSides(),
)

const issue = computed(() => {
  if (!form.name.trim()) return 'Gi runden et navn.'
  if (!selectedCourse.value) return 'Velg en bane.'
  if (selectedPlayers.value.length === 0) return 'Velg minst én spiller.'
  if (requiresPair.value && selectedPlayers.value.length !== 2) return 'Match play krever 2 spillere.'
  if ((form.format === 'stroke' || form.format === 'stableford') && selectedPlayers.value.length < 2)
    return 'Legg til minst 2 spillere.'
  if (isTeamCompetition.value) {
    if (selectedPlayers.value.length < 4 || selectedPlayers.value.length % 2 !== 0) {
      return 'Lagformat krever et partall, minst 4 spillere.'
    }
    const counts = selectedPlayers.value.reduce<Record<string, number>>((acc, p) => {
      const sid = selections[p.id].sideId
      acc[sid] = (acc[sid] ?? 0) + 1
      return acc
    }, {})
    if (!Object.values(counts).every((c) => c === 2)) return 'Hvert lag må ha nøyaktig 2 spillere.'
  }
  return ''
})

const canAdvance = computed(() => {
  switch (step.value) {
    case 0:
      return !!form.name.trim()
    case 1:
      return !!selectedCourse.value
    case 2:
      return (
        selectedPlayers.value.length > 0 &&
        (!requiresPair.value || selectedPlayers.value.length === 2) &&
        (!isTeamCompetition.value || (selectedPlayers.value.length >= 4 && selectedPlayers.value.length % 2 === 0))
      )
    case 3:
      return true
    case 4:
      return !issue.value
    default:
      return false
  }
})

async function advance() {
  if (step.value === STEPS.length - 1) {
    await startRound()
    return
  }
  step.value = Math.min(STEPS.length - 1, step.value + 1)
}

function back() {
  if (step.value === 0) {
    router.push('/')
    return
  }
  step.value = Math.max(0, step.value - 1)
}

function togglePlayer(id: string) {
  selections[id].selected = !selections[id].selected
}

function onPlayerDeleted(id: string) {
  delete selections[id]
}

function onPlayerAdded(player: PlayerProfile) {
  const defaultTeeId = selectedCourse.value?.tees[0]?.id ?? ''
  selections[player.id] = { selected: true, teeId: defaultTeeId, sideId: 'side-1' }
}

async function startRound() {
  if (issue.value) {
    toast.error(issue.value)
    return
  }
  const course = selectedCourse.value
  if (!course) return

  const allowanceRule: AllowanceRuleSnapshot = allowanceIsPercentage.value
    ? buildPercentageAllowance(form.allowancePercentage)
    : getDefaultAllowanceRule(form.format)
  const sideGames: CompetitionSideGame[] = form.skinsEnabled
    ? [{ id: crypto.randomUUID(), type: 'skins', enabled: true, mode: form.skinsMode }]
    : []

  const competition = createCompetitionFromSetup(
    {
      name: form.name,
      date: form.date,
      holes: form.holes,
      format: form.format,
      courseId: course.id,
      players: selectedPlayers.value.map((p) => ({
        playerId: p.id,
        teeId: selections[p.id].teeId,
        sideId: isTeamCompetition.value ? selections[p.id].sideId : undefined,
      })),
      sideGames,
      allowanceRule,
    },
    playersStore.sortedPlayers,
    course,
  )

  await competitionsStore.saveCompetition(competition)
  toast.success('Runden er klar.')
  router.push(`/competitions/${competition.id}`)
}

function autoAssignSides() {
  if (!isTeamCompetition.value) return
  selectedPlayers.value.forEach((p, i) => {
    selections[p.id].sideId = `side-${Math.floor(i / 2) + 1}`
  })
}

function getDefaultPercentage(format: CompetitionFormat) {
  const rule = getDefaultAllowanceRule(format)
  return rule.kind === 'percentage' ? rule.percentage : 1
}

function defaultName() {
  const d = new Date()
  const weekday = d.toLocaleDateString('nb-NO', { weekday: 'long' })
  const date = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).replace('.', '')
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}srunde · ${date}`
}
</script>

<template>
  <div class="flex min-h-[100svh] flex-col bg-[color:var(--color-bg)]">
    <div class="flex items-center justify-between px-5 pt-[calc(0.75rem+var(--safe-top))] pb-2">
      <button class="flex items-center gap-1 text-[15px] text-[color:var(--color-ink-soft)]" @click="back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ step === 0 ? 'Avbryt' : 'Tilbake' }}
      </button>
      <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
        Steg {{ step + 1 }}/{{ STEPS.length }}
      </span>
    </div>

    <div class="flex gap-1 px-5 pt-1 pb-3">
      <div
        v-for="(_, i) in STEPS"
        :key="i"
        class="h-[3px] flex-1 rounded-sm transition"
        :class="i <= step ? 'bg-[color:var(--color-accent)]' : 'bg-[color:var(--color-line-soft)]'"
      />
    </div>

    <div class="flex-1 overflow-y-auto px-5 pb-4">
      <h2 data-num class="text-[32px] font-medium leading-none tracking-[-0.03em] text-[color:var(--color-ink)]">
        {{ STEPS[step] }}
      </h2>

      <StepFormat
        v-if="step === 0"
        v-model:name="form.name"
        v-model:format="form.format"
        v-model:holes="form.holes"
      />

      <StepCourse
        v-if="step === 1"
        v-model:course-id="form.courseId"
        :courses="courses"
        :selected-course="selectedCourse"
      />

      <StepPlayers
        v-if="step === 2"
        :players="playersStore.sortedPlayers"
        :selections="selections"
        :selected-course="selectedCourse"
        :is-team-competition="isTeamCompetition"
        @toggle="togglePlayer"
        @player-deleted="onPlayerDeleted"
        @player-added="onPlayerAdded"
      />

      <StepOptions
        v-if="step === 3"
        v-model:allowance-percentage="form.allowancePercentage"
        v-model:skins-enabled="form.skinsEnabled"
        v-model:skins-mode="form.skinsMode"
        :format="form.format"
        :allowance-is-percentage="allowanceIsPercentage"
        :allowance-presets="ALLOWANCE_PRESETS"
      />

      <StepReview
        v-if="step === 4"
        :name="form.name"
        :format="form.format"
        :holes="form.holes"
        :selected-course="selectedCourse"
        :selected-players="selectedPlayers"
        :selections="selections"
        :allowance-is-percentage="allowanceIsPercentage"
        :allowance-percentage="form.allowancePercentage"
        :skins-enabled="form.skinsEnabled"
        :skins-mode="form.skinsMode"
        :issue="issue"
      />
    </div>

    <div class="flex gap-2 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-4 py-3 pb-[calc(0.75rem+var(--safe-bottom))]">
      <button
        class="rounded-2xl border border-[color:var(--color-line)] px-5 py-3 text-[15px] font-medium"
        :disabled="step === 0"
        :style="step === 0 ? { opacity: 0.4 } : undefined"
        @click="step = Math.max(0, step - 1)"
      >
        Tilbake
      </button>
      <button
        data-testid="advance"
        class="flex-1 rounded-2xl bg-[color:var(--color-accent)] px-5 py-3 text-[15px] font-semibold text-[color:var(--color-bg)] disabled:opacity-50"
        :disabled="!canAdvance"
        @click="advance"
      >
        {{ step === STEPS.length - 1 ? 'Start runde' : 'Fortsett' }}
      </button>
    </div>
  </div>
</template>
