<script setup lang="ts">
import { reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { CourseDetail, PlayerProfile } from '@/lib/golf'
import { usePlayersStore } from '@/stores/players'
import { initials, teeDotClass, type PlayerSelection } from './shared'

const props = defineProps<{
  players: PlayerProfile[]
  selectedCourse?: CourseDetail
  selections: Record<string, PlayerSelection>
  isTeamCompetition: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle', id: string): void
  (event: 'selectionRemoved', id: string): void
}>()

const playersStore = usePlayersStore()

const newPlayerOpen = ref(false)
const newPlayer = reactive({ name: '', handicapIndex: 18.4 })

const editingPlayerId = ref<string | null>(null)
const editDraft = reactive({ name: '', handicapIndex: 0 })

function startEditPlayer(player: PlayerProfile) {
  editingPlayerId.value = player.id
  editDraft.name = player.name
  editDraft.handicapIndex = player.handicapIndex
  newPlayerOpen.value = false
}

function cancelEditPlayer() {
  editingPlayerId.value = null
}

async function saveEditPlayer() {
  if (!editingPlayerId.value) return
  if (!editDraft.name.trim()) {
    toast.error('Skriv inn et navn.')
    return
  }
  await playersStore.savePlayer({
    id: editingPlayerId.value,
    name: editDraft.name,
    handicapIndex: Number(editDraft.handicapIndex),
  })
  editingPlayerId.value = null
  toast.success('Spiller oppdatert.')
}

async function deleteEditPlayer() {
  if (!editingPlayerId.value) return
  const player = props.players.find((p) => p.id === editingPlayerId.value)
  const confirmed = window.confirm(player ? `Slette ${player.name}?` : 'Slette spiller?')
  if (!confirmed) return
  const id = editingPlayerId.value
  await playersStore.deletePlayer(id)
  emit('selectionRemoved', id)
  editingPlayerId.value = null
  toast.success('Spiller slettet.')
}

async function addInlinePlayer() {
  if (!newPlayer.name.trim()) {
    toast.error('Skriv inn et navn.')
    return
  }
  const saved = await playersStore.savePlayer({
    name: newPlayer.name,
    handicapIndex: Number(newPlayer.handicapIndex),
  })
  const defaultTeeId = props.selectedCourse?.tees[0]?.id ?? ''
  props.selections[saved.id] = { selected: true, teeId: defaultTeeId, sideId: 'side-1' }
  newPlayer.name = ''
  newPlayer.handicapIndex = 18.4
  newPlayerOpen.value = false
}
</script>

<template>
  <div class="mt-6">
    <p class="text-sm text-[color:var(--color-ink-soft)]">
      Velg hvem som spiller. Handicap-index og tee styrer slagfordelingen.
    </p>

    <div v-if="players.length > 0" class="mt-4 overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <div
        v-for="p in players"
        :key="p.id"
        class="border-b border-[color:var(--color-line-soft)] last:border-b-0"
      >
        <div v-if="editingPlayerId === p.id" class="p-4">
          <label class="block">
            <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Navn</span>
            <input
              v-model="editDraft.name"
              class="mt-1.5 w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-2.5 outline-none focus:border-[color:var(--color-accent)]"
            />
          </label>
          <label class="mt-3 block">
            <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Handicap-index</span>
            <input
              v-model.number="editDraft.handicapIndex"
              type="number"
              step="0.1"
              class="mt-1.5 w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-2.5 outline-none focus:border-[color:var(--color-accent)]"
            />
          </label>
          <div class="mt-3 flex gap-2">
            <button
              class="rounded-xl border border-[color:var(--color-clay)] px-3 py-2.5 text-sm text-[color:var(--color-clay)]"
              @click="deleteEditPlayer"
            >Slett</button>
            <button
              class="ml-auto rounded-xl border border-[color:var(--color-line)] px-4 py-2.5 text-sm"
              @click="cancelEditPlayer"
            >Avbryt</button>
            <button
              class="rounded-xl bg-[color:var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-bg)]"
              @click="saveEditPlayer"
            >Lagre</button>
          </div>
        </div>
        <template v-else>
          <div class="flex w-full items-center gap-3 px-4 py-3">
            <button class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="emit('toggle', p.id)">
              <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg)]">
                <span data-num class="text-[12px] font-semibold">{{ initials(p.name) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[15px] font-medium text-[color:var(--color-ink)]">{{ p.name }}</p>
                <p data-mono class="mt-0.5 text-[10px] text-[color:var(--color-ink-muted)]">
                  HCP-index {{ p.handicapIndex.toFixed(1) }}
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
            <button
              :aria-label="`Rediger ${p.name}`"
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] text-[color:var(--color-ink-soft)]"
              @click.stop="startEditPlayer(p)"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

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
        </template>
      </div>
    </div>

    <button
      class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[color:var(--color-line)] py-3 text-sm text-[color:var(--color-ink-soft)]"
      @click="newPlayerOpen = true"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      Legg til spiller
    </button>

    <div v-if="newPlayerOpen" class="mt-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <label class="block">
        <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Navn</span>
        <input
          v-model="newPlayer.name"
          class="mt-1.5 w-full rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-bg)] px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--color-accent)]"
        />
      </label>
      <label class="mt-3 block">
        <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Handicap-index</span>
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
        >Avbryt</button>
        <button
          class="flex-1 rounded-xl bg-[color:var(--color-accent)] py-2.5 text-sm font-semibold text-[color:var(--color-bg)]"
          @click="addInlinePlayer"
        >Lagre</button>
      </div>
    </div>
  </div>
</template>
