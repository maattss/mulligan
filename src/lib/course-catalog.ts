import courseCatalogData from '@/data/course-catalog.json'
import type { CourseCatalog, CourseDetail } from '@/lib/golf'

const catalog = courseCatalogData as CourseCatalog

export function getCourseCatalog() {
  return catalog
}

export function getCourses() {
  return catalog.courses
}

export function getCourseById(courseId: string): CourseDetail | undefined {
  return catalog.courses.find((course) => course.id === courseId)
}

export function getCatalogMetadata() {
  return {
    generatedAt: catalog.generatedAt,
    source: catalog.source,
    totalCourses: catalog.courses.length,
  }
}
