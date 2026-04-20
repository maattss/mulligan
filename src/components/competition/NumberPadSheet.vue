<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { XIcon } from 'lucide-vue-next'
import { getStablefordPoints } from '@/lib/golf'

const props = defineProps<{
  open: boolean
  label: string
  holeNumber: number
  par: number
  strokesGiven: number
  currentValue: number | null
}>()

const emit = defineEmits<{
  close: []
  submit: [value: number]
  clear: []
}>()

const input = ref('')

watch(
  () => [props.open, props.currentValue] as const,
  ([open, value]) => {
    if (open) {
      input.value = value != null ? String(value) : ''
    }
  },
  { immediate: true },
)

const quick = computed(() => [
  { label: 'Eagle', n: props.par - 2 },
  { label: 'Birdie', n: props.par - 1 },
  { label: 'Par', n: props.par },
  { label: 'Bogey', n: props.par + 1 },
  { label: 'Double', n: props.par + 2 },
].filter((q) => q.n > 0))

const previewNum = computed(() => {
  const n = Number.parseInt(input.value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
})

function scoreLabel(gross: number | null, par: number) {
  if (gross == null) return 'strokes'
  const diff = gross - par
  if (diff <= -3) return 'Albatross'
  if (diff === -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return `+${diff}`
}

const points = computed(() => {
  if (previewNum.value == null) return null
  const net = previewNum.value - props.strokesGiven
  return getStablefordPoints(props.par, net)
})

function press(key: string) {
  if (key === 'del') {
    input.value = input.value.slice(0, -1)
    return
  }
  if (key === 'ok') {
    if (previewNum.value != null) emit('submit', previewNum.value)
    return
  }
  if (key === '0' && input.value.length === 0) return
  if (input.value.length < 2) input.value = input.value + key
}

const rows: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'ok'],
]
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
      @click="emit('close')"
    >
      <div
        class="w-full max-w-md rounded-t-3xl bg-fw-bg px-5 pb-8 pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.25)]"
        @click.stop
      >
        <div class="mx-auto mb-3 h-1 w-9 rounded-full bg-fw-ink-dim" />

        <div class="mb-4 flex items-start justify-between">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.14em] text-fw-ink-muted">
              {{ label }} · Hole {{ holeNumber }}
            </p>
            <p class="mt-1 font-serif text-2xl font-medium text-fw-ink">Score</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="currentValue != null"
              type="button"
              class="rounded-full border border-fw-line bg-fw-surface px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fw-ink-soft"
              aria-label="Clear score"
              @click="emit('clear')"
            >
              Clear
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-fw-surface text-fw-ink-soft"
              aria-label="Close"
              @click="emit('close')"
            >
              <XIcon class="size-3.5" />
            </button>
          </div>
        </div>

        <div
          class="mb-4 flex items-center justify-between rounded-2xl border border-fw-line bg-fw-surface px-5 py-4"
        >
          <div>
            <div
              class="font-serif text-5xl font-medium leading-none tabular-nums"
              :class="input ? 'text-fw-ink' : 'text-fw-ink-dim'"
            >
              {{ input || '–' }}
            </div>
            <div class="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fw-ink-muted">
              {{ scoreLabel(previewNum, par) }}
            </div>
          </div>
          <div class="text-right">
            <div
              class="font-serif text-4xl font-medium leading-none tabular-nums"
              :class="points != null ? 'text-fw-accent' : 'text-fw-ink-dim'"
            >
              {{ points != null ? points : '–' }}
            </div>
            <div class="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-fw-ink-muted">
              points
            </div>
          </div>
        </div>

        <div class="mb-4 flex gap-1.5">
          <button
            v-for="q in quick"
            :key="q.label"
            type="button"
            class="flex flex-1 flex-col items-center gap-0.5 rounded-xl border px-0 py-2.5 transition"
            :class="
              input === String(q.n)
                ? 'border-fw-accent bg-fw-accent text-fw-bg'
                : 'border-fw-line bg-fw-surface text-fw-ink'
            "
            @click="input = String(q.n)"
          >
            <span class="font-serif text-base font-semibold tabular-nums">{{ q.n }}</span>
            <span class="font-mono text-[9px] uppercase tracking-[0.08em] opacity-70">
              {{ q.label }}
            </span>
          </button>
        </div>

        <div class="grid gap-2">
          <div
            v-for="(row, i) in rows"
            :key="i"
            class="grid grid-cols-3 gap-2"
          >
            <button
              v-for="key in row"
              :key="key"
              type="button"
              :aria-label="key === 'ok' ? 'Submit score' : key === 'del' ? 'Delete digit' : `Digit ${key}`"
              class="flex h-14 items-center justify-center rounded-2xl border tabular-nums"
              :class="
                key === 'ok'
                  ? 'border-fw-accent bg-fw-accent text-fw-bg font-sans text-xl font-medium'
                  : key === 'del'
                    ? 'border-fw-line bg-fw-surface text-fw-ink font-sans text-xl'
                    : 'border-fw-line bg-fw-surface text-fw-ink font-serif text-2xl font-medium'
              "
              @click="press(key)"
            >
              <span v-if="key === 'ok'">✓</span>
              <span v-else-if="key === 'del'">⌫</span>
              <span v-else>{{ key }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
