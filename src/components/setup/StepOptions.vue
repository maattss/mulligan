<script setup lang="ts">
import { computed } from 'vue'
import { supportsSkins, type CompetitionFormat, type SkinsMode } from '@/lib/golf'
import { Switch } from '@/components/ui/switch'

const props = defineProps<{
  format: CompetitionFormat
  allowanceIsPercentage: boolean
  presets: readonly number[]
}>()

const allowancePercentage = defineModel<number>('allowancePercentage', { required: true })
const skinsEnabled = defineModel<boolean>('skinsEnabled', { required: true })
const skinsMode = defineModel<SkinsMode>('skinsMode', { required: true })

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

function setSkinsEnabled(value: boolean) {
  if (!supportsSkins(props.format) && value) return
  skinsEnabled.value = value
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

    <div class="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[15px] font-semibold text-[color:var(--color-ink)]">Skins sidegame</p>
          <p class="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">
            {{ supportsSkins(format)
              ? 'Lavest gross/netto på hullet vinner poengene. Pickup ekskluderer hullet.'
              : 'Ikke tilgjengelig for match play.' }}
          </p>
        </div>
        <Switch
          size="lg"
          aria-label="Skins sidegame"
          :model-value="skinsEnabled"
          :disabled="!supportsSkins(format)"
          @update:model-value="setSkinsEnabled"
        />
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
