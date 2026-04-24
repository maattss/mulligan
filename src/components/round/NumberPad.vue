<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getNetScore, getStablefordPoints } from '@/lib/golf'

const props = defineProps<{
  label: string
  hole: number
  par: number
  strokeAdjustment: number
  initialScore: number | null
  isPickedUp: boolean
}>()

const emit = defineEmits<{
  (event: 'commit', value: number): void
  (event: 'pickup'): void
  (event: 'clear'): void
  (event: 'close'): void
}>()

const padValue = ref(props.initialScore != null ? String(props.initialScore) : '')

watch(
  () => [props.initialScore, props.hole] as const,
  () => {
    padValue.value = props.initialScore != null ? String(props.initialScore) : ''
  },
)

function scoreLabel(gross: number, par: number) {
  const d = gross - par
  if (d <= -3) return 'Albatross'
  if (d === -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d === 0) return 'Par'
  if (d === 1) return 'Bogey'
  if (d === 2) return 'Double'
  return `+${d}`
}

const previewLabel = computed(() => {
  const n = parseInt(padValue.value, 10)
  if (!Number.isFinite(n)) return 'slag'
  return scoreLabel(n, props.par)
})

const previewPoints = computed(() => {
  const n = parseInt(padValue.value, 10)
  if (!Number.isFinite(n)) return null
  return getStablefordPoints(props.par, getNetScore(n, props.strokeAdjustment))
})

const quickPicks = computed(() => {
  const par = props.par
  return [
    { label: 'Eagle', n: par - 2 },
    { label: 'Birdie', n: par - 1 },
    { label: 'Par', n: par },
    { label: 'Bogey', n: par + 1 },
    { label: 'Double', n: par + 2 },
  ].filter((q) => q.n > 0)
})

function selectQuick(value: number) {
  padValue.value = String(value)
  emit('commit', value)
}

function tapDigit(digit: string) {
  if (padValue.value.length >= 2) {
    padValue.value = digit
  } else {
    padValue.value += digit
  }
  const n = parseInt(padValue.value, 10)
  if (Number.isFinite(n) && n > 0) {
    emit('commit', n)
  }
}

function tapDelete() {
  padValue.value = padValue.value.slice(0, -1)
  if (padValue.value === '') {
    emit('clear')
  } else {
    const n = parseInt(padValue.value, 10)
    if (Number.isFinite(n) && n > 0) emit('commit', n)
  }
}

function tapPickup() {
  padValue.value = ''
  emit('pickup')
}

function tapClear() {
  padValue.value = ''
  emit('clear')
}
</script>

<template>
  <div
    class="fixed inset-0 z-40 flex flex-col justify-end bg-black/30"
    @click="emit('close')"
  >
    <div
      class="rounded-t-3xl bg-[color:var(--color-bg)] px-4 pt-3 pb-[calc(1.75rem+var(--safe-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.25)]"
      @click.stop
    >
      <div class="mx-auto mb-3 h-1 w-9 rounded-sm bg-[color:var(--color-ink-dim)]" />

      <div class="mb-3.5 flex items-start justify-between">
        <div>
          <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">
            {{ label }} · Hull {{ hole }}
          </p>
          <p data-num class="mt-0.5 text-[22px] font-medium tracking-[-0.02em]">Score</p>
        </div>
        <button
          aria-label="Lukk"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-surface)]"
          @click="emit('close')"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" class="text-[color:var(--color-ink-soft)]">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="mb-3.5 flex items-center justify-between rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5">
        <div>
          <p data-num class="text-[46px] leading-none font-medium tracking-[-0.03em]" :class="padValue ? 'text-[color:var(--color-ink)]' : (isPickedUp ? 'text-[color:var(--color-clay)]' : 'text-[color:var(--color-ink-dim)]')">
            {{ padValue || (isPickedUp ? 'PU' : '–') }}
          </p>
          <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">
            {{ padValue ? previewLabel : (isPickedUp ? 'Plukket opp' : 'Velg score') }}
          </p>
        </div>
        <div class="text-right">
          <p data-num class="text-[34px] leading-none font-medium tracking-[-0.02em]" :class="previewPoints != null ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-ink-dim)]'">
            {{ previewPoints ?? (isPickedUp ? 0 : '–') }}
          </p>
          <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">poeng</p>
        </div>
      </div>

      <div class="mb-3.5 flex gap-1.5">
        <button
          v-for="q in quickPicks"
          :key="q.label"
          data-testid="pad-quick"
          class="flex-1 rounded-xl border py-2.5 text-center transition"
          :class="padValue === String(q.n)
            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
            : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]'"
          @click="selectQuick(q.n)"
        >
          <span data-num class="block text-[18px] font-semibold">{{ q.n }}</span>
          <span data-mono class="block text-[9px] opacity-70">{{ q.label }}</span>
        </button>
      </div>

      <div class="grid gap-2">
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="k in ['1','2','3']"
            :key="k"
            class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
            data-num
            @click="tapDigit(k)"
          >{{ k }}</button>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="k in ['4','5','6']"
            :key="k"
            class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
            data-num
            @click="tapDigit(k)"
          >{{ k }}</button>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="k in ['7','8','9']"
            :key="k"
            class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
            data-num
            @click="tapDigit(k)"
          >{{ k }}</button>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-sm font-medium"
            @click="tapClear"
          >Tøm</button>
          <button
            class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[26px] font-medium"
            data-num
            @click="tapDigit('0')"
          >0</button>
          <button
            class="h-[54px] rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-sm font-medium"
            @click="tapDelete"
          >⌫</button>
        </div>
        <button
          data-testid="pad-pickup"
          class="h-[52px] rounded-2xl border border-[color:var(--color-clay)] bg-transparent text-[14px] font-semibold text-[color:var(--color-clay)] transition"
          :class="isPickedUp ? 'bg-[color:var(--color-clay)]/10' : ''"
          @click="tapPickup"
        >
          {{ isPickedUp ? 'Plukket opp ✓' : 'Plukk opp' }}
        </button>
      </div>
    </div>
  </div>
</template>
