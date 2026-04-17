import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  applyCourseOverrides,
  buildDetailUrls,
  buildSearchUrls,
  extractSearchResults,
  normalizeCourseFromProvider,
  pickBestSearchResult,
} from './course-sync-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const manifestPath = path.join(projectRoot, 'src/data/course-manifest.json')
const overridesPath = path.join(projectRoot, 'src/data/course-overrides.json')
const outputPath = path.join(projectRoot, 'src/data/course-catalog.json')

const apiKey = process.env.GOLF_COURSE_API_KEY
const baseUrl = process.env.GOLF_COURSE_API_BASE_URL ?? 'https://api.golfcourseapi.com'

if (!apiKey) {
  throw new Error('Missing GOLF_COURSE_API_KEY. Export the API key before running sync:courses.')
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const overrides = JSON.parse(await readFile(overridesPath, 'utf8'))
const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${apiKey}`,
  'X-API-Key': apiKey,
}

const courses = []

for (const seed of manifest.courses.filter((entry) => entry.includeByDefault)) {
  const providerId = seed.providerId ?? await searchCourseId(seed)
  const detail = await fetchCourseDetail(providerId)
  const normalized = normalizeCourseFromProvider(detail, seed)
  courses.push(applyCourseOverrides(normalized, overrides))
}

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(
  outputPath,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'GolfCourseAPI sync',
    courses,
  }, null, 2)}\n`,
)

console.log(`Synced ${courses.length} courses into ${path.relative(projectRoot, outputPath)}.`)

async function searchCourseId(seed) {
  const urls = buildSearchUrls(baseUrl, seed)

  for (const url of urls) {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      continue
    }

    const payload = await response.json()
    const results = extractSearchResults(payload)
    const match = pickBestSearchResult(results, seed)

    if (match) {
      return String(match.id ?? match.courseId ?? match.uuid)
    }
  }

  throw new Error(`Unable to resolve a provider id for ${seed.clubName} / ${seed.courseName}.`)
}

async function fetchCourseDetail(providerId) {
  const urls = buildDetailUrls(baseUrl, providerId)

  for (const url of urls) {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      continue
    }

    return response.json()
  }

  throw new Error(`Unable to fetch details for provider id ${providerId}.`)
}
