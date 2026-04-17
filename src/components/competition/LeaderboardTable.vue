<script setup lang="ts">
import type { CompetitionFormat, LeaderboardEntry } from '@/lib/golf'
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
</script>

<template>
  <div class="rounded-3xl border border-border/80 bg-card/60 p-2">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pos</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Gross</TableHead>
          <TableHead>Net</TableHead>
          <TableHead v-if="format === 'stableford' || format === 'fourball-stableford'">
            Points
          </TableHead>
          <TableHead v-else-if="format === 'match-play'">
            Match
          </TableHead>
          <TableHead v-else>
            Hcp
          </TableHead>
          <TableHead>Skins</TableHead>
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
                {{ entry.holesPlayed }} holes logged
              </span>
            </div>
          </TableCell>
          <TableCell>{{ entry.grossTotal }}</TableCell>
          <TableCell>{{ entry.netTotal }}</TableCell>
          <TableCell v-if="format === 'stableford' || format === 'fourball-stableford'">
            {{ entry.stablefordPoints }}
          </TableCell>
          <TableCell v-else-if="format === 'match-play'">
            {{ entry.matchStatus ?? 'Waiting for scores' }}
          </TableCell>
          <TableCell v-else>
            {{ entry.playingHandicap }}
          </TableCell>
          <TableCell>
            {{ entry.skinsWon ?? 0 }}
          </TableCell>
        </TableRow>
        <TableEmpty v-if="entries.length === 0">
          No leaderboard entries yet.
        </TableEmpty>
      </TableBody>
    </Table>
  </div>
</template>
