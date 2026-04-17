import Dexie, { type Table } from 'dexie'
import type { Competition, PlayerProfile } from '@/lib/golf'

class MulliganDatabase extends Dexie {
  players!: Table<PlayerProfile, string>
  competitions!: Table<Competition, string>

  constructor() {
    super('mulligan')

    this.version(1).stores({
      players: 'id, name, handicapIndex',
      competitions: 'id, date, status, format',
    })
  }
}

export const db = new MulliganDatabase()
