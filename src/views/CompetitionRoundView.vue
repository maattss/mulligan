<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCheckIcon,
  FlagIcon,
  TrophyIcon,
} from 'lucide-vue-next'
import LeaderboardTable from '@/components/competition/LeaderboardTable.vue'
import ScoreControl from '@/components/competition/ScoreControl.vue'
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  getFormatLabel,
  isTeamFormat,
  type Competition,
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

const holeDetails = computed(() =>
  competition.value ? buildHoleDetails(competition.value.players[0]?.teeSnapshot ?? competition.value.courseSnapshot.tees[0]) : [],
)

const currentHoleIndex = computed(() =>
  Math.max(0, (competition.value?.currentHole ?? 1) - 1),
)

const currentHole = computed(() => holeDetails.value[currentHoleIndex.value])

const scoreEntities = computed(() => {
  const current = competition.value

  if (!current) {
    return []
  }

  if (current.format === 'scramble-2') {
    return current.sides.map((side) => ({
      id: side.id,
      label: side.name,
      subtitle: current.players
        .filter((player) => player.sideId === side.id)
        .map((player) => player.displayName)
        .join(' / '),
      badge: `PH ${side.playingHandicap ?? 0}`,
      value: current.scores.sideScores[side.id]?.[currentHoleIndex.value] ?? null,
      par: current.players[0]?.teeSnapshot.holePars[currentHoleIndex.value] ?? 4,
      update: (value: number | null) => updateSideScore(side.id, value),
    }))
  }

  return current.players.map((player) => ({
    id: player.id,
    label: player.displayName,
    subtitle: `${player.teeSnapshot.name} tee${player.sideId ? ` · ${player.sideId.replace('-', ' ')}` : ''}`,
    badge: `PH ${player.playingHandicap}`,
    value: current.scores.playerScores[player.id]?.[currentHoleIndex.value] ?? null,
    par: player.teeSnapshot.holePars[currentHoleIndex.value] ?? 4,
    update: (value: number | null) => updatePlayerScore(player.id, value),
  }))
})

async function mutateCompetition(mutator: (draft: Competition) => void) {
  if (!competition.value) {
    return
  }

  const draft = structuredClone(competition.value)
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

async function stepHole(delta: number) {
  if (!competition.value) {
    return
  }

  const nextHole = Math.min(competition.value.holes, Math.max(1, competition.value.currentHole + delta))
  await setCurrentHole(nextHole)
}

async function toggleCompletion() {
  if (!competition.value) {
    return
  }

  await mutateCompetition((draft) => {
    draft.status = draft.status === 'completed' ? 'in_progress' : 'completed'
  })

  toast.success(competition.value.status === 'completed' ? 'Competition reopened.' : 'Competition marked complete.')
}
</script>

<template>
  <div v-if="!competition" class="space-y-6">
    <Empty class="min-h-[55svh] rounded-[2rem] border-border/80 bg-card/70 backdrop-blur">
      <EmptyHeader>
        <EmptyTitle>Competition not found</EmptyTitle>
        <EmptyDescription>
          The requested local round could not be loaded from IndexedDB.
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" class="rounded-full" @click="router.push('/')">
        Back to scoreboard
      </Button>
    </Empty>
  </div>

  <div v-else class="space-y-6">
    <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
      <CardHeader class="gap-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" class="rounded-full">
                {{ competition.status === 'completed' ? 'Completed' : 'Live round' }}
              </Badge>
              <Badge variant="outline" class="rounded-full">
                {{ getFormatLabel(competition.format) }}
              </Badge>
              <Badge variant="outline" class="rounded-full">
                {{ competition.courseSnapshot.clubName }}
              </Badge>
            </div>

            <div>
              <CardTitle class="text-3xl">
                {{ competition.name }}
              </CardTitle>
              <CardDescription class="mt-2 text-base">
                {{ new Date(competition.date).toLocaleDateString() }} · {{ competition.holes }} holes · {{ competition.players.length }} players
              </CardDescription>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button variant="outline" class="rounded-full" @click="toggleCompletion">
              <CheckCheckIcon data-icon="inline-start" />
              {{ competition.status === 'completed' ? 'Reopen round' : 'Mark complete' }}
            </Button>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              Current hole
            </p>
            <p class="mt-2 text-3xl font-semibold">
              {{ competition.currentHole }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ currentHole ? `Par ${currentHole.par} · SI ${currentHole.strokeIndex}` : 'Select a hole to score.' }}
            </p>
          </div>
          <div class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              Completed holes
            </p>
            <p class="mt-2 text-3xl font-semibold">
              {{ summary?.completeHoles ?? 0 }}
            </p>
            <p class="text-sm text-muted-foreground">
              All selected scorecards entered through this point.
            </p>
          </div>
          <div class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              Side games
            </p>
            <p class="mt-2 text-3xl font-semibold">
              {{ competition.sideGames.length }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ competition.sideGames.length > 0 ? 'Skins results update live as you score.' : 'No side game attached to this round.' }}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <ScrollArea class="w-full">
          <div class="flex gap-2 pb-3">
            <Button
              v-for="hole in holeDetails"
              :key="hole.number"
              :variant="competition.currentHole === hole.number ? 'default' : 'outline'"
              class="min-w-14 rounded-full"
              @click="setCurrentHole(hole.number)"
            >
              {{ hole.number }}
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div class="flex justify-between gap-3">
          <Button variant="outline" class="rounded-full" :disabled="competition.currentHole === 1" @click="stepHole(-1)">
            <ArrowLeftIcon data-icon="inline-start" />
            Previous Hole
          </Button>
          <Button variant="outline" class="rounded-full" :disabled="competition.currentHole === competition.holes" @click="stepHole(1)">
            Next Hole
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>

    <Tabs default-value="score" class="space-y-4">
      <TabsList class="w-full justify-start rounded-full bg-card/80 p-1">
        <TabsTrigger value="score" class="rounded-full px-5">
          Score
        </TabsTrigger>
        <TabsTrigger value="leaderboard" class="rounded-full px-5">
          Leaderboard
        </TabsTrigger>
        <TabsTrigger value="side-games" class="rounded-full px-5">
          Side Games
        </TabsTrigger>
      </TabsList>

      <TabsContent value="score" class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <ScoreControl
            v-for="entity in scoreEntities"
            :key="entity.id"
            :label="entity.label"
            :subtitle="entity.subtitle"
            :badge="entity.badge"
            :value="entity.value"
            :par="entity.par"
            @update="entity.update"
          />
        </div>
      </TabsContent>

      <TabsContent value="leaderboard" class="space-y-4">
        <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <TrophyIcon class="size-5 text-primary" />
              Live Leaderboard
            </CardTitle>
            <CardDescription>
              Gross totals, net results, stableford points, and skins all update from the current hole scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable :entries="summary?.leaderboard ?? []" :format="competition.format" />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="side-games" class="space-y-4">
        <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <FlagIcon class="size-5 text-primary" />
              Side Games
            </CardTitle>
            <CardDescription>
              Score-derived side game summaries live next to the round without any extra event tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Empty v-if="!summary?.skins" class="rounded-[1.5rem] border-border/80 bg-background/70">
              <EmptyHeader>
                <EmptyTitle>No side game attached</EmptyTitle>
                <EmptyDescription>
                  Turn on skins during setup if you want gross or net hole winners to carry alongside the main leaderboard.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>

            <div v-else class="space-y-4">
              <div class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4">
                <p class="text-sm text-muted-foreground">
                  Skins mode: <span class="font-medium text-foreground">{{ summary.skins.mode }}</span>
                </p>
              </div>

              <div class="rounded-3xl border border-border/80 bg-background/65 p-2">
                <LeaderboardTable :entries="summary.leaderboard.filter((entry) => (entry.skinsWon ?? 0) > -1)" :format="competition.format" />
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div
                  v-for="hole in summary.skins.holes"
                  :key="hole.hole"
                  class="rounded-[1.5rem] border border-border/80 bg-background/70 p-4"
                >
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                    Hole {{ hole.hole }}
                  </p>
                  <p class="mt-2 text-base font-medium">
                    {{ hole.winnerLabel ?? 'Carryover' }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{ hole.winnerLabel ? `${hole.carryValue} skin(s) won with ${hole.winningScore}` : `${hole.carryValue} skin(s) roll to the next hole` }}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
