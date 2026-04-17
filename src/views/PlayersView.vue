<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { PencilLineIcon, PlusIcon, Trash2Icon } from 'lucide-vue-next'
import PlayerDialog from '@/components/players/PlayerDialog.vue'
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
import type { PlayerProfile } from '@/lib/golf'
import { usePlayersStore } from '@/stores/players'

const playersStore = usePlayersStore()

const dialogOpen = ref(false)
const editingPlayer = ref<PlayerProfile | null>(null)

function createPlayer() {
  editingPlayer.value = null
  dialogOpen.value = true
}

function editPlayer(player: PlayerProfile) {
  editingPlayer.value = player
  dialogOpen.value = true
}

async function savePlayer(payload: {
  id?: string
  name: string
  handicapIndex: number
  homeClub?: string
  notes?: string
}) {
  await playersStore.savePlayer(payload)
  toast.success(payload.id ? 'Player updated.' : 'Player added.')
}

async function removePlayer(player: PlayerProfile) {
  await playersStore.deletePlayer(player.id)
  toast.success(`${player.name} removed.`)
}
</script>

<template>
  <div class="space-y-6">
    <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
      <CardHeader class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>Local Player Profiles</CardTitle>
          <CardDescription>
            Each profile stores the handicap and notes that get copied into a competition snapshot.
          </CardDescription>
        </div>

        <Button class="rounded-full" @click="createPlayer">
          <PlusIcon data-icon="inline-start" />
          Add Player
        </Button>
      </CardHeader>
      <CardContent>
        <Empty v-if="playersStore.sortedPlayers.length === 0" class="min-h-80 rounded-[1.5rem] border-border/80 bg-background/70">
          <EmptyHeader>
            <EmptyTitle>No players saved yet</EmptyTitle>
            <EmptyDescription>
              Create a few buddies first so the competition setup can pull names and handicaps straight into the round snapshot.
            </EmptyDescription>
          </EmptyHeader>
          <Button class="rounded-full" @click="createPlayer">
            <PlusIcon data-icon="inline-start" />
            Add the first player
          </Button>
        </Empty>

        <div v-else class="rounded-3xl border border-border/80 bg-background/65 p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Handicap</TableHead>
                <TableHead>Home Club</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead class="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="player in playersStore.sortedPlayers" :key="player.id">
                <TableCell>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ player.name }}</span>
                    <span class="text-xs text-muted-foreground">
                      Snapshot ready for local competitions
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" class="rounded-full">
                    {{ player.handicapIndex.toFixed(1) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  {{ player.homeClub ?? '—' }}
                </TableCell>
                <TableCell class="max-w-sm text-sm text-muted-foreground">
                  {{ player.notes ?? '—' }}
                </TableCell>
                <TableCell>
                  <div class="flex justify-end gap-2">
                    <Button variant="outline" size="icon" class="rounded-full" @click="editPlayer(player)">
                      <PencilLineIcon />
                    </Button>
                    <Button variant="outline" size="icon" class="rounded-full" @click="removePlayer(player)">
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <PlayerDialog
      v-model:open="dialogOpen"
      :player="editingPlayer"
      @save="savePlayer"
    />
  </div>
</template>
