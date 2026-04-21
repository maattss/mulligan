import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LeaderboardTable from './LeaderboardTable.vue'
import type { LeaderboardEntry } from '@/lib/golf'

const baseEntry: LeaderboardEntry = {
  id: 'p1',
  label: 'Alice',
  entityType: 'player',
  grossTotal: 78,
  netTotal: 72,
  stablefordPoints: 36,
  holesPlayed: 18,
  courseHandicap: 6,
  playingHandicap: 6,
  relativeHandicap: 6,
  position: 1,
  skinsWon: 2,
}

describe('LeaderboardTable', () => {
  it('renders the empty state when no entries are provided', () => {
    const wrapper = mount(LeaderboardTable, {
      props: { entries: [], format: 'stroke' },
    })
    expect(wrapper.text()).toContain('Ingen resultater ennå.')
  })

  it('renders position, gross, net and skins for stroke play', () => {
    const wrapper = mount(LeaderboardTable, {
      props: {
        entries: [baseEntry],
        format: 'stroke',
      },
    })
    const text = wrapper.text()
    expect(text).toContain('Alice')
    expect(text).toContain('78')
    expect(text).toContain('72')
    expect(text).toContain('2')
    expect(wrapper.find('thead').text()).toContain('Brutto')
    expect(wrapper.find('thead').text()).toContain('Netto')
    expect(wrapper.find('thead').text()).toContain('Hcp')
  })

  it('shows the points column for stableford', () => {
    const wrapper = mount(LeaderboardTable, {
      props: {
        entries: [baseEntry],
        format: 'stableford',
      },
    })
    expect(wrapper.find('thead').text()).toContain('Poeng')
    expect(wrapper.text()).toContain('36')
  })

  it('shows the match status column for match play', () => {
    const wrapper = mount(LeaderboardTable, {
      props: {
        entries: [{ ...baseEntry, matchStatus: 'Leder 2 up etter 12 hull' }],
        format: 'match-play',
      },
    })
    expect(wrapper.find('thead').text()).toContain('Match')
    expect(wrapper.text()).toContain('Leder 2 up etter 12 hull')
  })
})
