<script setup lang="ts">
import type { CourseDetail } from '@/lib/golf'
import { teeDotClass } from './shared'

defineProps<{
  courses: CourseDetail[]
  selectedCourse?: CourseDetail
}>()

const courseId = defineModel<string>('courseId', { required: true })
</script>

<template>
  <div class="mt-6">
    <p class="text-sm text-[color:var(--color-ink-soft)]">Velg en lokal bane fra katalogen.</p>
    <div class="mt-3 overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <button
        v-for="course in courses"
        :key="course.id"
        class="flex w-full items-center justify-between border-b border-[color:var(--color-line-soft)] px-4 py-3.5 text-left last:border-b-0"
        @click="courseId = course.id"
      >
        <div class="min-w-0">
          <p class="text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">{{ course.clubName }}</p>
          <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">{{ course.courseName }} · {{ course.city }}</p>
        </div>
        <div
          class="h-5 w-5 flex-shrink-0 rounded-full border-2"
          :class="courseId === course.id
            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]'
            : 'border-[color:var(--color-line)]'"
        />
      </button>
    </div>

    <div v-if="selectedCourse" class="mt-4 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] p-4">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Tees</p>
      <div class="mt-2 space-y-1.5">
        <div
          v-for="tee in selectedCourse.tees"
          :key="tee.id"
          class="flex items-center justify-between text-[13px]"
        >
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :class="teeDotClass(tee.color)" />
            <span>{{ tee.name }}</span>
          </div>
          <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
            CR {{ tee.courseRating }} · SR {{ tee.slopeRating }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
