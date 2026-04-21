export const COMPETITION_FORMATS = [
  'stroke',
  'stableford',
  'match-play',
  'fourball-stroke',
  'fourball-stableford',
  'scramble-2',
] as const

export type CompetitionFormat = typeof COMPETITION_FORMATS[number]
export type SideGameType = 'skins'
export type SkinsMode = 'gross' | 'net'
export type CompetitionStatus = 'in_progress' | 'completed'
export type NullableScore = number | null

export interface HoleDetail {
  number: number
  par: number
  strokeIndex: number
  yardage: number
}

export interface TeeSet {
  id: string
  name: string
  color: string
  par: number
  courseRating: number
  slopeRating: number
  yardage: number
  holePars: number[]
  strokeIndexes: number[]
  holeYardages: number[]
}

export interface CourseDetail {
  id: string
  clubName: string
  courseName: string
  city: string
  region: string
  country: string
  holes: 9 | 18
  tees: TeeSet[]
}

export interface CourseCatalog {
  generatedAt: string
  source: string
  courses: CourseDetail[]
}

export interface CourseSearchSeed {
  providerId?: string
  clubName: string
  courseName: string
  city: string
  region: string
  country: string
  aliases: string[]
  includeByDefault: boolean
}

export interface CourseSnapshot extends CourseDetail {}

export interface PlayerProfile {
  id: string
  name: string
  handicapIndex: number
  homeClub?: string
  notes?: string
}

export interface CompetitionSide {
  id: string
  name: string
  playerIds: string[]
  playingHandicap?: number
}

export interface PercentageAllowanceRule {
  kind: 'percentage'
  percentage: number
  label: string
}

export interface ScramblePairAllowanceRule {
  kind: 'scramble-pair'
  lowPercentage: number
  highPercentage: number
  label: string
}

export type AllowanceRuleSnapshot = PercentageAllowanceRule | ScramblePairAllowanceRule

export interface CompetitionPlayer {
  id: string
  playerId?: string
  displayName: string
  handicapIndexSnapshot: number
  teeId: string
  teeSnapshot: TeeSet
  courseHandicap: number
  playingHandicap: number
  sideId?: string
}

export interface CompetitionSideGame {
  id: string
  type: SideGameType
  enabled: boolean
  mode: SkinsMode
}

export interface CompetitionScores {
  playerScores: Record<string, NullableScore[]>
  sideScores: Record<string, NullableScore[]>
}

export interface Competition {
  id: string
  name: string
  date: string
  holes: 9 | 18
  format: CompetitionFormat
  courseSnapshot: CourseSnapshot
  allowanceRuleSnapshot: AllowanceRuleSnapshot
  players: CompetitionPlayer[]
  sides: CompetitionSide[]
  sideGames: CompetitionSideGame[]
  status: CompetitionStatus
  currentHole: number
  scores: CompetitionScores
}

export interface CompetitionSetupPlayerSelection {
  playerId: string
  teeId: string
  sideId?: string
}

export interface CompetitionSetupInput {
  name: string
  date: string
  holes: 9 | 18
  format: CompetitionFormat
  courseId: string
  players: CompetitionSetupPlayerSelection[]
  sideGames: CompetitionSideGame[]
  allowanceRule?: AllowanceRuleSnapshot
}

export interface LeaderboardEntry {
  id: string
  label: string
  entityType: 'player' | 'side'
  grossTotal: number
  netTotal: number
  stablefordPoints: number
  holesPlayed: number
  courseHandicap: number
  playingHandicap: number
  relativeHandicap: number
  position?: number
  matchStatus?: string
  skinsWon?: number
}

export interface SkinsHoleResult {
  hole: number
  carryValue: number
  winnerId: string | null
  winnerLabel: string | null
  winningScore: number | null
}

export interface SkinsSummary {
  mode: SkinsMode
  totalSkins: Record<string, number>
  holes: SkinsHoleResult[]
}

export interface CompetitionSummary {
  leaderboard: LeaderboardEntry[]
  skins: SkinsSummary | null
  completeHoles: number
}

const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  stroke: 'Individuell Stroke Play',
  stableford: 'Individuell Stableford',
  'match-play': 'Individuell Match Play',
  'fourball-stroke': 'Four-Ball Stroke Play',
  'fourball-stableford': 'Four-Ball Stableford',
  'scramble-2': '2-manns Scramble',
}

const DEFAULT_ALLOWANCE_MAP: Record<CompetitionFormat, AllowanceRuleSnapshot> = {
  stroke: {
    kind: 'percentage',
    percentage: 1,
    label: '100% handicap-tildeling',
  },
  stableford: {
    kind: 'percentage',
    percentage: 1,
    label: '100% handicap-tildeling',
  },
  'match-play': {
    kind: 'percentage',
    percentage: 1,
    label: '100% handicap-tildeling',
  },
  'fourball-stroke': {
    kind: 'percentage',
    percentage: 0.85,
    label: '85% handicap-tildeling',
  },
  'fourball-stableford': {
    kind: 'percentage',
    percentage: 0.85,
    label: '85% handicap-tildeling',
  },
  'scramble-2': {
    kind: 'scramble-pair',
    lowPercentage: 0.35,
    highPercentage: 0.15,
    label: '35% lav / 15% høy',
  },
}

export function getFormatLabel(format: CompetitionFormat) {
  return FORMAT_LABELS[format]
}

export function getDefaultAllowanceRule(format: CompetitionFormat): AllowanceRuleSnapshot {
  return structuredClone(DEFAULT_ALLOWANCE_MAP[format])
}

export function isTeamFormat(format: CompetitionFormat) {
  return format.startsWith('fourball') || format === 'scramble-2'
}

export function supportsSkins(format: CompetitionFormat) {
  return format === 'stroke' || format === 'fourball-stroke' || format === 'scramble-2'
}

export function createEmptyScoreArray(holes: number) {
  return Array.from({ length: holes }, () => null as NullableScore)
}

export function roundHandicap(value: number) {
  return value >= 0 ? Math.round(value) : -Math.round(Math.abs(value))
}

export function trimTeeForCompetition(tee: TeeSet, holes: 9 | 18): TeeSet {
  if (holes === tee.holePars.length) {
    return structuredClone(tee)
  }

  const holePars = tee.holePars.slice(0, holes)
  const strokeIndexes = tee.strokeIndexes.slice(0, holes)
  const holeYardages = tee.holeYardages.slice(0, holes)

  return {
    ...structuredClone(tee),
    par: sum(holePars),
    courseRating: Number((tee.courseRating / 2).toFixed(1)),
    yardage: sum(holeYardages),
    holePars,
    strokeIndexes,
    holeYardages,
  }
}

export function buildHoleDetails(tee: TeeSet): HoleDetail[] {
  return tee.holePars.map((par, index) => ({
    number: index + 1,
    par,
    strokeIndex: tee.strokeIndexes[index],
    yardage: tee.holeYardages[index],
  }))
}

export function computeCourseHandicapUnrounded(handicapIndex: number, tee: TeeSet) {
  return handicapIndex * (tee.slopeRating / 113) + (tee.courseRating - tee.par)
}

export function computeCourseHandicap(handicapIndex: number, tee: TeeSet) {
  return roundHandicap(computeCourseHandicapUnrounded(handicapIndex, tee))
}

export function computePlayingHandicap(
  handicapIndex: number,
  tee: TeeSet,
  allowanceRule: AllowanceRuleSnapshot,
) {
  const courseHandicapUnrounded = computeCourseHandicapUnrounded(handicapIndex, tee)

  if (allowanceRule.kind !== 'percentage') {
    return roundHandicap(courseHandicapUnrounded)
  }

  return roundHandicap(courseHandicapUnrounded * allowanceRule.percentage)
}

export function computeScrambleSideHandicap(players: CompetitionPlayer[], allowanceRule: ScramblePairAllowanceRule) {
  const ordered = [...players].sort((left, right) => left.playingHandicap - right.playingHandicap)
  const low = ordered[0]?.playingHandicap ?? 0
  const high = ordered[1]?.playingHandicap ?? low

  return roundHandicap(low * allowanceRule.lowPercentage + high * allowanceRule.highPercentage)
}

export function getStrokeAdjustments(playingHandicap: number, strokeIndexes: number[]) {
  const adjustments = Array.from({ length: strokeIndexes.length }, () => 0)

  if (playingHandicap === 0) {
    return adjustments
  }

  const isPlus = playingHandicap < 0
  const absolute = Math.abs(playingHandicap)
  const fullRounds = Math.floor(absolute / strokeIndexes.length)
  const remainder = absolute % strokeIndexes.length

  for (let index = 0; index < adjustments.length; index += 1) {
    adjustments[index] = isPlus ? -fullRounds : fullRounds
  }

  if (remainder === 0) {
    return adjustments
  }

  for (let index = 0; index < strokeIndexes.length; index += 1) {
    const strokeIndex = strokeIndexes[index]
    const receivesExtra = isPlus
      ? strokeIndex > strokeIndexes.length - remainder
      : strokeIndex <= remainder

    if (receivesExtra) {
      adjustments[index] += isPlus ? -1 : 1
    }
  }

  return adjustments
}

export function getNetScore(grossScore: NullableScore, adjustment: number): NullableScore {
  if (grossScore === null) {
    return null
  }

  return grossScore - adjustment
}

export function getStablefordPoints(par: number, netScore: NullableScore) {
  if (netScore === null) {
    return 0
  }

  return Math.max(0, 2 + (par - netScore))
}

export function getCompetitionPlayerAdjustments(competition: Competition, player: CompetitionPlayer) {
  if (competition.format !== 'match-play') {
    return getStrokeAdjustments(player.playingHandicap, player.teeSnapshot.strokeIndexes)
  }

  const lowestPlayingHandicap = Math.min(...competition.players.map((entry) => entry.playingHandicap))
  const relative = player.playingHandicap - lowestPlayingHandicap

  return getStrokeAdjustments(relative, player.teeSnapshot.strokeIndexes)
}

export function createCompetitionFromSetup(
  setup: CompetitionSetupInput,
  playerProfiles: PlayerProfile[],
  course: CourseDetail,
): Competition {
  const allowanceRule = setup.allowanceRule ?? getDefaultAllowanceRule(setup.format)
  const trimmedCourse: CourseSnapshot = {
    ...structuredClone(course),
    holes: setup.holes,
    tees: course.tees.map((tee) => trimTeeForCompetition(tee, setup.holes)),
  }

  const players = setup.players.map((selection) => {
    const profile = playerProfiles.find((entry) => entry.id === selection.playerId)
    const teeSnapshot = trimmedCourse.tees.find((tee) => tee.id === selection.teeId)

    if (!profile || !teeSnapshot) {
      throw new Error('Unable to create competition snapshot from the selected player or tee.')
    }

    const competitionPlayer: CompetitionPlayer = {
      id: crypto.randomUUID(),
      playerId: profile.id,
      displayName: profile.name,
      handicapIndexSnapshot: profile.handicapIndex,
      teeId: teeSnapshot.id,
      teeSnapshot,
      courseHandicap: computeCourseHandicap(profile.handicapIndex, teeSnapshot),
      playingHandicap: computePlayingHandicap(profile.handicapIndex, teeSnapshot, allowanceRule),
      sideId: selection.sideId,
    }

    return competitionPlayer
  })

  const sides = isTeamFormat(setup.format)
    ? buildCompetitionSides(setup.format, players)
    : []

  if (allowanceRule.kind === 'scramble-pair') {
    for (const side of sides) {
      const sidePlayers = players.filter((player) => player.sideId === side.id)
      side.playingHandicap = computeScrambleSideHandicap(sidePlayers, allowanceRule)
    }
  }

  const scores: CompetitionScores = {
    playerScores: Object.fromEntries(players.map((player) => [player.id, createEmptyScoreArray(setup.holes)])),
    sideScores: Object.fromEntries(sides.map((side) => [side.id, createEmptyScoreArray(setup.holes)])),
  }

  return {
    id: crypto.randomUUID(),
    name: setup.name.trim(),
    date: setup.date,
    holes: setup.holes,
    format: setup.format,
    courseSnapshot: trimmedCourse,
    allowanceRuleSnapshot: allowanceRule,
    players,
    sides,
    sideGames: setup.sideGames,
    status: 'in_progress',
    currentHole: 1,
    scores,
  }
}

export function buildCompetitionSummary(competition: Competition): CompetitionSummary {
  const completeHoles = resolveCompleteHoles(competition)
  const leaderboard = buildLeaderboard(competition)
  const skins = buildSkinsSummary(competition, leaderboard)

  return {
    leaderboard,
    skins,
    completeHoles,
  }
}

export function isCompetitionComplete(competition: Competition) {
  return competition.status === 'completed'
}

export function resolveCompleteHoles(competition: Competition) {
  const holeCount = competition.holes

  if (competition.format === 'scramble-2') {
    return countCompleteEntries(Object.values(competition.scores.sideScores), holeCount)
  }

  return countCompleteEntries(Object.values(competition.scores.playerScores), holeCount)
}

function countCompleteEntries(scoreArrays: NullableScore[][], holeCount: number) {
  let complete = 0

  for (let index = 0; index < holeCount; index += 1) {
    const holeComplete = scoreArrays.every((scores) => scores[index] !== null)

    if (!holeComplete) {
      break
    }

    complete += 1
  }

  return complete
}

function buildCompetitionSides(format: CompetitionFormat, players: CompetitionPlayer[]): CompetitionSide[] {
  if (!isTeamFormat(format)) {
    return []
  }

  const groups = new Map<string, CompetitionPlayer[]>()

  for (const player of players) {
    const sideId = player.sideId

    if (!sideId) {
      throw new Error('Team formats require players to have a side assignment.')
    }

    if (!groups.has(sideId)) {
      groups.set(sideId, [])
    }

    groups.get(sideId)?.push(player)
  }

  return Array.from(groups.entries())
    .map(([sideId, members], index) => ({
      id: sideId,
      name: `Side ${index + 1}`,
      playerIds: members.map((member) => member.id),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function buildLeaderboard(competition: Competition): LeaderboardEntry[] {
  if (competition.format === 'match-play') {
    return buildMatchPlayLeaderboard(competition)
  }

  if (competition.format === 'stroke' || competition.format === 'stableford') {
    const entries = competition.players.map((player) => buildIndividualEntry(competition, player))
    return rankEntries(entries, competition.format)
  }

  return rankEntries(
    competition.sides.map((side) => buildSideEntry(competition, side)),
    competition.format,
  )
}

function buildIndividualEntry(competition: Competition, player: CompetitionPlayer): LeaderboardEntry {
  const adjustments = getCompetitionPlayerAdjustments(competition, player)
  const grossScores = competition.scores.playerScores[player.id] ?? createEmptyScoreArray(competition.holes)
  const grossTotal = sumDefined(grossScores)
  const netTotal = sumDefined(grossScores.map((grossScore, index) => getNetScore(grossScore, adjustments[index])))
  const stablefordPoints = sum(
    grossScores.map((grossScore, index) => getStablefordPoints(player.teeSnapshot.holePars[index], getNetScore(grossScore, adjustments[index]))),
  )
  const holesPlayed = grossScores.filter((score) => score !== null).length
  const lowestPlayingHandicap = Math.min(...competition.players.map((entry) => entry.playingHandicap))

  return {
    id: player.id,
    label: player.displayName,
    entityType: 'player',
    grossTotal,
    netTotal,
    stablefordPoints,
    holesPlayed,
    courseHandicap: player.courseHandicap,
    playingHandicap: player.playingHandicap,
    relativeHandicap: competition.format === 'match-play' ? player.playingHandicap - lowestPlayingHandicap : player.playingHandicap,
  }
}

function buildSideEntry(competition: Competition, side: CompetitionSide): LeaderboardEntry {
  const sidePlayers = competition.players.filter((player) => player.sideId === side.id)
  const holes = competition.holes
  const grossHoleScores: NullableScore[] = []
  const netHoleScores: NullableScore[] = []
  const stablefordHolePoints: number[] = []

  if (competition.format === 'scramble-2') {
    const sideGrossScores = competition.scores.sideScores[side.id] ?? createEmptyScoreArray(holes)
    const referenceTee = sidePlayers[0]?.teeSnapshot
    const strokeIndexes = referenceTee?.strokeIndexes ?? []
    const sideHandicap = side.playingHandicap ?? 0
    const adjustments = getStrokeAdjustments(sideHandicap, strokeIndexes)

    for (let index = 0; index < holes; index += 1) {
      const grossScore = sideGrossScores[index]
      grossHoleScores.push(grossScore)
      netHoleScores.push(getNetScore(grossScore, adjustments[index] ?? 0))
      stablefordHolePoints.push(getStablefordPoints(referenceTee?.holePars[index] ?? 4, getNetScore(grossScore, adjustments[index] ?? 0)))
    }
  } else {
    for (let index = 0; index < holes; index += 1) {
      const playerHoleSummaries = sidePlayers
        .map((player) => {
          const scores = competition.scores.playerScores[player.id] ?? createEmptyScoreArray(holes)
          const grossScore = scores[index]
          const adjustment = getCompetitionPlayerAdjustments(competition, player)[index] ?? 0
          const netScore = getNetScore(grossScore, adjustment)

          return {
            grossScore,
            netScore,
            stablefordPoints: getStablefordPoints(player.teeSnapshot.holePars[index], netScore),
          }
        })
        .filter((summary) => summary.grossScore !== null)

      if (playerHoleSummaries.length === 0) {
        grossHoleScores.push(null)
        netHoleScores.push(null)
        stablefordHolePoints.push(0)
        continue
      }

      grossHoleScores.push(Math.min(...playerHoleSummaries.map((summary) => summary.grossScore ?? Number.POSITIVE_INFINITY)))
      netHoleScores.push(Math.min(...playerHoleSummaries.map((summary) => summary.netScore ?? Number.POSITIVE_INFINITY)))
      stablefordHolePoints.push(Math.max(...playerHoleSummaries.map((summary) => summary.stablefordPoints)))
    }
  }

  const grossTotal = sumDefined(grossHoleScores)
  const netTotal = sumDefined(netHoleScores)
  const stablefordPoints = sum(stablefordHolePoints)
  const holesPlayed = grossHoleScores.filter((score) => score !== null).length

  return {
    id: side.id,
    label: buildSideLabel(side, sidePlayers),
    entityType: 'side',
    grossTotal,
    netTotal,
    stablefordPoints,
    holesPlayed,
    courseHandicap: sidePlayers.reduce((total, player) => total + player.courseHandicap, 0),
    playingHandicap: side.playingHandicap ?? 0,
    relativeHandicap: side.playingHandicap ?? 0,
  }
}

function buildMatchPlayLeaderboard(competition: Competition) {
  const [firstPlayer, secondPlayer] = competition.players

  if (!firstPlayer || !secondPlayer) {
    return []
  }

  const firstAdjustments = getCompetitionPlayerAdjustments(competition, firstPlayer)
  const secondAdjustments = getCompetitionPlayerAdjustments(competition, secondPlayer)
  const firstScores = competition.scores.playerScores[firstPlayer.id] ?? createEmptyScoreArray(competition.holes)
  const secondScores = competition.scores.playerScores[secondPlayer.id] ?? createEmptyScoreArray(competition.holes)

  let firstWins = 0
  let secondWins = 0
  let halved = 0
  let balance = 0
  let holesPlayed = 0

  for (let index = 0; index < competition.holes; index += 1) {
    const firstNet = getNetScore(firstScores[index], firstAdjustments[index] ?? 0)
    const secondNet = getNetScore(secondScores[index], secondAdjustments[index] ?? 0)

    if (firstNet === null || secondNet === null) {
      break
    }

    holesPlayed += 1

    if (firstNet < secondNet) {
      firstWins += 1
      balance += 1
    } else if (secondNet < firstNet) {
      secondWins += 1
      balance -= 1
    } else {
      halved += 1
    }
  }

  const holesRemaining = competition.holes - holesPlayed
  const status = buildMatchStatus(balance, holesRemaining, holesPlayed)

  const entries = [
    {
      ...buildIndividualEntry(competition, firstPlayer),
      stablefordPoints: firstWins,
      matchStatus: statusForPlayer(status, balance >= 0),
      holesPlayed,
      relativeHandicap: 0,
    },
    {
      ...buildIndividualEntry(competition, secondPlayer),
      stablefordPoints: secondWins,
      matchStatus: statusForPlayer(status, balance <= 0),
      holesPlayed,
      relativeHandicap: secondPlayer.playingHandicap - Math.min(firstPlayer.playingHandicap, secondPlayer.playingHandicap),
    },
  ] satisfies LeaderboardEntry[]

  entries[0].position = balance >= 0 ? 1 : 2
  entries[1].position = balance <= 0 ? 1 : 2

  return entries.map((entry) => ({
    ...entry,
    courseHandicap: entry.courseHandicap,
    skinsWon: undefined,
  }))
}

function buildSkinsSummary(competition: Competition, leaderboard: LeaderboardEntry[]): SkinsSummary | null {
  const sideGame = competition.sideGames.find((entry) => entry.type === 'skins' && entry.enabled)

  if (!sideGame) {
    return null
  }

  const participantMap = new Map<string, { label: string, scoreAtHole: (hole: number) => NullableScore }>()

  if (competition.format === 'stroke') {
    for (const player of competition.players) {
      const adjustments = getCompetitionPlayerAdjustments(competition, player)
      const scores = competition.scores.playerScores[player.id]

      participantMap.set(player.id, {
        label: player.displayName,
        scoreAtHole: (hole) => {
          const grossScore = scores?.[hole]
          return sideGame.mode === 'gross'
            ? grossScore
            : getNetScore(grossScore ?? null, adjustments[hole] ?? 0)
        },
      })
    }
  } else if (competition.format === 'fourball-stroke' || competition.format === 'scramble-2') {
    for (const side of competition.sides) {
      const leaderboardEntry = leaderboard.find((entry) => entry.id === side.id)
      participantMap.set(side.id, {
        label: leaderboardEntry?.label ?? side.name,
        scoreAtHole: (hole) => resolveSideSkinScore(competition, side, sideGame.mode, hole),
      })
    }
  } else {
    return null
  }

  const totals = Object.fromEntries(Array.from(participantMap.keys(), (participantId) => [participantId, 0]))
  const holes: SkinsHoleResult[] = []
  let carryValue = 1

  for (let hole = 0; hole < competition.holes; hole += 1) {
    const participants = Array.from(participantMap.entries())
      .map(([participantId, participant]) => ({
        participantId,
        label: participant.label,
        score: participant.scoreAtHole(hole),
      }))
      .filter((entry) => entry.score !== null)

    if (participants.length < 2) {
      holes.push({
        hole: hole + 1,
        carryValue,
        winnerId: null,
        winnerLabel: null,
        winningScore: null,
      })
      continue
    }

    const lowScore = Math.min(...participants.map((entry) => entry.score ?? Number.POSITIVE_INFINITY))
    const winners = participants.filter((entry) => entry.score === lowScore)

    if (winners.length === 1) {
      const winner = winners[0]
      totals[winner.participantId] += carryValue
      holes.push({
        hole: hole + 1,
        carryValue,
        winnerId: winner.participantId,
        winnerLabel: winner.label,
        winningScore: lowScore,
      })
      carryValue = 1
    } else {
      holes.push({
        hole: hole + 1,
        carryValue,
        winnerId: null,
        winnerLabel: null,
        winningScore: lowScore,
      })
      carryValue += 1
    }
  }

  for (const entry of leaderboard) {
    entry.skinsWon = totals[entry.id] ?? 0
  }

  return {
    mode: sideGame.mode,
    totalSkins: totals,
    holes,
  }
}

function resolveSideSkinScore(competition: Competition, side: CompetitionSide, mode: SkinsMode, holeIndex: number) {
  if (competition.format === 'scramble-2') {
    const sideGrossScore = competition.scores.sideScores[side.id]?.[holeIndex] ?? null
    const sideHandicap = side.playingHandicap ?? 0
    const referenceTee = competition.players.find((player) => player.sideId === side.id)?.teeSnapshot
    const adjustment = getStrokeAdjustments(sideHandicap, referenceTee?.strokeIndexes ?? [])[holeIndex] ?? 0

    return mode === 'gross' ? sideGrossScore : getNetScore(sideGrossScore, adjustment)
  }

  const players = competition.players.filter((player) => player.sideId === side.id)
  const summaries = players
    .map((player) => {
      const grossScore = competition.scores.playerScores[player.id]?.[holeIndex] ?? null
      const adjustment = getCompetitionPlayerAdjustments(competition, player)[holeIndex] ?? 0
      const netScore = getNetScore(grossScore, adjustment)

      return {
        grossScore,
        netScore,
      }
    })
    .filter((entry) => entry.grossScore !== null)

  if (summaries.length === 0) {
    return null
  }

  return mode === 'gross'
    ? Math.min(...summaries.map((entry) => entry.grossScore ?? Number.POSITIVE_INFINITY))
    : Math.min(...summaries.map((entry) => entry.netScore ?? Number.POSITIVE_INFINITY))
}

function rankEntries(entries: LeaderboardEntry[], format: CompetitionFormat) {
  const ranked = [...entries].sort((left, right) => {
    if (format === 'stableford' || format === 'fourball-stableford') {
      return right.stablefordPoints - left.stablefordPoints || left.grossTotal - right.grossTotal
    }

    return left.netTotal - right.netTotal || left.grossTotal - right.grossTotal
  })

  ranked.forEach((entry, index) => {
    entry.position = index + 1
  })

  return ranked
}

function buildSideLabel(side: CompetitionSide, players: CompetitionPlayer[]) {
  const playerNames = players.map((player) => player.displayName)
  return playerNames.length > 0 ? playerNames.join(' / ') : side.name
}

function buildMatchStatus(balance: number, holesRemaining: number, holesPlayed: number) {
  if (holesPlayed === 0) {
    return 'All square'
  }

  if (balance === 0) {
    return `All square etter ${holesPlayed}`
  }

  const leader = balance > 0 ? 'Spiller 1' : 'Spiller 2'
  const margin = Math.abs(balance)

  if (margin > holesRemaining) {
    return `${leader} vinner ${margin}&${holesRemaining}`
  }

  return `${leader} ${margin} opp etter ${holesPlayed}`
}

function statusForPlayer(status: string, isLeading: boolean) {
  if (status.startsWith('Spiller 1')) {
    return isLeading ? status.replace('Spiller 1', 'Leder') : status.replace('Spiller 1', 'Ligger under')
  }

  if (status.startsWith('Spiller 2')) {
    return isLeading ? status.replace('Spiller 2', 'Leder') : status.replace('Spiller 2', 'Ligger under')
  }

  return status
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function sumDefined(values: NullableScore[]) {
  return values.reduce((total, value) => total + (value ?? 0), 0)
}
