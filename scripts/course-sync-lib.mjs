const SEARCH_KEYS = ['search', 'query', 'q']
const DETAIL_PATHS = ['courses', 'course']

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildSearchUrls(baseUrl, seed) {
  const queryValues = [seed.courseName, seed.clubName, ...seed.aliases].filter(Boolean)
  const urls = []

  for (const query of queryValues) {
    for (const key of SEARCH_KEYS) {
      const url = new URL('/courses', baseUrl)
      url.searchParams.set(key, query)
      url.searchParams.set('country', seed.country)
      url.searchParams.set('city', seed.city)
      urls.push(url.toString())
    }
  }

  return urls
}

export function buildDetailUrls(baseUrl, providerId) {
  return DETAIL_PATHS.map((path) => new URL(`/${path}/${providerId}`, baseUrl).toString())
}

export function extractSearchResults(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  return payload?.results
    ?? payload?.courses
    ?? payload?.data
    ?? payload?.items
    ?? []
}

export function pickBestSearchResult(results, seed) {
  const aliases = [seed.clubName, seed.courseName, ...seed.aliases].map((value) => value.toLowerCase())

  return [...results]
    .map((result) => ({
      result,
      score: scoreResult(result, seed, aliases),
    }))
    .sort((left, right) => right.score - left.score)[0]?.result ?? null
}

export function normalizeCourseFromProvider(detail, seed) {
  const holeCount = Number(
    detail?.holes
      ?? detail?.holeCount
      ?? detail?.numberOfHoles
      ?? detail?.course?.holes
      ?? 18,
  )

  const id = String(detail?.id ?? detail?.courseId ?? detail?.uuid ?? slugify(`${seed.clubName}-${seed.courseName}`))
  const teeCandidates = detail?.tees ?? detail?.teeBoxes ?? detail?.tee_sets ?? detail?.markers ?? detail?.scorecard?.tees ?? []

  const tees = teeCandidates
    .map((tee, teeIndex) => normalizeTee(tee, detail, holeCount, teeIndex))
    .filter(Boolean)

  if (tees.length === 0) {
    throw new Error(`No tee data found for ${seed.clubName} / ${seed.courseName}.`)
  }

  return {
    id: slugify(seed.clubName),
    providerId: id,
    clubName: detail?.clubName ?? detail?.club?.name ?? seed.clubName,
    courseName: detail?.courseName ?? detail?.name ?? detail?.course?.name ?? seed.courseName,
    city: detail?.city ?? detail?.location?.city ?? seed.city,
    region: detail?.region ?? detail?.state ?? detail?.location?.state ?? seed.region,
    country: detail?.country ?? detail?.location?.country ?? seed.country,
    holes: holeCount,
    tees,
  }
}

export function applyCourseOverrides(course, overrides) {
  const courseOverride = overrides?.courses?.[course.id]

  if (!courseOverride) {
    return course
  }

  const merged = {
    ...course,
    ...courseOverride,
    tees: course.tees.map((tee) => ({
      ...tee,
      ...(courseOverride.tees?.[tee.id] ?? {}),
    })),
  }

  return merged
}

function scoreResult(result, seed, aliases) {
  const haystack = [
    result?.clubName,
    result?.courseName,
    result?.name,
    result?.city,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return aliases.reduce((score, alias) => score + (haystack.includes(alias) ? 10 : 0), 0)
    + (String(result?.city ?? '').toLowerCase() === seed.city.toLowerCase() ? 5 : 0)
}

function normalizeTee(tee, detail, holeCount, teeIndex) {
  const holes = extractHoleData(tee, detail, holeCount)

  if (holes.length === 0) {
    return null
  }

  const name = String(tee?.name ?? tee?.label ?? tee?.teeName ?? `Tee ${teeIndex + 1}`)
  const color = String(tee?.color ?? tee?.teeColor ?? name.toLowerCase())
  const yardage = Number(tee?.yardage ?? tee?.length ?? sum(holes.map((hole) => hole.yardage)))
  const courseRating = Number(tee?.courseRating ?? tee?.rating ?? tee?.course_rating ?? 0)
  const slopeRating = Number(tee?.slopeRating ?? tee?.slope ?? tee?.slope_rating ?? 113)

  return {
    id: slugify(`${detail?.name ?? detail?.courseName ?? detail?.clubName ?? 'course'}-${name}`),
    name,
    color,
    par: sum(holes.map((hole) => hole.par)),
    courseRating,
    slopeRating,
    yardage,
    holePars: holes.map((hole) => hole.par),
    strokeIndexes: holes.map((hole) => hole.strokeIndex),
    holeYardages: holes.map((hole) => hole.yardage),
  }
}

function extractHoleData(tee, detail, holeCount) {
  const directHoles = tee?.holes ?? tee?.scorecard ?? tee?.holeData ?? []
  const fallbackHoles = detail?.holes ?? detail?.scorecard?.holes ?? []
  const holes = (directHoles.length > 0 ? directHoles : fallbackHoles)
    .slice(0, holeCount)
    .map((hole, index) => ({
      par: Number(hole?.par ?? hole?.Par ?? 4),
      strokeIndex: Number(hole?.strokeIndex ?? hole?.handicap ?? hole?.hcp ?? hole?.index ?? index + 1),
      yardage: Number(hole?.yardage ?? hole?.yards ?? hole?.length ?? 0),
    }))

  return holes
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0)
}
