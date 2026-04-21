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
import { formatPlayerRemovedToast, nb } from '@/locales/nb'
import { usePlayersStore } from '@/stores/players'

const playersStore = usePlayersStore()
const copy = nb.playersView

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
  toast.success(payload.id ? copy.toasts.updated : copy.toasts.added)
}

async function removePlayer(player: PlayerProfile) {
  await playersStore.deletePlayer(player.id)
  toast.success(formatPlayerRemovedToast(player.name))
}
</script>

<template>
  <div class="space-y-6">
    <Card class="rounded-[1.75rem] border-border/80 bg-card/70 backdrop-blur">
      <CardHeader class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>{{ copy.title }}</CardTitle>
          <CardDescription>
            {{ copy.description }}
          </CardDescription>
        </div>

        <Button class="rounded-full" @click="createPlayer">
          <PlusIcon data-icon="inline-start" />
          {{ copy.addPlayer }}
        </Button>
      </CardHeader>
      <CardContent>
        <Empty v-if="playersStore.sortedPlayers.length === 0" class="min-h-80 rounded-[1.5rem] border-border/80 bg-background/70">
          <EmptyHeader>
            <EmptyTitle>{{ copy.emptyTitle }}</EmptyTitle>
            <EmptyDescription>
              {{ copy.emptyDescription }}
            </EmptyDescription>
          </EmptyHeader>
          <Button class="rounded-full" @click="createPlayer">
            <PlusIcon data-icon="inline-start" />
            {{ copy.emptyAction }}
          </Button>
        </Empty>

        <div v-else class="rounded-3xl border border-border/80 bg-background/65 p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ copy.table.player }}</TableHead>
                <TableHead>{{ copy.table.handicap }}</TableHead>
                <TableHead>{{ copy.table.homeClub }}</TableHead>
                <TableHead>{{ copy.table.notes }}</TableHead>
                <TableHead class="text-right">
                  {{ copy.table.actions }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="player in playersStore.sortedPlayers" :key="player.id">
                <TableCell>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ player.name }}</span>
                    <span class="text-xs text-muted-foreground">
                      {{ copy.table.snapshotReady }}
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
