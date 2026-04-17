import { defineStore } from 'pinia'
import { db } from '@/lib/db'
import type { PlayerProfile } from '@/lib/golf'

interface PlayerDraft {
  id?: string
  name: string
  handicapIndex: number
  homeClub?: string
  notes?: string
}

export const usePlayersStore = defineStore('players', {
  state: () => ({
    hydrated: false,
    players: [] as PlayerProfile[],
  }),
  getters: {
    sortedPlayers(state) {
      return [...state.players].sort((left, right) => left.name.localeCompare(right.name))
    },
  },
  actions: {
    async hydrate() {
      if (this.hydrated) {
        return
      }

      this.players = await db.players.orderBy('name').toArray()
      this.hydrated = true
    },
    async savePlayer(draft: PlayerDraft) {
      const player: PlayerProfile = {
        id: draft.id ?? crypto.randomUUID(),
        name: draft.name.trim(),
        handicapIndex: Number(draft.handicapIndex),
        homeClub: draft.homeClub?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
      }

      await db.players.put(player)
      this.upsertLocal(player)

      return player
    },
    async deletePlayer(playerId: string) {
      await db.players.delete(playerId)
      this.players = this.players.filter((player) => player.id !== playerId)
    },
    upsertLocal(player: PlayerProfile) {
      const existingIndex = this.players.findIndex((entry) => entry.id === player.id)

      if (existingIndex >= 0) {
        this.players.splice(existingIndex, 1, player)
      } else {
        this.players.push(player)
      }
    },
  },
})
