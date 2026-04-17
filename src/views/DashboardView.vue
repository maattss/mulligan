<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  FlagIcon,
  FolderPlusIcon,
  MapPinnedIcon,
  MedalIcon,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCatalogMetadata } from '@/lib/course-catalog'
import { getFormatLabel } from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const catalogMeta = getCatalogMetadata()

const activeCompetitions = computed(() =>
  competitionsStore.sortedCompetitions.filter((competition) => competition.status === 'in_progress'),
)

const recentCompetitions = computed(() => competitionsStore.sortedCompetitions.slice(0, 6))

const statCards = computed(() => [
  {
    label: 'Player Profiles',
    value: playersStore.players.length,
    hint: 'Handicap snapshots ready for reuse.',
    icon: UsersRoundIcon,
  },
  {
    label: 'Active Competitions',
    value: activeCompetitions.value.length,
    hint: 'Rounds that can be resumed offline.',
    icon: MedalIcon,
  },
  {
    label: 'Bundled Courses',
    value: catalogMeta.totalCourses,
    hint: 'Seeded Bergen and Stavanger catalog.',
    icon: MapPinnedIcon,
  },
])
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Card class="overflow-hidden rounded-[2rem] border-border/80 bg-[linear-gradient(135deg,_rgba(15,81,50,0.95),_rgba(31,122,88,0.92)_55%,_rgba(230,199,126,0.84))] text-primary-foreground shadow-2xl shadow-primary/12">
        <CardHeader class="gap-4 pb-0">
          <Badge variant="secondary" class="w-fit rounded-full bg-white/14 text-white hover:bg-white/14">
            Offline-first scorer
          </Badge>
          <div class="max-w-2xl space-y-3">
            <CardTitle class="text-3xl leading-tight md:text-4xl">
              Keep the round moving with one clean scorekeeper screen.
            </CardTitle>
            <CardDescription class="text-base text-white/80">
              Manage local players, start handicap-aware competitions from the bundled course catalog, and keep every round live without relying on signal.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent class="flex flex-col gap-4 pt-8 md:flex-row md:items-center md:justify-between">
          <div class="grid gap-2 text-sm text-white/85">
            <p class="flex items-center gap-2">
              <FlagIcon class="size-4" />
              {{ catalogMeta.totalCourses }} course setups seeded locally
            </p>
            <p class="flex items-center gap-2">
              <UsersRoundIcon class="size-4" />
              {{ playersStore.players.length || 'No' }} saved player profiles
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button as-child variant="secondary" class="rounded-full">
              <RouterLink to="/competitions/new">
                <FolderPlusIcon data-icon="inline-start" />
                Start Competition
              </RouterLink>
            </Button>
            <Button as-child variant="outline" class="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <RouterLink to="/players">
                <UsersRoundIcon data-icon="inline-start" />
                Manage Players
              </RouterLink>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4">
        <Card
          v-for="stat in statCards"
          :key="stat.label"
          class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur"
        >
          <CardHeader class="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardDescription>{{ stat.label }}</CardDescription>
              <CardTitle class="mt-2 text-3xl">
                {{ stat.value }}
              </CardTitle>
            </div>
            <div class="rounded-2xl bg-primary/10 p-3 text-primary">
              <component :is="stat.icon" class="size-5" />
            </div>
          </CardHeader>
          <CardContent class="text-sm text-muted-foreground">
            {{ stat.hint }}
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Recent Competitions</CardTitle>
          <CardDescription>
            Resume live rounds or reopen completed leaderboards from local storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty v-if="recentCompetitions.length === 0" class="min-h-72 rounded-[1.5rem] border-border/80 bg-background/70">
            <EmptyHeader>
              <EmptyTitle>No rounds yet</EmptyTitle>
              <EmptyDescription>
                Build your player list first, then start a competition from the local course catalog.
              </EmptyDescription>
            </EmptyHeader>
            <Button as-child class="rounded-full">
              <RouterLink to="/competitions/new">
                <FolderPlusIcon data-icon="inline-start" />
                Create the first competition
              </RouterLink>
            </Button>
          </Empty>

          <div v-else class="rounded-3xl border border-border/80 bg-background/65 p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competition</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="competition in recentCompetitions"
                  :key="competition.id"
                  class="cursor-pointer"
                  @click="$router.push(`/competitions/${competition.id}`)"
                >
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ competition.name }}</span>
                      <span class="text-xs text-muted-foreground">
                        {{ new Date(competition.date).toLocaleDateString() }}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{{ getFormatLabel(competition.format) }}</TableCell>
                  <TableCell>{{ competition.courseSnapshot.clubName }}</TableCell>
                  <TableCell>
                    <Badge :variant="competition.status === 'completed' ? 'secondary' : 'default'">
                      {{ competition.status === 'completed' ? 'Completed' : 'Live' }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            The app is optimized for one scorer managing the whole group from a single phone.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="rounded-3xl border border-border/80 bg-background/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              1. Build the lineup
            </p>
            <p class="mt-2 text-sm text-muted-foreground">
              Save your buddies with a current Handicap Index and optional home-club notes.
            </p>
          </div>
          <div class="rounded-3xl border border-border/80 bg-background/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              2. Start from the local catalog
            </p>
            <p class="mt-2 text-sm text-muted-foreground">
              Choose a bundled Bergen or Stavanger course, assign tees per player, and snapshot the whole round.
            </p>
          </div>
          <div class="rounded-3xl border border-border/80 bg-background/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              3. Score hole-by-hole
            </p>
            <p class="mt-2 text-sm text-muted-foreground">
              Keep gross scores live, let the app handle net logic, side formats, and skins, then finish the round when you are done.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
