import { describe, expect, it } from 'vitest'
import {
  buildCompetitionSummary,
  buildHoleDetails,
  computeCourseHandicap,
  computeCourseHandicapUnrounded,
  computePlayingHandicap,
  computeScrambleSideHandicap,
  createCompetitionFromSetup,
  createEmptyScoreArray,
  getDefaultAllowanceRule,
  getFormatInfo,
  getFormatPlayerCountLabel,
  getNetScore,
  getStablefordPoints,
  getStrokeAdjustments,
  isTeamFormat,
  isValidPlayerCount,
  resolveCompleteHoles,
  roundHandicap,
  supportsSkins,
  trimTeeForCompetition,
  type AllowanceRuleSnapshot,
  type CompetitionPlayer,
  type CompetitionSetupInput,
  type CourseDetail,
  type PlayerProfile,
  type TeeSet,
} from './golf'

const blackTee: TeeSet = {
  id: 'demo-black',
  name: 'Black',
  color: 'black',
  par: 72,
  courseRating: 72.5,
  slopeRating: 128,
  yardage: 6800,
  holePars:       [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4],
  strokeIndexes:  [9, 3, 15, 1, 7, 13, 17, 5, 11, 10, 2, 16, 8, 14, 6, 18, 4, 12],
  holeYardages:   [380, 420, 175, 520, 370, 400, 165, 540, 390, 405, 535, 185, 420, 365, 430, 170, 540, 390],
}

const yellowTee: TeeSet = {
  id: 'demo-yellow',
  name: 'Yellow',
  color: 'yellow',
  par: 72,
  courseRating: 70.0,
  slopeRating: 119,
  yardage: 6300,
  holePars:       [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4],
  strokeIndexes:  [9, 3, 15, 1, 7, 13, 17, 5, 11, 10, 2, 16, 8, 14, 6, 18, 4, 12],
  holeYardages:   [355, 395, 160, 490, 345, 375, 150, 510, 365, 380, 510, 170, 395, 340, 405, 155, 510, 365],
}

const demoCourse: CourseDetail = {
  id: 'demo',
  clubName: 'Demo GC',
  courseName: 'Demo Course',
  city: 'Bergen',
  region: 'Vestland',
  country: 'Norway',
  holes: 18,
  tees: [blackTee, yellowTee],
}

function par72Scores(score: number) {
  return blackTee.holePars.map((par) => par + score)
}

describe('roundHandicap', () => {
  it('rounds positive handicaps with standard half-up', () => {
    expect(roundHandicap(20.4)).toBe(20)
    expect(roundHandicap(20.5)).toBe(21)
    expect(roundHandicap(0)).toBe(0)
  })

  it('rounds plus handicaps using absolute value then negates', () => {
    expect(roundHandicap(-1.4)).toBe(-1)
    expect(roundHandicap(-1.5)).toBe(-2)
  })
})

describe('computeCourseHandicap', () => {
  it('uses the USGA formula HI * (slope/113) + (courseRating - par)', () => {
    expect(computeCourseHandicapUnrounded(18, blackTee)).toBeCloseTo(18 * (128 / 113) + 0.5, 4)
    expect(computeCourseHandicap(18, blackTee)).toBe(21)
  })

  it('handles the easier yellow tee', () => {
    expect(computeCourseHandicap(18, yellowTee)).toBe(17)
  })

  it('handles plus handicaps', () => {
    expect(computeCourseHandicap(-2, blackTee)).toBe(-2)
  })
})

describe('computePlayingHandicap', () => {
  it('applies a percentage allowance', () => {
    const allowance: AllowanceRuleSnapshot = { kind: 'percentage', percentage: 0.85, label: '85%' }
    expect(computePlayingHandicap(18, blackTee, allowance)).toBe(18)
  })

  it('returns the unmodified rounded course handicap for scramble pair allowances', () => {
    const allowance: AllowanceRuleSnapshot = {
      kind: 'scramble-pair',
      lowPercentage: 0.35,
      highPercentage: 0.15,
      label: '35/15',
    }
    expect(computePlayingHandicap(18, blackTee, allowance)).toBe(21)
  })
})

describe('computeScrambleSideHandicap', () => {
  it('weights the lower handicap at 35% and the higher at 15%', () => {
    const players: CompetitionPlayer[] = [
      { ...stubPlayer(), playingHandicap: 4 },
      { ...stubPlayer(), playingHandicap: 18 },
    ]
    const allowance: AllowanceRuleSnapshot = {
      kind: 'scramble-pair',
      lowPercentage: 0.35,
      highPercentage: 0.15,
      label: '35/15',
    }
    expect(computeScrambleSideHandicap(players, allowance)).toBe(roundHandicap(4 * 0.35 + 18 * 0.15))
  })
})

describe('getStrokeAdjustments', () => {
  it('returns zero strokes for scratch', () => {
    expect(getStrokeAdjustments(0, blackTee.strokeIndexes)).toEqual(Array(18).fill(0))
  })

  it('allocates one stroke per hole when handicap equals hole count', () => {
    expect(getStrokeAdjustments(18, blackTee.strokeIndexes)).toEqual(Array(18).fill(1))
  })

  it('extra strokes follow stroke index order for partial allocations', () => {
    const adjustments = getStrokeAdjustments(20, blackTee.strokeIndexes)
    expect(adjustments).toHaveLength(18)
    expect(adjustments.reduce((total, value) => total + value, 0)).toBe(20)
    const indexOfSI1 = blackTee.strokeIndexes.indexOf(1)
    const indexOfSI2 = blackTee.strokeIndexes.indexOf(2)
    const indexOfSI3 = blackTee.strokeIndexes.indexOf(3)
    expect(adjustments[indexOfSI1]).toBe(2)
    expect(adjustments[indexOfSI2]).toBe(2)
    expect(adjustments[indexOfSI3]).toBe(1)
  })

  it('plus handicaps subtract strokes from the highest stroke indexes', () => {
    const adjustments = getStrokeAdjustments(-2, blackTee.strokeIndexes)
    expect(adjustments.reduce((total, value) => total + value, 0)).toBe(-2)
    expect(adjustments[blackTee.strokeIndexes.indexOf(18)]).toBe(-1)
    expect(adjustments[blackTee.strokeIndexes.indexOf(17)]).toBe(-1)
    expect(Math.abs(adjustments[blackTee.strokeIndexes.indexOf(16)])).toBe(0)
  })
})

describe('getNetScore', () => {
  it('subtracts the adjustment from the gross score', () => {
    expect(getNetScore(5, 1)).toBe(4)
    expect(getNetScore(null, 1)).toBeNull()
  })
})

describe('getStablefordPoints', () => {
  it('uses USGA scoring (par + 2 - net)', () => {
    expect(getStablefordPoints(4, 4)).toBe(2)
    expect(getStablefordPoints(4, 3)).toBe(3)
    expect(getStablefordPoints(4, 2)).toBe(4)
    expect(getStablefordPoints(4, 6)).toBe(0)
    expect(getStablefordPoints(4, null)).toBe(0)
  })
})

describe('trimTeeForCompetition', () => {
  it('keeps the tee unchanged when holes match', () => {
    const trimmed = trimTeeForCompetition(blackTee, 18)
    expect(trimmed.holePars).toEqual(blackTee.holePars)
    expect(trimmed.par).toBe(72)
  })

  it('halves the tee for a 9-hole round', () => {
    const trimmed = trimTeeForCompetition(blackTee, 9)
    expect(trimmed.holePars).toHaveLength(9)
    expect(trimmed.holePars).toEqual(blackTee.holePars.slice(0, 9))
    expect(trimmed.par).toBe(blackTee.holePars.slice(0, 9).reduce((total, value) => total + value, 0))
    expect(trimmed.courseRating).toBeCloseTo(blackTee.courseRating / 2, 1)
  })
})

describe('buildHoleDetails', () => {
  it('joins par, stroke index and yardage by hole', () => {
    const details = buildHoleDetails(blackTee)
    expect(details).toHaveLength(18)
    expect(details[0]).toEqual({ number: 1, par: 4, strokeIndex: 9, yardage: 380 })
  })
})

describe('createEmptyScoreArray', () => {
  it('returns an array of nulls of the requested length', () => {
    expect(createEmptyScoreArray(9)).toEqual(Array(9).fill(null))
  })
})

describe('format helpers', () => {
  it('classifies team formats', () => {
    expect(isTeamFormat('stroke')).toBe(false)
    expect(isTeamFormat('fourball-stroke')).toBe(true)
    expect(isTeamFormat('fourball-stableford')).toBe(true)
    expect(isTeamFormat('scramble-2')).toBe(true)
  })

  it('limits skins to stroke-based formats', () => {
    expect(supportsSkins('stroke')).toBe(true)
    expect(supportsSkins('fourball-stroke')).toBe(true)
    expect(supportsSkins('scramble-2')).toBe(true)
    expect(supportsSkins('stableford')).toBe(false)
    expect(supportsSkins('match-play')).toBe(false)
  })

  it('exposes per-format default allowance rules', () => {
    expect(getDefaultAllowanceRule('fourball-stroke')).toMatchObject({ kind: 'percentage', percentage: 0.85 })
    expect(getDefaultAllowanceRule('scramble-2')).toMatchObject({ kind: 'scramble-pair', lowPercentage: 0.35, highPercentage: 0.15 })
  })

  it('exposes format metadata and supported player counts', () => {
    expect(getFormatInfo('stroke')).toMatchObject({
      label: 'Individuell Stroke Play',
      playerCounts: [2, 3, 4],
      skinsSupported: true,
    })
    expect(getFormatPlayerCountLabel('stroke')).toBe('2, 3 eller 4 spillere')
    expect(getFormatPlayerCountLabel('scramble-2')).toBe('2 eller 4 spillere')
    expect(isValidPlayerCount('stroke', 3)).toBe(true)
    expect(isValidPlayerCount('stroke', 5)).toBe(false)
    expect(isValidPlayerCount('scramble-2', 2)).toBe(true)
    expect(isValidPlayerCount('scramble-2', 3)).toBe(false)
  })
})

describe('createCompetitionFromSetup + leaderboard', () => {
  const profiles: PlayerProfile[] = [
    { id: 'p1', name: 'Alice', handicapIndex: 5 },
    { id: 'p2', name: 'Bob', handicapIndex: 14 },
    { id: 'p3', name: 'Cara', handicapIndex: 22 },
    { id: 'p4', name: 'Dean', handicapIndex: 30 },
  ]

  function setupStroke(): CompetitionSetupInput {
    return {
      name: 'Stroke Demo',
      date: '2026-04-17',
      holes: 18,
      format: 'stroke',
      courseId: demoCourse.id,
      players: profiles.map((profile) => ({ playerId: profile.id, teeId: blackTee.id })),
      sideGames: [],
    }
  }

  it('snapshots course, players, allowance and seeds zeroed scores', () => {
    const competition = createCompetitionFromSetup(setupStroke(), profiles, demoCourse)
    expect(competition.players).toHaveLength(4)
    expect(competition.players[0].displayName).toBe('Alice')
    expect(competition.players[0].handicapIndexSnapshot).toBe(5)
    expect(competition.scores.playerScores[competition.players[0].id]).toEqual(Array(18).fill(null))
    expect(competition.allowanceRuleSnapshot.kind).toBe('percentage')
  })

  it('produces a stroke-play leaderboard sorted by net total', () => {
    const competition = createCompetitionFromSetup(setupStroke(), profiles, demoCourse)
    competition.scores.playerScores[competition.players[0].id] = par72Scores(0)
    competition.scores.playerScores[competition.players[1].id] = par72Scores(1)
    competition.scores.playerScores[competition.players[2].id] = par72Scores(0)
    competition.scores.playerScores[competition.players[3].id] = par72Scores(1)
    const summary = buildCompetitionSummary(competition)
    expect(summary.completeHoles).toBe(18)
    const labels = summary.leaderboard.map((entry) => entry.label)
    expect(labels).toEqual(['Cara', 'Dean', 'Alice', 'Bob'])
    const netTotals = summary.leaderboard.map((entry) => entry.netTotal)
    expect([...netTotals]).toEqual([...netTotals].sort((left, right) => left - right))
  })

  it('produces a stableford leaderboard sorted by points (high first)', () => {
    const setup: CompetitionSetupInput = { ...setupStroke(), format: 'stableford' }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    for (const player of competition.players) {
      competition.scores.playerScores[player.id] = par72Scores(0)
    }
    const summary = buildCompetitionSummary(competition)
    expect(summary.leaderboard[0].label).toBe('Dean')
    expect(summary.leaderboard.map((entry) => entry.stablefordPoints)).toEqual([
      ...summary.leaderboard.map((entry) => entry.stablefordPoints),
    ].sort((left, right) => right - left))
  })

  it('builds a match play leaderboard with relative-stroke math', () => {
    const setup: CompetitionSetupInput = {
      ...setupStroke(),
      format: 'match-play',
      players: profiles.slice(0, 2).map((profile) => ({ playerId: profile.id, teeId: blackTee.id })),
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    competition.scores.playerScores[competition.players[0].id] = par72Scores(0)
    competition.scores.playerScores[competition.players[1].id] = par72Scores(1)
    const summary = buildCompetitionSummary(competition)
    expect(summary.leaderboard).toHaveLength(2)
    const leader = summary.leaderboard.find((entry) => entry.position === 1)
    expect(leader?.matchStatus).toMatch(/Vinner|Leder|All square/)
  })

  it('builds a fourball-stroke leaderboard from per-side best ball', () => {
    const setup: CompetitionSetupInput = {
      ...setupStroke(),
      format: 'fourball-stroke',
      players: profiles.map((profile, index) => ({
        playerId: profile.id,
        teeId: blackTee.id,
        sideId: index < 2 ? 'side-1' : 'side-2',
      })),
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    competition.scores.playerScores[competition.players[0].id] = par72Scores(1)
    competition.scores.playerScores[competition.players[1].id] = par72Scores(2)
    competition.scores.playerScores[competition.players[2].id] = par72Scores(0)
    competition.scores.playerScores[competition.players[3].id] = par72Scores(0)
    const summary = buildCompetitionSummary(competition)
    expect(summary.leaderboard).toHaveLength(2)
    expect(summary.leaderboard[0].entityType).toBe('side')
  })

  it('produces a scramble-2 leaderboard from per-side gross scores', () => {
    const setup: CompetitionSetupInput = {
      ...setupStroke(),
      format: 'scramble-2',
      players: profiles.map((profile, index) => ({
        playerId: profile.id,
        teeId: blackTee.id,
        sideId: index < 2 ? 'side-1' : 'side-2',
      })),
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    expect(competition.sides).toHaveLength(2)
    competition.scores.sideScores[competition.sides[0].id] = par72Scores(0)
    competition.scores.sideScores[competition.sides[1].id] = par72Scores(1)
    const summary = buildCompetitionSummary(competition)
    expect(summary.leaderboard).toHaveLength(2)
    expect(summary.leaderboard[0].grossTotal).toBe(72)
    expect(resolveCompleteHoles(competition)).toBe(18)
  })

  it('supports scramble-2 with one side of two players', () => {
    const setup: CompetitionSetupInput = {
      ...setupStroke(),
      format: 'scramble-2',
      players: profiles.slice(0, 2).map((profile) => ({
        playerId: profile.id,
        teeId: blackTee.id,
        sideId: 'side-1',
      })),
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    expect(competition.sides).toHaveLength(1)
    expect(competition.sides[0].name).toBe('Lag 1')
    competition.scores.sideScores[competition.sides[0].id] = par72Scores(0)
    const summary = buildCompetitionSummary(competition)
    expect(summary.leaderboard).toHaveLength(1)
    expect(summary.leaderboard[0].label).toBe('Alice / Bob')
    expect(resolveCompleteHoles(competition)).toBe(18)
  })
})

describe('skins side game', () => {
  const profiles: PlayerProfile[] = [
    { id: 'p1', name: 'Alice', handicapIndex: 5 },
    { id: 'p2', name: 'Bob', handicapIndex: 14 },
  ]

  it('awards gross skins to the lone low scorer with carryover on ties', () => {
    const setup: CompetitionSetupInput = {
      name: 'Skins Demo',
      date: '2026-04-17',
      holes: 18,
      format: 'stroke',
      courseId: demoCourse.id,
      players: profiles.map((profile) => ({ playerId: profile.id, teeId: blackTee.id })),
      sideGames: [{ id: 'sg1', type: 'skins', enabled: true, mode: 'gross' }],
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    const aliceScores = par72Scores(0)
    const bobScores = par72Scores(0)
    aliceScores[0] = 3
    bobScores[1] = 3
    aliceScores[2] = 3
    bobScores[2] = 3
    competition.scores.playerScores[competition.players[0].id] = aliceScores
    competition.scores.playerScores[competition.players[1].id] = bobScores
    const summary = buildCompetitionSummary(competition)
    expect(summary.skins).not.toBeNull()
    expect(summary.skins?.holes[0]).toMatchObject({ winnerLabel: 'Alice', carryValue: 1 })
    expect(summary.skins?.holes[1]).toMatchObject({ winnerLabel: 'Bob', carryValue: 1 })
    expect(summary.skins?.holes[2]).toMatchObject({ winnerLabel: null, carryValue: 1 })
    expect(summary.skins?.holes[3].carryValue).toBe(2)
  })

  it('uses net scores when mode is net', () => {
    const setup: CompetitionSetupInput = {
      name: 'Net Skins',
      date: '2026-04-17',
      holes: 18,
      format: 'stroke',
      courseId: demoCourse.id,
      players: profiles.map((profile) => ({ playerId: profile.id, teeId: blackTee.id })),
      sideGames: [{ id: 'sg1', type: 'skins', enabled: true, mode: 'net' }],
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    competition.scores.playerScores[competition.players[0].id] = par72Scores(0)
    competition.scores.playerScores[competition.players[1].id] = par72Scores(0)
    const summary = buildCompetitionSummary(competition)
    const totalSkins = Object.values(summary.skins?.totalSkins ?? {}).reduce((total, value) => total + value, 0)
    expect(totalSkins).toBeGreaterThan(0)
  })

  it('returns null skins when the format does not support them', () => {
    const setup: CompetitionSetupInput = {
      name: 'No Skins',
      date: '2026-04-17',
      holes: 18,
      format: 'stableford',
      courseId: demoCourse.id,
      players: profiles.map((profile) => ({ playerId: profile.id, teeId: blackTee.id })),
      sideGames: [{ id: 'sg1', type: 'skins', enabled: true, mode: 'gross' }],
    }
    const competition = createCompetitionFromSetup(setup, profiles, demoCourse)
    const summary = buildCompetitionSummary(competition)
    expect(summary.skins).toBeNull()
  })
})

describe('9-hole rounds', () => {
  it('trims the tee snapshot and only counts 9 holes', () => {
    const profile: PlayerProfile = { id: 'p1', name: 'Alice', handicapIndex: 12 }
    const setup: CompetitionSetupInput = {
      name: '9 Hole Demo',
      date: '2026-04-17',
      holes: 9,
      format: 'stroke',
      courseId: demoCourse.id,
      players: [
        { playerId: 'p1', teeId: blackTee.id },
        { playerId: 'p1', teeId: blackTee.id },
      ],
      sideGames: [],
    }
    const competition = createCompetitionFromSetup(setup, [profile], demoCourse)
    expect(competition.players[0].teeSnapshot.holePars).toHaveLength(9)
    expect(competition.scores.playerScores[competition.players[0].id]).toHaveLength(9)
  })
})

function stubPlayer(): CompetitionPlayer {
  return {
    id: 'stub',
    displayName: 'Stub',
    handicapIndexSnapshot: 0,
    teeId: blackTee.id,
    teeSnapshot: blackTee,
    courseHandicap: 0,
    playingHandicap: 0,
  }
}
