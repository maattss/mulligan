import type {
  CompetitionFormat,
  CompetitionFormatInfo,
  CompetitionStatus,
  SkinsMode,
} from '@/lib/golf'

const competitionFormatInfo = {
  stroke: {
    label: 'Individuell Stroke Play',
    summary: 'Laveste totale score vinner runden.',
    details: 'Alle spillerne registrerer score hull for hull. Appen viser brutto og netto fortløpende gjennom hele runden.',
    playerCounts: [2, 3, 4],
    teamFormat: false,
    skinsSupported: true,
  },
  stableford: {
    label: 'Individuell Stableford',
    summary: 'Poeng per hull basert på netto score mot par.',
    details: 'Hver spiller får Stableford-poeng per hull. Høyeste totalsum vinner runden.',
    playerCounts: [2, 3, 4],
    teamFormat: false,
    skinsSupported: false,
  },
  'match-play': {
    label: 'Individuell Match Play',
    summary: 'Hvert hull vinnes separat.',
    details: 'Laveste netto score vinner hullet. Stillingen vises med Match Play-uttrykk som All square, up, down og 2&1.',
    playerCounts: [2],
    teamFormat: false,
    skinsSupported: false,
  },
  'fourball-stroke': {
    label: 'Four-Ball Stroke Play',
    summary: 'Beste score på laget teller på hvert hull.',
    details: 'To lag med to spillere. For hvert hull bruker laget den beste scoren blant sine to spillere.',
    playerCounts: [4],
    teamFormat: true,
    skinsSupported: true,
  },
  'fourball-stableford': {
    label: 'Four-Ball Stableford',
    summary: 'Beste Stableford-score på laget teller på hvert hull.',
    details: 'To lag med to spillere. For hvert hull teller den beste Stableford-scoren på laget.',
    playerCounts: [4],
    teamFormat: true,
    skinsSupported: false,
  },
  'scramble-2': {
    label: '2-spiller Scramble',
    summary: 'Laget registrerer en felles score per hull.',
    details: 'To spillere spiller som ett scramble-lag. Hvis dere er fire spillere, kan appen registrere to scramble-lag mot hverandre.',
    playerCounts: [2, 4],
    teamFormat: true,
    skinsSupported: true,
  },
} satisfies Record<CompetitionFormat, CompetitionFormatInfo>

const defaultAllowanceLabels = {
  stroke: '100% handicap',
  stableford: '100% handicap',
  'match-play': '100% handicap',
  'fourball-stroke': '85% handicap',
  'fourball-stableford': '85% handicap',
  'scramble-2': '35% lav / 15% høy',
} satisfies Record<CompetitionFormat, string>

const competitionStatusLabels = {
  in_progress: 'Pågår',
  completed: 'Ferdig',
} satisfies Record<CompetitionStatus, string>

const skinsModeLabels = {
  gross: 'Brutto',
  net: 'Netto',
} satisfies Record<SkinsMode, string>

export const nb = {
  appName: 'Mulligan',
  routes: {
    dashboard: {
      title: 'Oversikt',
      description: 'Få oversikt over spillere, aktive runder og nylige resultater.',
    },
    players: {
      title: 'Spillere',
      description: 'Hold orden på handicapprofilene som brukes når du oppretter lokale konkurranser.',
    },
    competitionNew: {
      title: 'Ny konkurranse',
      description: 'Velg bane, format, spillere, tee og sidekonkurranser før runden starter.',
    },
    competitionRound: {
      title: 'Pågående runde',
      description: 'Registrer score hull for hull, følg stillingen og avslutt konkurransen lokalt.',
    },
  },
  header: {
    players: 'Spillere',
    newCompetition: 'Ny konkurranse',
  },
  sidebar: {
    title: 'Klubbhus',
    status: 'Lokal',
    intro: 'Én scorer, lokale runder og en ferdig banekatalog for Bergen og Stavanger.',
    workspace: 'Arbeidsflate',
    catalog: 'Katalog',
    builtFromSeed: 'Bygget fra lokal seed- og synkflyt.',
    footer: 'Handicapbevisst scoring og rask konkurranseoppsett for lokale runder.',
  },
  dashboard: {
    statCards: {
      playerProfiles: {
        label: 'Spillerprofiler',
        hint: 'Handicap klart til å kopieres inn i nye runder.',
      },
      activeCompetitions: {
        label: 'Aktive konkurranser',
        hint: 'Runder som kan åpnes igjen lokalt.',
      },
      bundledCourses: {
        label: 'Baner i katalogen',
        hint: 'Seedet katalog for Bergen og Stavanger.',
      },
    },
    hero: {
      badge: 'Spill uten dekning',
      title: 'Hold runden flytende med én ryddig skjerm for scoreren.',
      description: 'Hold styr på lokale spillere, start handicapbevisste konkurranser fra den innebygde banekatalogen, og før score uten å være avhengig av dekning.',
      startCompetition: 'Start konkurranse',
      managePlayers: 'Spillere',
      noSavedProfiles: 'Ingen',
      savedProfilesSuffix: 'lagrede spillerprofiler',
    },
    recentCompetitions: {
      title: 'Nylige konkurranser',
      description: 'Åpne aktive runder igjen eller se ferdige resultater lokalt.',
      emptyTitle: 'Ingen runder ennå',
      emptyDescription: 'Legg inn spillere først, og start deretter en konkurranse fra den lokale banekatalogen.',
      emptyAction: 'Opprett den første konkurransen',
      headers: {
        competition: 'Konkurranse',
        format: 'Format',
        course: 'Bane',
        status: 'Status',
      },
    },
    howItWorks: {
      title: 'Slik fungerer det',
      description: 'Appen er laget for at én scorer skal håndtere hele flighten fra én telefon.',
      steps: [
        {
          title: '1. Sett opp flighten',
          description: 'Lagre spillerne med Handicap Index og eventuelle notater om hjemmeklubb eller preferanser.',
        },
        {
          title: '2. Start fra banekatalogen',
          description: 'Velg en bane fra katalogen, tildel tee per spiller og snapshot hele runden før start.',
        },
        {
          title: '3. Registrer hull for hull',
          description: 'Registrer score fortløpende, la appen regne netto, lagformat og Skins, og avslutt runden når dere er ferdige.',
        },
      ],
    },
  },
  playersView: {
    title: 'Lokale spillerprofiler',
    description: 'Hver profil lagrer handicap og notater som kopieres inn i en konkurranse når runden opprettes.',
    addPlayer: 'Legg til spiller',
    emptyTitle: 'Ingen spillere lagret ennå',
    emptyDescription: 'Opprett noen spillere først, så kan konkurranseoppsettet hente navn og handicap rett inn i runden.',
    emptyAction: 'Legg til den første spilleren',
    table: {
      player: 'Spiller',
      handicap: 'Handicap',
      homeClub: 'Hjemmeklubb',
      notes: 'Notater',
      actions: 'Handlinger',
      snapshotReady: 'Klar til å kopieres inn i lokale konkurranser',
    },
    toasts: {
      updated: 'Spilleren er oppdatert.',
      added: 'Spilleren er lagt til.',
    },
  },
  playerDialog: {
    titles: {
      edit: 'Rediger spiller',
      add: 'Legg til spiller',
    },
    description: 'Lagre navn og handicap du vil gjenbruke i lokale konkurranser.',
    fields: {
      name: 'Navn',
      handicapIndex: 'Handicap Index',
      homeClub: 'Hjemmeklubb',
      notes: 'Notater',
    },
    placeholders: {
      name: 'Mats',
      homeClub: 'Stavanger Golfklubb',
      notes: 'Valgfrie notater om tee, preferanser eller faste makkerpar.',
    },
    handicapDescription: 'Denne verdien kopieres inn i konkurransen når du oppretter en ny runde.',
    nameRequired: 'Spillernavn er påkrevd.',
    cancel: 'Avbryt',
    save: 'Lagre spiller',
  },
  leaderboard: {
    columns: {
      position: 'Plass',
      name: 'Navn',
      gross: 'Brutto',
      net: 'Netto',
      points: 'Poeng',
      match: 'Match',
      handicap: 'Hcp',
      skins: 'Skins',
    },
    waitingForScores: 'Venter på score',
    empty: 'Ingen resultater ennå.',
  },
  scoreControl: {
    parLabelPrefix: 'Par på hull',
  },
  competitionSetup: {
    basics: {
      title: 'Konkurranse',
      description: 'Gi runden et navn, velg format og bestem om dere spiller 9 eller 18 hull.',
      fields: {
        name: 'Konkurransenavn',
        date: 'Dato',
        format: 'Format',
        holes: 'Hull',
        allowancePercentage: 'Handicapprosent',
      },
      formatHelp: {
        srLabel: 'Forklaring av spilleformater',
        title: 'Hva betyr formatene?',
        description: 'Golfuttrykk som Stroke Play, Stableford, Match Play, Four-Ball og Scramble beholdes på originalspråket.',
      },
      holeOptions: {
        nine: '9 hull',
        eighteen: '18 hull',
      },
    },
    course: {
      title: 'Bane og tee',
      description: 'Velg en bane fra katalogen og tildel tee per spiller før konkurransen snapshottes.',
      fieldLabel: 'Bane',
      placeholder: 'Velg bane',
      snapshotLabel: 'Valgt bane',
    },
    players: {
      title: 'Spillere og sidekonkurranser',
      description: 'Velg spillerne for dagens runde, så kopierer appen navn og handicap inn i konkurransen.',
      emptyTitle: 'Ingen spillerprofiler ennå',
      emptyDescription: 'Opprett noen spillere først, så konkurransen kan lagre riktig handicap for runden.',
      emptyAction: 'Gå til spillere',
      homeClubFallback: 'Ingen hjemmeklubb lagret',
      includeTitle: 'Ta med i denne konkurransen',
      includeDescription: 'Spilleren snapshottes sammen med valgt tee når runden opprettes.',
      teeLabel: 'Tee',
      teePlaceholder: 'Velg tee',
      autoAssignedPrefix: 'Auto-plassert i',
    },
    skins: {
      title: 'Skins',
      description: 'Tilgjengelig bare i Stroke Play-baserte formater.',
      modeLabel: 'Skins-modus',
    },
    preRound: {
      title: 'Før start',
      description: 'Hele runden lagres lokalt idet du starter konkurransen.',
      cards: {
        format: 'Format',
        course: 'Bane',
        selectedPlayers: 'Valgte spillere',
        allowance: 'Handicap',
      },
      courseFallback: 'Velg bane',
      validMessage: 'Alt ser gyldig ut. Start konkurransen når dere er klare.',
      action: 'Start konkurranse',
    },
    validation: {
      selectCourse: 'Velg en bane fra den lokale katalogen.',
      enterName: 'Gi konkurransen et navn.',
      invalidTeams: 'Hvert lag må ha nøyaktig 2 spillere.',
    },
    toasts: {
      courseNotFound: 'Den valgte banen ble ikke funnet i katalogen.',
      created: 'Konkurransen er opprettet.',
      roundReady: 'Runden er klar. Begynn å registrere hullscore.',
    },
  },
  competitionRound: {
    notFound: {
      title: 'Konkurransen ble ikke funnet',
      description: 'Den forespurte lokale runden kunne ikke lastes fra IndexedDB.',
      action: 'Til oversikten',
    },
    actions: {
      reopen: 'Åpne igjen',
      markComplete: 'Marker som ferdig',
    },
    cards: {
      currentHole: 'Hull nå',
      currentHoleFallback: 'Velg et hull for å registrere score.',
      completedHoles: 'Ferdige hull',
      completedHolesHint: 'Alle scorekort er registrert frem til dette punktet.',
      sideGames: 'Sidekonkurranser',
      sideGamesActiveHint: 'Skins oppdateres fortløpende mens du registrerer score.',
      sideGamesInactiveHint: 'Ingen sidekonkurranse er koblet til runden.',
    },
    navigation: {
      previousHole: 'Forrige hull',
      nextHole: 'Neste hull',
    },
    tabs: {
      score: 'Score',
      leaderboard: 'Stilling',
      sideGames: 'Sidekonkurranser',
    },
    leaderboard: {
      title: 'Stilling',
      description: 'Brutto, netto, Stableford-poeng og Skins oppdateres fortløpende fra scorekortene.',
    },
    sideGames: {
      title: 'Sidekonkurranser',
      description: 'Oppsummeringer av sidekonkurranser oppdateres direkte fra scorekortene uten ekstra registrering.',
      emptyTitle: 'Ingen sidekonkurranse aktiv',
      emptyDescription: 'Slå på Skins i oppsettet hvis du vil følge hullvinnere ved siden av hovedstillingen.',
      modeLabel: 'Skins-modus',
      carryover: 'Carryover',
    },
    toasts: {
      reopened: 'Konkurransen er åpnet igjen.',
      completed: 'Konkurransen er markert som ferdig.',
    },
  },
} as const

export function getCompetitionFormatInfo(format: CompetitionFormat) {
  return structuredClone(competitionFormatInfo[format])
}

export function getDefaultAllowanceLabel(format: CompetitionFormat) {
  return defaultAllowanceLabels[format]
}

export function getFormatPlayerCountLabel(format: CompetitionFormat) {
  const counts = getCompetitionFormatInfo(format).playerCounts

  if (counts.length === 1) {
    return `${counts[0]} spillere`
  }

  if (counts.length === 2) {
    return `${counts[0]} eller ${counts[1]} spillere`
  }

  return `${counts.slice(0, -1).join(', ')} eller ${counts[counts.length - 1]} spillere`
}

export function getCompetitionStatusLabel(status: CompetitionStatus) {
  return competitionStatusLabels[status]
}

export function getSkinsModeLabel(mode: SkinsMode) {
  return skinsModeLabels[mode]
}

export function getSideLabel(sideId: string) {
  return sideId.startsWith('side-') ? `Lag ${sideId.replace('side-', '')}` : sideId
}

export function formatSavedPlayerProfiles(count: number) {
  return `${count || nb.dashboard.hero.noSavedProfiles} ${nb.dashboard.hero.savedProfilesSuffix}`
}

export function formatCatalogCount(totalCourses: number) {
  return `${totalCourses} baner ligger klare lokalt`
}

export function formatCatalogEntryCount(totalCourses: number) {
  return `${totalCourses} baner i katalogen`
}

export function formatGeneratedCatalogDate(dateValue: string) {
  return `Generert ${new Date(dateValue).toLocaleDateString('nb-NO')}`
}

export function formatDisplayDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('nb-NO')
}

export function formatRoundMeta(dateValue: string, holes: number, players: number) {
  return `${formatDisplayDate(dateValue)} · ${holes} hull · ${players} spillere`
}

export function formatLeaderboardHolesLogged(count: number) {
  return `${count} hull registrert`
}

export function formatCourseHoleBadge(holes: number) {
  return `${holes} hull`
}

export function formatHandicapIndexBadge(value: number) {
  return `HI ${value.toFixed(1)}`
}

export function formatPlayingHandicapBadge(value: number) {
  return `PH ${value}`
}

export function formatPercentageAllowanceLabel(percentage: number) {
  return `${percentage}% handicap`
}

export function getDefaultCompetitionName(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  const formattedDate = new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  return `Runde ${formattedDate}`
}

export function formatPlayerRemovedToast(playerName: string) {
  return `${playerName} er fjernet.`
}

export function formatPlayerCountSelection(format: CompetitionFormat) {
  return `Velg ${getFormatPlayerCountLabel(format)}.`
}

export function formatInvalidPlayerCount(format: CompetitionFormat) {
  return `${getCompetitionFormatInfo(format).label} spilles med ${getFormatPlayerCountLabel(format)}.`
}

export function formatAllowanceDescription(label: string) {
  return `Standard for dette formatet er ${label.toLowerCase()}.`
}

export function formatAutoAssignedSide(sideId: string) {
  return `${nb.competitionSetup.players.autoAssignedPrefix} ${getSideLabel(sideId)}`
}

export function formatScoreControlParLabel(par: number) {
  return `${nb.scoreControl.parLabelPrefix} ${par}`
}

export function formatPlayerScoreSubtitle(teeName: string, sideId?: string) {
  return sideId ? `${teeName} tee · ${getSideLabel(sideId)}` : `${teeName} tee`
}

export function formatCurrentHoleDetails(par: number, strokeIndex: number) {
  return `Par ${par} · SI ${strokeIndex}`
}

export function formatHoleLabel(hole: number) {
  return `Hull ${hole}`
}

export function formatSkinsWinSummary(carryValue: number, winningScore: number | null) {
  return `${carryValue} skin${carryValue === 1 ? '' : 's'} vunnet med ${winningScore}`
}

export function formatSkinsCarryoverSummary(carryValue: number) {
  return `${carryValue} skin${carryValue === 1 ? '' : 's'} går videre til neste hull`
}

export function getMatchStatusLabel(balance: number, holesRemaining: number, holesPlayed: number, isFirstPlayer: boolean) {
  if (holesPlayed === 0) {
    return 'All square'
  }

  if (balance === 0) {
    return `All square etter ${holesPlayed} hull`
  }

  const margin = Math.abs(balance)
  const firstPlayerLeading = balance > 0
  const playerIsLeading = isFirstPlayer ? firstPlayerLeading : !firstPlayerLeading

  if (margin > holesRemaining) {
    return playerIsLeading ? `Vinner ${margin}&${holesRemaining}` : `Taper ${margin}&${holesRemaining}`
  }

  return playerIsLeading
    ? `Leder ${margin} up etter ${holesPlayed} hull`
    : `Ligger ${margin} down etter ${holesPlayed} hull`
}