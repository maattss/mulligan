<script setup lang="ts">
import { supportsSkins, type CompetitionFormat, type SkinsMode } from '@/lib/golf'

const props = defineProps<{
  format: CompetitionFormat
  allowanceIsPercentage: boolean
  allowancePresets: readonly number[]
}>()

const allowancePercentage = defineModel<number>('allowancePercentage', { required: true })
const skinsEnabled = defineModel<boolean>('skinsEnabled', { required: true })
const skinsMode = defineModel<SkinsMode>('skinsMode', { required: true })

function setSkinsEnabled(value: boolean) {
  if (!supportsSkins(props.format) && value) return
  skinsEnabled.value = value
}
</script>

<template>
  <div class="mt-6 space-y-4">
    <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <div class="flex items-baseline justify-between gap-3">
        <div>
          <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Handicap-tildeling</p>
          <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">
            {{ allowanceIsPercentage
              ? 'WHS anbefaler 75% for sosiale runder. Justér etter smak.'
              : 'Scramble bruker 35% av laveste + 15% av høyeste handicap.' }}
          </p>
        </div>
        <p
          v-if="allowanceIsPercentage"
          data-num
          class="text-[26px] font-medium leading-none tracking-[-0.02em]"
        >
          {{ Math.round(allowancePercentage * 100) }}%
        </p>
      </div>

      <div v-if="allowanceIsPercentage" class="mt-4 flex flex-wrap gap-1.5">
        <button
          v-for="preset in allowancePresets"
          :key="preset"
          class="flex-1 min-w-[52px] rounded-full border py-2 text-[12px] font-medium transition"
          :class="Math.abs(allowancePercentage - preset) < 0.001
            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
          @click="allowancePercentage = preset"
        >
          {{ Math.round(preset * 100) }}%
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Skins sidegame</p>
          <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">
            {{ supportsSkins(format)
              ? 'Lavest gross/netto på hullet vinner poengene. Kan kombineres med alle score-baserte formater.'
              : 'Ikke tilgjengelig for match play.' }}
          </p>
        </div>
        <button
          class="relative h-7 w-12 rounded-full transition"
          :class="skinsEnabled
            ? 'bg-[color:var(--color-accent)]'
            : 'bg-[color:var(--color-line)]'"
          :disabled="!supportsSkins(format)"
          :style="!supportsSkins(format) ? { opacity: 0.4 } : undefined"
          @click="setSkinsEnabled(!skinsEnabled)"
        >
          <span
            class="absolute top-0.5 h-6 w-6 rounded-full bg-white transition"
            :style="skinsEnabled ? { left: '22px' } : { left: '2px' }"
          />
        </button>
      </div>

      <div v-if="skinsEnabled" class="mt-4 flex gap-2">
        <button
          v-for="m in ['gross', 'net'] as const"
          :key="m"
          class="flex-1 rounded-full border py-2 text-sm font-medium transition"
          :class="skinsMode === m
            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
          @click="skinsMode = m"
        >
          {{ m === 'gross' ? 'Gross' : 'Net' }}
        </button>
      </div>
    </div>
  </div>
</template>
