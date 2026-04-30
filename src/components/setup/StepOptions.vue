<script setup lang="ts">
import { computed } from 'vue'
import {
  supportsSideGame,
  type CompetitionFormat,
  type NassauMode,
  type SkinsMode,
} from '@/lib/golf'

const props = defineProps<{
  format: CompetitionFormat
  participantCount: number
  allowanceIsPercentage: boolean
  presets: readonly number[]
}>()

const allowancePercentage = defineModel<number>('allowancePercentage', { required: true })
const skinsEnabled = defineModel<boolean>('skinsEnabled', { required: true })
const skinsMode = defineModel<SkinsMode>('skinsMode', { required: true })
const nassauEnabled = defineModel<boolean>('nassauEnabled', { required: true })
const nassauMode = defineModel<NassauMode>('nassauMode', { required: true })

const allowanceDescription = computed(() => {
  if (!props.allowanceIsPercentage) {
    return 'Scramble bruker 35% av laveste + 15% av høyeste handicap.'
  }
  if (props.format === 'fourball-stroke' || props.format === 'fourball-stableford') {
    return 'Four-Ball starter på 75% per WHS-anbefaling. Justér ved behov.'
  }
  return 'Individuelle formater starter på 100%. Senk for sosiale runder.'
})

const allowanceLabel = computed(() => props.allowanceIsPercentage
  ? `${Math.round(allowancePercentage.value * 100)}% handicap-tildeling`
  : '35% lav / 15% høy')

const selectedPresetIndex = computed({
  get() {
    const current = Math.round(allowancePercentage.value * 100)
    const exact = props.presets.findIndex((preset) => Math.round(preset * 100) === current)
    if (exact >= 0) return exact

    return props.presets.reduce((nearestIndex, preset, index) => {
      const nearest = props.presets[nearestIndex] ?? props.presets[0]
      return Math.abs(preset - allowancePercentage.value) < Math.abs(nearest - allowancePercentage.value)
        ? index
        : nearestIndex
    }, 0)
  },
  set(index: number) {
    selectPreset(props.presets[index] ?? props.presets[0])
  },
})

const supportsSkins = computed(() => supportsSideGame('skins', props.format, props.participantCount))
const supportsNassau = computed(() => supportsSideGame('nassau', props.format, props.participantCount))

const skinsHint = computed(() => {
  if (props.format === 'match-play') return 'Ikke tilgjengelig for match play.'
  return 'Lavest gross/netto på hullet vinner poengene. Pickup ekskluderer hullet.'
})

const nassauHint = computed(() => {
  if (props.participantCount !== 2) return 'Krever nøyaktig 2 spillere eller 2 lag.'
  return 'Tre delmatcher: front 9, back 9 og totalt. Lavest gross/netto vinner hullet.'
})

function setSkinsEnabled(value: boolean) {
  if (!supportsSkins.value && value) return
  skinsEnabled.value = value
}

function setNassauEnabled(value: boolean) {
  if (!supportsNassau.value && value) return
  nassauEnabled.value = value
}

function selectPreset(value: number) {
  allowancePercentage.value = value
}
</script>

<template>
  <div class="mt-6 space-y-4">
    <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Handicap-tildeling</p>
          <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">{{ allowanceDescription }}</p>
        </div>
        <p
          data-num
          class="max-w-28 text-right text-[15px] font-medium leading-tight tracking-tight"
          :class="allowanceIsPercentage ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-dim)]'"
        >
          {{ allowanceLabel }}
        </p>
      </div>

      <div v-if="allowanceIsPercentage" class="mt-4 space-y-3">
        <input
          v-model.number="selectedPresetIndex"
          aria-label="Handicap-tildeling"
          class="h-2 w-full cursor-pointer appearance-none rounded-full bg-[color:var(--color-line)] accent-[color:var(--color-accent)]"
          type="range"
          min="0"
          :max="presets.length - 1"
          step="1"
        >
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presets"
            :key="preset"
            class="rounded-full border px-3 py-1.5 text-[12px] font-medium transition"
            :class="Math.round(allowancePercentage * 100) === Math.round(preset * 100)
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
            @click="selectPreset(preset)"
          >
            {{ Math.round(preset * 100) }}%
          </button>
        </div>
      </div>
      <div v-else class="mt-4 rounded-xl bg-[color:var(--color-surface-alt)] px-3 py-2 text-xs text-[color:var(--color-ink-soft)]">
        35% lav / 15% høy
      </div>
    </div>

    <div>
      <p data-mono class="mb-2 px-1 text-[10px] uppercase tracking-wide text-[color:var(--color-ink-muted)]">
        Sidespill
      </p>
      <div class="space-y-3">
        <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2.5">
              <span
                class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-gold)]/90 text-[11px] font-bold text-[color:var(--color-surface)]"
                data-num
              >S</span>
              <div>
                <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Skins</p>
                <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">{{ skinsHint }}</p>
              </div>
            </div>
            <button
              role="switch"
              aria-label="Skins sidegame"
              :aria-checked="skinsEnabled"
              :disabled="!supportsSkins"
              class="relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              :class="skinsEnabled
                ? 'bg-[color:var(--color-accent)]'
                : 'bg-[color:var(--color-ink-dim)]'"
              @click="setSkinsEnabled(!skinsEnabled)"
            >
              <span
                class="absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform"
                :class="skinsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <div v-if="skinsEnabled && supportsSkins" class="mt-4 flex gap-2">
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

        <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2.5">
              <span
                class="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent)]/15 text-[11px] font-bold text-[color:var(--color-accent)]"
                data-num
              >N</span>
              <div>
                <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Nassau</p>
                <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">{{ nassauHint }}</p>
              </div>
            </div>
            <button
              role="switch"
              aria-label="Nassau sidegame"
              :aria-checked="nassauEnabled"
              :disabled="!supportsNassau"
              class="relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              :class="nassauEnabled
                ? 'bg-[color:var(--color-accent)]'
                : 'bg-[color:var(--color-ink-dim)]'"
              @click="setNassauEnabled(!nassauEnabled)"
            >
              <span
                class="absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform"
                :class="nassauEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <div v-if="nassauEnabled && supportsNassau" class="mt-4 flex gap-2">
            <button
              v-for="m in ['gross', 'net'] as const"
              :key="m"
              class="flex-1 rounded-full border py-2 text-sm font-medium transition"
              :class="nassauMode === m
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
                : 'border-[color:var(--color-line)] bg-[color:var(--color-surface-alt)] text-[color:var(--color-ink)]'"
              @click="nassauMode = m"
            >
              {{ m === 'gross' ? 'Gross' : 'Net' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
