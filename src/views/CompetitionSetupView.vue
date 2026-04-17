<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  CalculatorIcon,
  CircleHelpIcon,
  MapPinnedIcon,
  TrophyIcon,
  UsersRoundIcon,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getCourseById, getCourses } from '@/lib/course-catalog'
import {
  buildCompetitionSummary,
  COMPETITION_FORMATS,
  createCompetitionFromSetup,
  getDefaultAllowanceRule,
  getFormatLabel,
  isTeamFormat,
  supportsSkins,
  type CompetitionFormat,
  type CompetitionSideGame,
  type SkinsMode,
} from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const router = useRouter()
const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const courses = getCourses()

const form = reactive({
  name: createDefaultCompetitionName(),
  date: new Date().toISOString().slice(0, 10),
  format: 'stroke' as CompetitionFormat,
  holes: 18 as 9 | 18,
  courseId: courses[0]?.id ?? '',
  allowancePercentage: 100,
  skinsEnabled: false,
  skinsMode: 'net' as SkinsMode,
})

const selections = reactive<Record<string, {
  selected: boolean
  teeId: string
  sideId: string
}>>({})

const selectedCourse = computed(() => getCourseById(form.courseId))
const selectedPlayers = computed(() =>
  playersStore.sortedPlayers.filter((player) => selections[player.id]?.selected),
)

const isTeamCompetition = computed(() => isTeamFormat(form.format))
const requiresExactPair = computed(() => form.format === 'match-play')

watch(
  () => [playersStore.sortedPlayers, selectedCourse.value?.id] as const,
  () => {
    const defaultTeeId = selectedCourse.value?.tees[0]?.id ?? ''

    for (const player of playersStore.sortedPlayers) {
      selections[player.id] ??= {
        selected: false,
        teeId: defaultTeeId,
        sideId: 'side-1',
      }

      if (!selectedCourse.value?.tees.some((tee) => tee.id === selections[player.id].teeId)) {
        selections[player.id].teeId = defaultTeeId
      }
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => form.format,
  (format) => {
    const allowanceRule = getDefaultAllowanceRule(format)
    if (allowanceRule.kind === 'percentage') {
      form.allowancePercentage = allowanceRule.percentage * 100
    }

    if (!supportsSkins(format)) {
      form.skinsEnabled = false
    }

    autoAssignSides()
  },
  { immediate: true },
)

watch(
  () => selectedPlayers.value.map((player) => player.id).join(','),
  () => {
    autoAssignSides()
  },
)

const validationMessage = computed(() => {
  if (!selectedCourse.value) {
    return 'Choose a course from the bundled catalog.'
  }

  if (!form.name.trim()) {
    return 'Give the competition a name.'
  }

  if (selectedPlayers.value.length === 0) {
    return 'Select at least one player.'
  }

  if (requiresExactPair.value && selectedPlayers.value.length !== 2) {
    return 'Individual match play requires exactly 2 players.'
  }

  if ((form.format === 'stroke' || form.format === 'stableford') && selectedPlayers.value.length < 2) {
    return 'Individual competitions need at least 2 players.'
  }

  if (isTeamCompetition.value) {
    if (selectedPlayers.value.length < 4 || selectedPlayers.value.length % 2 !== 0) {
      return 'Team formats need an even number of players and at least 4 selected.'
    }

    const sideCounts = selectedPlayers.value.reduce<Record<string, number>>((counts, player) => {
      const sideId = selections[player.id]?.sideId
      counts[sideId] = (counts[sideId] ?? 0) + 1
      return counts
    }, {})

    if (!Object.values(sideCounts).every((count) => count === 2)) {
      return 'Each side must contain exactly 2 players.'
    }
  }

  return ''
})

async function createCompetition() {
  if (validationMessage.value) {
    toast.error(validationMessage.value)
    return
  }

  const course = selectedCourse.value

  if (!course) {
    toast.error('The selected course could not be found in the catalog.')
    return
  }

  const allowanceRule = getDefaultAllowanceRule(form.format)
  const finalAllowance = allowanceRule.kind === 'percentage'
    ? {
        ...allowanceRule,
        percentage: form.allowancePercentage / 100,
        label: `${form.allowancePercentage}% handicap allowance`,
      }
    : allowanceRule

  const sideGames: CompetitionSideGame[] = form.skinsEnabled
    ? [
        {
          id: crypto.randomUUID(),
          type: 'skins',
          enabled: true,
          mode: form.skinsMode,
        },
      ]
    : []

  const competition = createCompetitionFromSetup(
    {
      name: form.name,
      date: form.date,
      holes: form.holes,
      format: form.format,
      courseId: course.id,
      players: selectedPlayers.value.map((player) => ({
        playerId: player.id,
        teeId: selections[player.id].teeId,
        sideId: isTeamCompetition.value ? selections[player.id].sideId : undefined,
      })),
      sideGames,
      allowanceRule: finalAllowance,
    },
    playersStore.sortedPlayers,
    course,
  )

  await competitionsStore.saveCompetition(competition)
  toast.success('Competition created.')

  const summary = buildCompetitionSummary(competition)
  if (summary.leaderboard.length === 0) {
    toast.info('Round created. Start entering hole scores.')
  }

  await router.push(`/competitions/${competition.id}`)
}

function autoAssignSides() {
  if (!isTeamCompetition.value) {
    return
  }

  selectedPlayers.value.forEach((player, index) => {
    const sideNumber = Math.floor(index / 2) + 1
    selections[player.id].sideId = `side-${sideNumber}`
  })
}

function createDefaultCompetitionName() {
  const date = new Date()
  return `Buddy Game ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
    <div class="space-y-6">
      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Competition Basics</CardTitle>
          <CardDescription>
            Name the round, choose the format, and decide whether you are scoring 9 or 18 holes.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel for="competition-name">
                Competition Name
              </FieldLabel>
              <Input id="competition-name" v-model="form.name" />
            </Field>

            <Field>
              <FieldLabel for="competition-date">
                Date
              </FieldLabel>
              <Input id="competition-date" v-model="form.date" type="date" />
            </Field>
          </FieldGroup>

          <Field class="gap-3">
            <FieldLabel>Format</FieldLabel>
            <ToggleGroup v-model="form.format" type="single" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleGroupItem
                v-for="format in COMPETITION_FORMATS"
                :key="format"
                :value="format"
                class="h-auto min-h-20 rounded-2xl border border-border/70 px-4 py-4 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/10"
              >
                <div class="flex flex-col items-start gap-2">
                  <span class="font-medium">{{ getFormatLabel(format) }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ format }}
                  </span>
                </div>
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field class="gap-3">
            <FieldLabel>Holes</FieldLabel>
            <ToggleGroup v-model="form.holes" type="single" class="gap-3">
              <ToggleGroupItem :value="9" class="rounded-full px-6">
                9 holes
              </ToggleGroupItem>
              <ToggleGroupItem :value="18" class="rounded-full px-6">
                18 holes
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field v-if="getDefaultAllowanceRule(form.format).kind === 'percentage'">
            <FieldLabel for="allowance-percentage">
              Allowance Percentage
            </FieldLabel>
            <Input
              id="allowance-percentage"
              v-model="form.allowancePercentage"
              type="number"
              min="0"
              max="100"
              step="1"
            />
            <FieldDescription>
              Default policy for this format is {{ getDefaultAllowanceRule(form.format).label.toLowerCase() }}.
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Course And Tees</CardTitle>
          <CardDescription>
            Pick a bundled local course and assign tees per player before the competition snapshot is created.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <Field>
            <FieldLabel>Course</FieldLabel>
            <Select v-model="form.courseId">
              <SelectTrigger>
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                    {{ course.clubName }} · {{ course.city }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div v-if="selectedCourse" class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                  Course Snapshot
                </p>
                <h3 class="mt-2 text-lg font-semibold">
                  {{ selectedCourse.clubName }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ selectedCourse.courseName }} · {{ selectedCourse.city }}, {{ selectedCourse.region }}
                </p>
              </div>
              <Badge variant="secondary" class="rounded-full">
                {{ selectedCourse.holes }} holes
              </Badge>
            </div>

            <Separator class="my-4" />

            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="tee in selectedCourse.tees"
                :key="tee.id"
                variant="outline"
                class="rounded-full"
              >
                {{ tee.name }} · {{ tee.courseRating }} / {{ tee.slopeRating }}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="space-y-6">
      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Players And Side Games</CardTitle>
          <CardDescription>
            Select the buddies playing today, then let the app carry their names and handicaps into the round.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <Empty v-if="playersStore.sortedPlayers.length === 0" class="rounded-[1.5rem] border-border/80 bg-background/70">
            <EmptyHeader>
              <EmptyTitle>No player profiles yet</EmptyTitle>
              <EmptyDescription>
                Create a few players first so this competition can snapshot their handicaps correctly.
              </EmptyDescription>
            </EmptyHeader>
            <Button as-child variant="outline" class="rounded-full">
              <RouterLink to="/players">
                <UsersRoundIcon data-icon="inline-start" />
                Go to Players
              </RouterLink>
            </Button>
          </Empty>

          <div v-else class="grid gap-4">
            <div
              v-for="player in playersStore.sortedPlayers"
              :key="player.id"
              class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4"
            >
              <div class="flex flex-col gap-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-base font-semibold">
                      {{ player.name }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      {{ player.homeClub ?? 'No home club saved' }}
                    </p>
                  </div>
                  <Badge variant="secondary" class="rounded-full">
                    HI {{ player.handicapIndex.toFixed(1) }}
                  </Badge>
                </div>

                <div class="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/40 px-4 py-3">
                  <div>
                    <p class="font-medium">Include in this competition</p>
                    <p class="text-sm text-muted-foreground">
                      Snapshot the player and choose the tee before the round starts.
                    </p>
                  </div>
                  <Switch v-model="selections[player.id].selected" />
                </div>

                <div v-if="selections[player.id].selected" class="grid gap-3">
                  <Field>
                    <FieldLabel>Tee</FieldLabel>
                    <Select v-model="selections[player.id].teeId">
                      <SelectTrigger>
                        <SelectValue placeholder="Choose tee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem v-for="tee in selectedCourse?.tees ?? []" :key="tee.id" :value="tee.id">
                            {{ tee.name }} · {{ tee.courseRating }} / {{ tee.slopeRating }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div v-if="isTeamCompetition" class="rounded-2xl border border-border/70 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                    Auto-assigned to {{ selections[player.id].sideId.replace('-', ' ').toUpperCase() }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div class="space-y-4 rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-medium">Skins side game</p>
                <p class="text-sm text-muted-foreground">
                  Available on stroke-based formats only.
                </p>
              </div>
              <Switch :disabled="!supportsSkins(form.format)" v-model="form.skinsEnabled" />
            </div>

            <Field v-if="form.skinsEnabled">
              <FieldLabel>Skins Mode</FieldLabel>
              <ToggleGroup v-model="form.skinsMode" type="single" class="gap-3">
                <ToggleGroupItem value="gross" class="rounded-full px-6">
                  Gross
                </ToggleGroupItem>
                <ToggleGroupItem value="net" class="rounded-full px-6">
                  Net
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Pre-Round Check</CardTitle>
          <CardDescription>
            The whole round is snapshotted locally when you start the competition.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <TrophyIcon class="size-4" />
                Format
              </p>
              <p class="mt-2 text-base font-medium">
                {{ getFormatLabel(form.format) }}
              </p>
            </div>
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <MapPinnedIcon class="size-4" />
                Course
              </p>
              <p class="mt-2 text-base font-medium">
                {{ selectedCourse?.clubName ?? 'Choose a course' }}
              </p>
            </div>
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <UsersRoundIcon class="size-4" />
                Selected players
              </p>
              <p class="mt-2 text-base font-medium">
                {{ selectedPlayers.length }}
              </p>
            </div>
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <CalculatorIcon class="size-4" />
                Allowance
              </p>
              <p class="mt-2 text-base font-medium">
                {{ getDefaultAllowanceRule(form.format).kind === 'percentage' ? `${form.allowancePercentage}%` : getDefaultAllowanceRule(form.format).label }}
              </p>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
            <p class="flex items-center gap-2 font-medium text-foreground">
              <CircleHelpIcon class="size-4 text-primary" />
              {{ validationMessage || 'Everything looks valid. Start the competition when you are ready.' }}
            </p>
          </div>

          <Button class="h-12 w-full rounded-full text-base" @click="createCompetition">
            Start Competition
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
