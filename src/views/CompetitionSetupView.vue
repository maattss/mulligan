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
import {
  PopoverArrow,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
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
  getFormatInfo,
  getFormatLabel,
  getFormatPlayerCountLabel,
  isValidPlayerCount,
  isTeamFormat,
  supportsSkins,
  type CompetitionFormat,
  type CompetitionSideGame,
  type SkinsMode,
} from '@/lib/golf'
import {
  formatAllowanceDescription,
  formatAutoAssignedSide,
  formatCourseHoleBadge,
  formatHandicapIndexBadge,
  formatInvalidPlayerCount,
  formatPercentageAllowanceLabel,
  formatPlayerCountSelection,
  getDefaultCompetitionName,
  getSkinsModeLabel,
  nb,
} from '@/locales/nb'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const router = useRouter()
const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const courses = getCourses()
const today = getTodayInputValue()
const copy = nb.competitionSetup

const form = reactive({
  name: getDefaultCompetitionName(today),
  date: today,
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
const formatCards = computed(() =>
  COMPETITION_FORMATS.map((format) => ({
    id: format,
    ...getFormatInfo(format),
    playerCountLabel: getFormatPlayerCountLabel(format),
  })),
)

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
    return copy.validation.selectCourse
  }

  if (!form.name.trim()) {
    return copy.validation.enterName
  }

  const playerCount = selectedPlayers.value.length

  if (playerCount === 0) {
    return formatPlayerCountSelection(form.format)
  }

  if (!isValidPlayerCount(form.format, playerCount)) {
    return formatInvalidPlayerCount(form.format)
  }

  if (isTeamCompetition.value) {
    const sideCounts = selectedPlayers.value.reduce<Record<string, number>>((counts, player) => {
      const sideId = selections[player.id]?.sideId
      counts[sideId] = (counts[sideId] ?? 0) + 1
      return counts
    }, {})

    if (!Object.values(sideCounts).every((count) => count === 2)) {
      return copy.validation.invalidTeams
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
    toast.error(copy.toasts.courseNotFound)
    return
  }

  const allowanceRule = getDefaultAllowanceRule(form.format)
  const finalAllowance = allowanceRule.kind === 'percentage'
    ? {
        ...allowanceRule,
        percentage: form.allowancePercentage / 100,
        label: formatPercentageAllowanceLabel(form.allowancePercentage),
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
  toast.success(copy.toasts.created)

  const summary = buildCompetitionSummary(competition)
  if (summary.leaderboard.length === 0) {
    toast.info(copy.toasts.roundReady)
  }

  await router.push(`/competitions/${competition.id}`)
}

function autoAssignSides() {
  if (!isTeamCompetition.value) {
    return
  }

  if (form.format === 'scramble-2' && selectedPlayers.value.length <= 2) {
    selectedPlayers.value.forEach((player) => {
      selections[player.id].sideId = 'side-1'
    })
    return
  }

  selectedPlayers.value.forEach((player, index) => {
    const sideNumber = Math.floor(index / 2) + 1
    selections[player.id].sideId = `side-${sideNumber}`
  })
}

function getTodayInputValue() {
  const date = new Date()
  const timezoneOffset = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10)
}
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
    <div class="space-y-6">
      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>{{ copy.basics.title }}</CardTitle>
          <CardDescription>
            {{ copy.basics.description }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel for="competition-name">
                {{ copy.basics.fields.name }}
              </FieldLabel>
              <Input id="competition-name" v-model="form.name" />
            </Field>

            <Field>
              <FieldLabel for="competition-date">
                {{ copy.basics.fields.date }}
              </FieldLabel>
              <Input id="competition-date" v-model="form.date" type="date" />
            </Field>
          </FieldGroup>

          <Field class="gap-3">
            <div class="flex items-center gap-2">
              <FieldLabel>{{ copy.basics.fields.format }}</FieldLabel>
              <PopoverRoot>
                <PopoverTrigger as-child>
                  <Button variant="ghost" size="icon" class="size-8 rounded-full text-muted-foreground">
                    <CircleHelpIcon class="size-4" />
                    <span class="sr-only">{{ copy.basics.formatHelp.srLabel }}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    :side-offset="10"
                    class="bg-popover text-popover-foreground z-50 w-[min(92vw,28rem)] rounded-2xl border border-border/80 p-4 shadow-xl outline-none"
                  >
                    <div class="space-y-4">
                      <div>
                        <p class="text-sm font-semibold">{{ copy.basics.formatHelp.title }}</p>
                        <p class="mt-1 text-sm text-muted-foreground">
                          {{ copy.basics.formatHelp.description }}
                        </p>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="format in formatCards"
                          :key="format.id"
                          class="rounded-2xl border border-border/70 bg-background/80 p-3"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <p class="font-medium">{{ format.label }}</p>
                            <Badge variant="outline" class="rounded-full text-xs">
                              {{ format.playerCountLabel }}
                            </Badge>
                          </div>
                          <p class="mt-2 text-sm text-foreground/90">{{ format.summary }}</p>
                          <p class="mt-1 text-sm text-muted-foreground">{{ format.details }}</p>
                        </div>
                      </div>
                    </div>
                    <PopoverArrow class="fill-popover" />
                  </PopoverContent>
                </PopoverPortal>
              </PopoverRoot>
            </div>
            <ToggleGroup v-model="form.format" type="single" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleGroupItem
                v-for="format in formatCards"
                :key="format.id"
                :value="format.id"
                class="h-auto min-h-20 rounded-2xl border border-border/70 px-4 py-4 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/10"
              >
                <div class="flex flex-col items-start gap-2">
                  <span class="font-medium">{{ format.label }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ format.playerCountLabel }}
                  </span>
                </div>
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field class="gap-3">
            <FieldLabel>{{ copy.basics.fields.holes }}</FieldLabel>
            <ToggleGroup v-model="form.holes" type="single" class="gap-3">
              <ToggleGroupItem :value="9" class="rounded-full px-6">
                {{ copy.basics.holeOptions.nine }}
              </ToggleGroupItem>
              <ToggleGroupItem :value="18" class="rounded-full px-6">
                {{ copy.basics.holeOptions.eighteen }}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field v-if="getDefaultAllowanceRule(form.format).kind === 'percentage'">
            <FieldLabel for="allowance-percentage">
              {{ copy.basics.fields.allowancePercentage }}
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
              {{ formatAllowanceDescription(getDefaultAllowanceRule(form.format).label) }}
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>{{ copy.course.title }}</CardTitle>
          <CardDescription>
            {{ copy.course.description }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <Field>
            <FieldLabel>{{ copy.course.fieldLabel }}</FieldLabel>
            <Select v-model="form.courseId">
              <SelectTrigger>
                <SelectValue :placeholder="copy.course.placeholder" />
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
                  {{ copy.course.snapshotLabel }}
                </p>
                <h3 class="mt-2 text-lg font-semibold">
                  {{ selectedCourse.clubName }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ selectedCourse.courseName }} · {{ selectedCourse.city }}, {{ selectedCourse.region }}
                </p>
              </div>
              <Badge variant="secondary" class="rounded-full">
                {{ formatCourseHoleBadge(selectedCourse.holes) }}
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
          <CardTitle>{{ copy.players.title }}</CardTitle>
          <CardDescription>
            {{ copy.players.description }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <Empty v-if="playersStore.sortedPlayers.length === 0" class="rounded-[1.5rem] border-border/80 bg-background/70">
            <EmptyHeader>
              <EmptyTitle>{{ copy.players.emptyTitle }}</EmptyTitle>
              <EmptyDescription>
                {{ copy.players.emptyDescription }}
              </EmptyDescription>
            </EmptyHeader>
            <Button as-child variant="outline" class="rounded-full">
              <RouterLink to="/players">
                <UsersRoundIcon data-icon="inline-start" />
                {{ copy.players.emptyAction }}
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
                      {{ player.homeClub ?? copy.players.homeClubFallback }}
                    </p>
                  </div>
                  <Badge variant="secondary" class="rounded-full">
                    {{ formatHandicapIndexBadge(player.handicapIndex) }}
                  </Badge>
                </div>

                <div class="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/40 px-4 py-3">
                  <div>
                    <p class="font-medium">{{ copy.players.includeTitle }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ copy.players.includeDescription }}
                    </p>
                  </div>
                  <Switch v-model="selections[player.id].selected" />
                </div>

                <div v-if="selections[player.id].selected" class="grid gap-3">
                  <Field>
                    <FieldLabel>{{ copy.players.teeLabel }}</FieldLabel>
                    <Select v-model="selections[player.id].teeId">
                      <SelectTrigger>
                        <SelectValue :placeholder="copy.players.teePlaceholder" />
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
                    {{ formatAutoAssignedSide(selections[player.id].sideId) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div class="space-y-4 rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-medium">{{ copy.skins.title }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ copy.skins.description }}
                </p>
              </div>
              <Switch :disabled="!supportsSkins(form.format)" v-model="form.skinsEnabled" />
            </div>

            <Field v-if="form.skinsEnabled">
              <FieldLabel>{{ copy.skins.modeLabel }}</FieldLabel>
              <ToggleGroup v-model="form.skinsMode" type="single" class="gap-3">
                <ToggleGroupItem value="gross" class="rounded-full px-6">
                  {{ getSkinsModeLabel('gross') }}
                </ToggleGroupItem>
                <ToggleGroupItem value="net" class="rounded-full px-6">
                  {{ getSkinsModeLabel('net') }}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>{{ copy.preRound.title }}</CardTitle>
          <CardDescription>
            {{ copy.preRound.description }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <TrophyIcon class="size-4" />
                {{ copy.preRound.cards.format }}
              </p>
              <p class="mt-2 text-base font-medium">
                {{ getFormatLabel(form.format) }}
              </p>
            </div>
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <MapPinnedIcon class="size-4" />
                {{ copy.preRound.cards.course }}
              </p>
              <p class="mt-2 text-base font-medium">
                {{ selectedCourse?.clubName ?? copy.preRound.courseFallback }}
              </p>
            </div>
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <UsersRoundIcon class="size-4" />
                {{ copy.preRound.cards.selectedPlayers }}
              </p>
              <p class="mt-2 text-base font-medium">
                {{ selectedPlayers.length }}
              </p>
            </div>
            <div class="rounded-2xl border border-border/80 bg-background/70 p-4">
              <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                <CalculatorIcon class="size-4" />
                {{ copy.preRound.cards.allowance }}
              </p>
              <p class="mt-2 text-base font-medium">
                {{ getDefaultAllowanceRule(form.format).kind === 'percentage' ? `${form.allowancePercentage}%` : getDefaultAllowanceRule(form.format).label }}
              </p>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
            <p class="flex items-center gap-2 font-medium text-foreground">
              <CircleHelpIcon class="size-4 text-primary" />
              {{ validationMessage || copy.preRound.validMessage }}
            </p>
          </div>

          <Button class="h-12 w-full rounded-full text-base" @click="createCompetition">
            {{ copy.preRound.action }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
