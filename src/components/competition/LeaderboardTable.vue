<script setup lang="ts">
import type { CompetitionFormat, LeaderboardEntry } from '@/lib/golf'
import { formatLeaderboardHolesLogged, nb } from '@/locales/nb'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

defineProps<{
  entries: LeaderboardEntry[]
  format: CompetitionFormat
}>()

const copy = nb.leaderboard
</script>

<template>
  <div class="rounded-3xl border border-border/80 bg-card/60 p-2">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{{ copy.columns.position }}</TableHead>
          <TableHead>{{ copy.columns.name }}</TableHead>
          <TableHead>{{ copy.columns.gross }}</TableHead>
          <TableHead>{{ copy.columns.net }}</TableHead>
          <TableHead v-if="format === 'stableford' || format === 'fourball-stableford'">
            {{ copy.columns.points }}
          </TableHead>
          <TableHead v-else-if="format === 'match-play'">
            {{ copy.columns.match }}
          </TableHead>
          <TableHead v-else>
            {{ copy.columns.handicap }}
          </TableHead>
          <TableHead>{{ copy.columns.skins }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="entry in entries" :key="entry.id">
          <TableCell class="font-semibold">
            {{ entry.position }}
          </TableCell>
          <TableCell>
            <div class="flex flex-col">
              <span class="font-medium">{{ entry.label }}</span>
              <span class="text-xs text-muted-foreground">
                {{ formatLeaderboardHolesLogged(entry.holesPlayed) }}
              </span>
            </div>
          </TableCell>
          <TableCell>{{ entry.grossTotal }}</TableCell>
          <TableCell>{{ entry.netTotal }}</TableCell>
          <TableCell v-if="format === 'stableford' || format === 'fourball-stableford'">
            {{ entry.stablefordPoints }}
          </TableCell>
          <TableCell v-else-if="format === 'match-play'">
            {{ entry.matchStatus ?? copy.waitingForScores }}
          </TableCell>
          <TableCell v-else>
            {{ entry.playingHandicap }}
          </TableCell>
          <TableCell>
            {{ entry.skinsWon ?? 0 }}
          </TableCell>
        </TableRow>
        <TableEmpty v-if="entries.length === 0">
          {{ copy.empty }}
        </TableEmpty>
      </TableBody>
    </Table>
  </div>
</template>
