<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getCourseById, getCourses } from '@/lib/course-catalog'
import {
  COMPETITION_FORMATS,
  createCompetitionFromSetup,
  getDefaultAllowanceRule,
  getFormatLabel,
  isTeamFormat,
  supportsSkins,
  type CompetitionFormat,
  type CompetitionSideGame,
  type PlayerProfile,
  type SkinsMode,
} from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const router = useRouter()
const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const courses = getCourses()

const STEPS = ['Format', 'Course', 'Players', 'Options', 'Start'] as const

const step = ref(0)

const form = reactive({
  name: defaultName(),
  date: new Date().toISOString().slice(0, 10),
  format: 'stableford' as CompetitionFormat,
  holes: 18 as 9 | 18,
  courseId: courses[0]?.id ?? '',
  skinsEnabled: false,
  skinsMode: 'net' as SkinsMode,
})

type Selection = { selected: boolean; teeId: string; sideId: string }
const selections = reactive<Record<string, Selection>>({})

const newPlayerOpen = ref(false)
const newPlayer = reactive({ name: '', handicapIndex: 18.4 })

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
    autoAssignSides()
  },
  { immediate: true },
)

watch(
  () => selectedPlayers.value.map((p) => p.id).join(','),
  () => autoAssignSides(),
)

const issue = computed(() => {
  if (!form.name.trim()) return 'Name the round.'
  if (!selectedCourse.value) return 'Choose a course.'
  if (selectedPlayers.value.length === 0) return 'Select at least one player.'
  if (requiresPair.value && selectedPlayers.value.length !== 2) return 'Match play needs 2 players.'
  if ((form.format === 'stroke' || form.format === 'stableford') && selectedPlayers.value.length < 2)
    return 'Add at least 2 players.'
  if (isTeamCompetition.value) {
    if (selectedPlayers.value.length < 4 || selectedPlayers.value.length % 2 !== 0) {
      return 'Team formats need an even count, 4+.'
    }
    const counts = selectedPlayers.value.reduce<Record<string, number>>((acc, p) => {
      const sid = selections[p.id].sideId
      acc[sid] = (acc[sid] ?? 0) + 1
      return acc
    }, {})
    if (!Object.values(counts).every((c) => c === 2)) return 'Each side must have exactly 2 players.'
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

async function addInlinePlayer() {
  if (!newPlayer.name.trim()) {
    toast.error('Enter a name.')
    return
  }
  const saved = await playersStore.savePlayer({
    name: newPlayer.name,
    handicapIndex: Number(newPlayer.handicapIndex),
  })
  const defaultTeeId = selectedCourse.value?.tees[0]?.id ?? ''
  selections[saved.id] = { selected: true, teeId: defaultTeeId, sideId: 'side-1' }
  newPlayer.name = ''
  newPlayer.handicapIndex = 18.4
  newPlayerOpen.value = false
}

async function startRound() {
  if (issue.value) {
    toast.error(issue.value)
    return
  }
  const course = selectedCourse.value
  if (!course) return

  const allowanceRule = getDefaultAllowanceRule(form.format)
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
  toast.success('Round ready.')
  router.push(`/competitions/${competition.id}`)
}

function autoAssignSides() {
  if (!isTeamCompetition.value) return
  selectedPlayers.value.forEach((p, i) => {
    selections[p.id].sideId = `side-${Math.floor(i / 2) + 1}`
  })
}

function defaultName() {
  const d = new Date()
  return `${d.toLocaleDateString(undefined, { weekday: 'long' })} round`
}

function teeDotClass(color: string) {
  switch (color) {
    case 'red':
      return 'bg-[color:var(--color-tee-red)]'
    case 'yellow':
      return 'bg-[color:var(--color-tee-yellow)]'
    case 'blue':
      return 'bg-[color:var(--color-tee-blue)]'
    case 'black':
      return 'bg-[color:var(--color-ink)]'
    case 'white':
      return 'bg-[color:var(--color-tee-white)] border border-[color:var(--color-line)]'
    default:
      return 'bg-[color:var(--color-tee-green)]'
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
</script>

<template>
  <div class="flex min-h-[100svh] flex-col bg-[color:var(--color-bg)]">
    <div class="flex items-center justify-between px-5 pt-[calc(3.5rem+var(--safe-top))] pb-2">
      <button class="flex items-center gap-1 text-[15px] text-[color:var(--color-ink-soft)]" @click="back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ step === 0 ? 'Cancel' : 'Back' }}
      </button>
      <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
        Step {{ step + 1 }}/{{ STEPS.length }}
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

      <!-- Step 0: Format -->
      <div v-if="step === 0" class="mt-6">
        <label class="block">
          <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Name</span>
          <input
            v-model="form.name"
            class="mt-1.5 w-full rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[15px] outline-none focus:border-[color:var(--color-accent)]"
          />
        </label>

        <p data-mono class="mt-5 text-[10px] text-[color:var(--color-ink-muted)]">Format</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            v-for="f in COMPETITION_FORMATS"
            :key="f"
            class="rounded-2xl border px-3 py-3 text-left text-[13px] transition"
            :class="form.format === f
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'"
            @click="form.format = f"
          >
            {{ getFormatLabel(f) }}
          </button>
        </div>

        <p data-mono class="mt-5 text-[10px] text-[color:var(--color-ink-muted)]">Holes</p>
        <div class="mt-2 flex gap-2">
          <button
            v-for="n in [9, 18] as const"
            :key="n"
            class="flex-1 rounded-full border py-2.5 text-sm font-medium transition"
            :class="form.holes === n
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'"
            @click="form.holes = n"
          >
            {{ n }} holes
          </button>
        </div>
      </div>

      <!-- Step 1: Course -->
      <div v-if="step === 1" class="mt-6">
        <p class="text-sm text-[color:var(--color-ink-soft)]">Pick a local course from the bundled catalog.</p>
        <div class="mt-3 overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          <button
            v-for="course in courses"
            :key="course.id"
            class="flex w-full items-center justify-between border-b border-[color:var(--color-line-soft)] px-4 py-3.5 text-left last:border-b-0"
            @click="form.courseId = course.id"
          >
            <div class="min-w-0">
              <p class="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">{{ course.clubName }}</p>
              <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">{{ course.courseName }} · {{ course.city }}</p>
            </div>
            <div
              class="h-5 w-5 flex-shrink-0 rounded-full border-2"
              :class="form.courseId === course.id
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]'
                : 'border-[color:var(--color-line)]'"
            />
          </button>
        </div>

        <div v-if="selectedCourse" class="mt-4 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] p-4">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Tees</p>
          <div class="mt-2 space-y-1.5">
            <div
              v-for="tee in selectedCourse.tees"
              :key="tee.id"
              class="flex items-center justify-between text-[13px]"
            >
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" :class="teeDotClass(tee.color)" />
                <span>{{ tee.name }}</span>
              </div>
              <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
                CR {{ tee.courseRating }} · SR {{ tee.slopeRating }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Players -->
      <div v-if="step === 2" class="mt-6">
        <p class="text-sm text-[color:var(--color-ink-soft)]">
          Select the buddies playing. Handicap index and tee drive the stroke allocation.
        </p>

        <div v-if="playersStore.sortedPlayers.length > 0" class="mt-4 overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          <div
            v-for="p in playersStore.sortedPlayers"
            :key="p.id"
            class="border-b border-[color:var(--color-line-soft)] last:border-b-0"
          >
            <button class="flex w-full items-center gap-3 px-4 py-3 text-left" @click="togglePlayer(p.id)">
              <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg)]">
                <span data-num class="text-[12px] font-semibold">{{ initials(p.name) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[15px] font-medium text-[color:var(--color-ink)]">{{ p.name }}</p>
                <p data-mono class="mt-0.5 text-[10px] text-[color:var(--color-ink-muted)]">
                  Index {{ p.handicapIndex.toFixed(1) }}
                </p>
              </div>
              <div
                class="h-5 w-5 rounded-md border-2"
                :class="selections[p.id]?.selected
                  ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]'
                  : 'border-[color:var(--color-line)]'"
              >
                <svg v-if="selections[p.id]?.selected" width="16" height="16" viewBox="0 0 16 16" class="text-[color:var(--color-bg)]">
                  <path d="M3 8l3.5 3.5L13 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </button>

            <div v-if="selections[p.id]?.selected" class="flex items-center gap-2 px-4 pt-1 pb-3">
              <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Tee</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="tee in selectedCourse?.tees ?? []"
                  :key="tee.id"
                  class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
                  :class="selections[p.id].teeId === tee.id
                    ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
                    : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
                  @click.stop="selections[p.id].teeId = tee.id"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="teeDotClass(tee.color)" />
                  {{ tee.name }}
                </button>
              </div>
              <span
                v-if="isTeamCompetition"
                data-mono
                class="ml-auto text-[10px] text-[color:var(--color-ink-muted)]"
              >
                {{ selections[p.id].sideId.replace('-', ' ').toUpperCase() }}
              </span>
            </div>
          </div>
        </div>

        <button
          class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[color:var(--color-line)] py-3 text-sm text-[color:var(--color-ink-soft)]"
          @click="newPlayerOpen = true"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          Add player
        </button>

        <div v-if="newPlayerOpen" class="mt-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <label class="block">
            <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Name</span>
            <input
              v-model="newPlayer.name"
              class="mt-1.5 w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--color-accent)]"
            />
          </label>
          <label class="mt-3 block">
            <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Handicap index</span>
            <input
              v-model.number="newPlayer.handicapIndex"
              type="number"
              step="0.1"
              class="mt-1.5 w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--color-accent)]"
            />
          </label>
          <div class="mt-3 flex gap-2">
            <button
              class="flex-1 rounded-xl border border-[color:var(--color-line)] py-2.5 text-sm"
              @click="newPlayerOpen = false"
            >Cancel</button>
            <button
              class="flex-1 rounded-xl bg-[color:var(--color-accent)] py-2.5 text-sm font-semibold text-[color:var(--color-bg)]"
              @click="addInlinePlayer"
            >Save</button>
          </div>
        </div>
      </div>

      <!-- Step 3: Options -->
      <div v-if="step === 3" class="mt-6 space-y-4">
        <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Skins side game</p>
              <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">
                Only available on stroke-based formats.
              </p>
            </div>
            <button
              class="relative h-7 w-12 rounded-full transition"
              :class="form.skinsEnabled
                ? 'bg-[color:var(--color-accent)]'
                : 'bg-[color:var(--color-line)]'"
              :disabled="!supportsSkins(form.format)"
              :style="!supportsSkins(form.format) ? { opacity: 0.4 } : undefined"
              @click="form.skinsEnabled = !form.skinsEnabled"
            >
              <span
                class="absolute top-0.5 h-6 w-6 rounded-full bg-white transition"
                :style="form.skinsEnabled ? { left: '22px' } : { left: '2px' }"
              />
            </button>
          </div>

          <div v-if="form.skinsEnabled" class="mt-4 flex gap-2">
            <button
              v-for="m in ['gross', 'net'] as const"
              :key="m"
              class="flex-1 rounded-full border py-2 text-sm font-medium transition"
              :class="form.skinsMode === m
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
                : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
              @click="form.skinsMode = m"
            >
              {{ m === 'gross' ? 'Gross' : 'Net' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 4: Start -->
      <div v-if="step === 4" class="mt-6 space-y-3">
        <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Round</p>
          <p data-num class="mt-1 text-2xl font-medium tracking-tight">{{ form.name }}</p>
          <p class="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            {{ selectedCourse?.clubName }} · {{ getFormatLabel(form.format) }} · {{ form.holes }} holes
          </p>
        </div>

        <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Players</p>
          <ul class="mt-2 space-y-2">
            <li
              v-for="p in selectedPlayers"
              :key="p.id"
              class="flex items-center gap-2 text-[13px]"
            >
              <span
                class="h-2 w-2 rounded-full"
                :class="teeDotClass(selectedCourse?.tees.find((t) => t.id === selections[p.id].teeId)?.color ?? 'green')"
              />
              <span class="flex-1">{{ p.name }}</span>
              <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
                HI {{ p.handicapIndex.toFixed(1) }}
              </span>
            </li>
          </ul>
        </div>

        <div v-if="form.skinsEnabled" class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Side game</p>
          <p class="mt-1 text-sm">Skins · {{ form.skinsMode }}</p>
        </div>

        <p v-if="issue" class="text-sm text-[color:var(--color-clay)]">{{ issue }}</p>
      </div>
    </div>

    <div class="flex gap-2 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] px-4 py-3 pb-[calc(1.75rem+var(--safe-bottom))]">
      <button
        class="rounded-2xl border border-[color:var(--color-line)] px-5 py-3 text-[15px] font-medium"
        :disabled="step === 0"
        :style="step === 0 ? { opacity: 0.4 } : undefined"
        @click="step = Math.max(0, step - 1)"
      >
        Back
      </button>
      <button
        data-testid="advance"
        class="flex-1 rounded-2xl bg-[color:var(--color-accent)] px-5 py-3 text-[15px] font-semibold text-[color:var(--color-bg)] disabled:opacity-50"
        :disabled="!canAdvance"
        @click="advance"
      >
        {{ step === STEPS.length - 1 ? 'Start round' : 'Continue' }}
      </button>
    </div>
  </div>
</template>
