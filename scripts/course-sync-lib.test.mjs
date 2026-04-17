import { describe, expect, it } from 'vitest'

import {
  applyCourseOverrides,
  buildDetailUrls,
  buildSearchUrls,
  extractSearchResults,
  normalizeCourseFromProvider,
  pickBestSearchResult,
  slugify,
} from './course-sync-lib.mjs'

const seed = {
  clubName: 'Bergen Golfklubb',
  courseName: 'Bergen Championship Course',
  city: 'Bergen',
  region: 'Vestland',
  country: 'Norway',
  aliases: ['Bergen GK'],
  includeByDefault: true,
}

const providerDetail = {
  id: 'gca-bergen-1',
  clubName: 'Bergen Golfklubb',
  courseName: 'Bergen Championship Course',
  city: 'Bergen',
  region: 'Vestland',
  country: 'Norway',
  holes: 18,
  tees: [
    {
      name: 'Black',
      color: 'black',
      courseRating: 72.8,
      slopeRating: 132,
      holes: Array.from({ length: 18 }, (_, index) => ({
        par: index % 3 === 2 ? 3 : index % 9 === 3 ? 5 : 4,
        strokeIndex: ((index * 7) % 18) + 1,
        yardage: 350 + index * 7,
      })),
    },
  ],
}

describe('slugify', () => {
  it('lowercases and dasherizes alphanumerics', () => {
    expect(slugify('Bergen Golfklubb')).toBe('bergen-golfklubb')
    expect(slugify('  Hello World!  ')).toBe('hello-world')
  })
})

describe('buildSearchUrls', () => {
  it('produces query permutations for course/club name and aliases', () => {
    const urls = buildSearchUrls('https://api.example.com', seed)
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((url) => url.startsWith('https://api.example.com/courses?'))).toBe(true)
    expect(urls.some((url) => url.includes('search=Bergen'))).toBe(true)
    expect(urls.some((url) => url.includes('country=Norway'))).toBe(true)
  })
})

describe('buildDetailUrls', () => {
  it('builds both /courses/:id and /course/:id urls so either provider shape works', () => {
    const urls = buildDetailUrls('https://api.example.com', 'gca-1')
    expect(urls).toEqual([
      'https://api.example.com/courses/gca-1',
      'https://api.example.com/course/gca-1',
    ])
  })
})

describe('extractSearchResults', () => {
  it('handles arrays', () => {
    expect(extractSearchResults([{ id: 1 }])).toEqual([{ id: 1 }])
  })

  it('extracts known result containers', () => {
    expect(extractSearchResults({ results: [{ id: 1 }] })).toEqual([{ id: 1 }])
    expect(extractSearchResults({ courses: [{ id: 2 }] })).toEqual([{ id: 2 }])
    expect(extractSearchResults({ data: [{ id: 3 }] })).toEqual([{ id: 3 }])
    expect(extractSearchResults({ items: [{ id: 4 }] })).toEqual([{ id: 4 }])
    expect(extractSearchResults({ unknown: [{ id: 5 }] })).toEqual([])
  })
})

describe('pickBestSearchResult', () => {
  it('prefers results that match alias name and city', () => {
    const results = [
      { clubName: 'Other GK', city: 'Oslo' },
      { clubName: 'Bergen Golfklubb', city: 'Bergen' },
      { clubName: 'Bergen GK', city: 'Bergen' },
    ]
    const match = pickBestSearchResult(results, seed)
    expect(match?.clubName).toContain('Bergen')
    expect(match?.city).toBe('Bergen')
  })

  it('returns null when no results match', () => {
    expect(pickBestSearchResult([], seed)).toBeNull()
  })
})

describe('normalizeCourseFromProvider', () => {
  it('normalizes a provider response into the internal CourseDetail shape', () => {
    const course = normalizeCourseFromProvider(providerDetail, seed)
    expect(course.id).toBe('bergen-golfklubb')
    expect(course.clubName).toBe('Bergen Golfklubb')
    expect(course.courseName).toBe('Bergen Championship Course')
    expect(course.holes).toBe(18)
    expect(course.tees).toHaveLength(1)
    const tee = course.tees[0]
    expect(tee.name).toBe('Black')
    expect(tee.holePars).toHaveLength(18)
    expect(tee.strokeIndexes).toHaveLength(18)
    expect(tee.holeYardages).toHaveLength(18)
    expect(tee.par).toBe(tee.holePars.reduce((total, value) => total + value, 0))
  })

  it('throws when no tees can be normalized', () => {
    expect(() => normalizeCourseFromProvider({ ...providerDetail, tees: [] }, seed)).toThrow()
  })

  it('falls back on detail-level scorecard holes when the tee has none', () => {
    const { holes: _holesCount, ...rest } = providerDetail
    const detail = {
      ...rest,
      holeCount: 18,
      tees: [{ name: 'White', courseRating: 70, slopeRating: 120 }],
      scorecard: { holes: providerDetail.tees[0].holes },
    }
    const course = normalizeCourseFromProvider(detail, seed)
    expect(course.tees[0].holePars).toHaveLength(18)
  })
})

describe('applyCourseOverrides', () => {
  it('returns the course unchanged when no override exists', () => {
    const course = normalizeCourseFromProvider(providerDetail, seed)
    expect(applyCourseOverrides(course, { courses: {} })).toEqual(course)
  })

  it('merges course-level and tee-level overrides', () => {
    const course = normalizeCourseFromProvider(providerDetail, seed)
    const overrides = {
      courses: {
        [course.id]: {
          city: 'Bergen Sentrum',
          tees: {
            [course.tees[0].id]: {
              courseRating: 73.5,
              slopeRating: 135,
            },
          },
        },
      },
    }
    const merged = applyCourseOverrides(course, overrides)
    expect(merged.city).toBe('Bergen Sentrum')
    expect(merged.tees[0].courseRating).toBe(73.5)
    expect(merged.tees[0].slopeRating).toBe(135)
    expect(merged.tees[0].holePars).toEqual(course.tees[0].holePars)
  })
})
