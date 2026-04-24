<script setup lang="ts">
import {
  COMPETITION_FORMATS,
  getFormatDescription,
  getFormatLabel,
  type CompetitionFormat,
} from '@/lib/golf'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const name = defineModel<string>('name', { required: true })
const format = defineModel<CompetitionFormat>('format', { required: true })
const holes = defineModel<9 | 18>('holes', { required: true })
</script>

<template>
  <div class="mt-6">
    <label class="block">
      <span data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Navn</span>
      <input
        v-model="name"
        class="mt-1.5 w-full rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[15px] outline-none focus:border-[color:var(--color-accent)]"
      />
    </label>

    <p data-mono class="mt-5 text-[10px] text-[color:var(--color-ink-muted)]">Format</p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <div
        v-for="f in COMPETITION_FORMATS"
        :key="f"
        class="relative rounded-2xl border transition"
        :class="format === f
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'"
      >
        <button
          class="w-full px-3 py-3 pr-8 text-left text-[13px]"
          @click="format = f"
        >
          {{ getFormatLabel(f) }}
        </button>
        <Popover>
          <PopoverTrigger
            :aria-label="`Info om ${getFormatLabel(f)}`"
            class="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border transition"
            :class="format === f
              ? 'border-[color:var(--color-bg)]/30 text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] text-[color:var(--color-ink-soft)]'"
            @click.stop
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4.25" stroke="currentColor" stroke-width="1" />
              <path d="M5 4.2v2.4M5 3.1v.05" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </PopoverTrigger>
          <PopoverContent :side-offset="8" align="end" class="w-[260px]">
            <p class="text-[13px] font-semibold tracking-tight text-[color:var(--color-ink)]">
              {{ getFormatLabel(f) }}
            </p>
            <p class="mt-1.5 text-[12px] leading-relaxed text-[color:var(--color-ink-soft)]">
              {{ getFormatDescription(f) }}
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>

    <p data-mono class="mt-5 text-[10px] text-[color:var(--color-ink-muted)]">Hull</p>
    <div class="mt-2 flex gap-2">
      <button
        v-for="n in [9, 18] as const"
        :key="n"
        class="flex-1 rounded-full border py-2.5 text-sm font-medium transition"
        :class="holes === n
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'"
        @click="holes = n"
      >
        {{ n }} hull
      </button>
    </div>
  </div>
</template>
