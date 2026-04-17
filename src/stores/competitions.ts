import { defineStore } from 'pinia'
import { db } from '@/lib/db'
import type { Competition } from '@/lib/golf'

export const useCompetitionsStore = defineStore('competitions', {
  state: () => ({
    hydrated: false,
    competitions: [] as Competition[],
  }),
  getters: {
    sortedCompetitions(state) {
      return [...state.competitions].sort((left, right) => right.date.localeCompare(left.date))
    },
  },
  actions: {
    async hydrate() {
      if (this.hydrated) {
        return
      }

      this.competitions = await db.competitions.orderBy('date').reverse().toArray()
      this.hydrated = true
    },
    async saveCompetition(competition: Competition) {
      await db.competitions.put(competition)
      this.upsertLocal(competition)
    },
    async deleteCompetition(competitionId: string) {
      await db.competitions.delete(competitionId)
      this.competitions = this.competitions.filter((competition) => competition.id !== competitionId)
    },
    findCompetition(competitionId: string) {
      return this.competitions.find((competition) => competition.id === competitionId)
    },
    upsertLocal(competition: Competition) {
      const existingIndex = this.competitions.findIndex((entry) => entry.id === competition.id)

      if (existingIndex >= 0) {
        this.competitions.splice(existingIndex, 1, competition)
      } else {
        this.competitions.push(competition)
      }
    },
  },
})
