<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { buildCompetitionSummary, getFormatLabel, type Competition } from '@/lib/golf'
import { useCompetitionsStore } from '@/stores/competitions'

type Tab = 'all' | 'active' | 'done'

const router = useRouter()
const competitionsStore = useCompetitionsStore()
const tab = ref<Tab>('all')

const active = computed(() =>
  competitionsStore.sortedCompetitions.filter((c) => c.status === 'in_progress'),
)
const finished = computed(() =>
  competitionsStore.sortedCompetitions.filter((c) => c.status === 'completed'),
)

const visibleActive = computed(() => (tab.value === 'done' ? [] : active.value))
const visibleFinished = computed(() => (tab.value === 'active' ? [] : finished.value))

function openCompetition(c: Competition) {
  if (c.status === 'completed') {
    router.push(`/competitions/${c.id}/review`)
  } else {
    router.push(`/competitions/${c.id}`)
  }
}

function formatDate(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(iso)
  date.setHours(0, 0, 0, 0)
  if (date.getTime() === today.getTime()) {
    return { top: 'I DAG', bottom: '·' }
  }
  return {
    top: date.toLocaleDateString('nb-NO', { month: 'short' }).toUpperCase(),
    bottom: String(date.getDate()),
  }
}

function progress(c: Competition) {
  const complete = buildCompetitionSummary(c).completeHoles
  return `${complete} av ${c.holes}`
}

function leader(c: Competition) {
  const summary = buildCompetitionSummary(c)
  const first = summary.leaderboard[0]
  if (!first || first.holesPlayed === 0) return null
  const isStableford = c.format === 'stableford' || c.format === 'fourball-stableford'
  const value = isStableford ? `${first.stablefordPoints} pts` : `${first.netTotal} netto`
  return { name: first.label, value }
}
</script>

<template>
  <div class="relative flex min-h-[100svh] flex-col pb-[calc(6rem+var(--safe-bottom))]">
    <header class="px-5 pt-[calc(1rem+var(--safe-top))] pb-4">
      <p data-mono class="text-[10px] text-[color:var(--color-ink-muted)]">Mulligan</p>
      <h1 data-num class="mt-1 text-[40px] font-medium leading-none tracking-[-0.04em] text-[color:var(--color-ink)]">
        Runder
      </h1>
    </header>

    <nav class="flex gap-5 border-b border-[color:var(--color-line)] px-5">
      <button
        v-for="t in [
          { id: 'all' as Tab, label: 'Alle', count: competitionsStore.competitions.length },
          { id: 'active' as Tab, label: 'Pågår', count: active.length },
          { id: 'done' as Tab, label: 'Ferdig', count: finished.length },
        ]"
        :key="t.id"
        class="-mb-px border-b-[1.5px] pb-2.5 text-sm font-medium transition"
        :class="tab === t.id
          ? 'border-[color:var(--color-accent)] text-[color:var(--color-ink)]'
          : 'border-transparent text-[color:var(--color-ink-muted)]'"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span data-mono class="ml-0.5 text-[10px] text-[color:var(--color-ink-muted)]">
          {{ t.count }}
        </span>
      </button>
    </nav>

    <div v-if="competitionsStore.competitions.length === 0" class="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <p data-num class="text-2xl font-medium tracking-tight text-[color:var(--color-ink)]">
        Ingen runder ennå
      </p>
      <p class="mt-2 text-sm text-[color:var(--color-ink-soft)]">
        Start en runde fra telefonen — ingen innlogging.
      </p>
      <button
        data-testid="start-first-competition"
        class="mt-6 rounded-2xl bg-[color:var(--color-accent)] px-6 py-3 text-sm font-semibold text-[color:var(--color-bg)]"
        @click="router.push('/competitions/new')"
      >
        Start første runde
      </button>
    </div>

    <div v-else class="flex-1">
      <section v-if="visibleActive.length > 0" class="mt-4">
        <p data-mono class="px-5 pb-2 text-[10px] text-[color:var(--color-ink-muted)]">
          Pågår
        </p>
        <ul>
          <li
            v-for="c in visibleActive"
            :key="c.id"
            class="flex cursor-pointer items-center gap-3 border-b border-[color:var(--color-line-soft)] px-5 py-3.5"
            @click="openCompetition(c)"
          >
            <div class="relative flex h-10 w-8 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
              <span data-mono class="text-[8px] text-[color:var(--color-ink-muted)]">{{ formatDate(c.date).top }}</span>
              <span data-num class="mt-0.5 text-base font-semibold leading-none">{{ formatDate(c.date).bottom }}</span>
              <span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-[color:var(--color-bg)] bg-[color:var(--color-emerald)]" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">{{ c.name }}</p>
              <p class="mt-0.5 truncate text-xs text-[color:var(--color-ink-soft)]">
                {{ c.courseSnapshot.clubName }} · {{ getFormatLabel(c.format) }}
              </p>
              <p data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">
                {{ progress(c) }}<template v-if="leader(c)"> · {{ leader(c)!.name }} {{ leader(c)!.value }}</template>
              </p>
            </div>
            <svg width="8" height="12" viewBox="0 0 8 12" class="text-[color:var(--color-ink-dim)]">
              <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </li>
        </ul>
      </section>

      <section v-if="visibleFinished.length > 0" class="mt-5">
        <p data-mono class="px-5 pb-2 text-[10px] text-[color:var(--color-ink-muted)]">
          Ferdig
        </p>
        <ul>
          <li
            v-for="c in visibleFinished"
            :key="c.id"
            class="flex cursor-pointer items-center gap-3 border-b border-[color:var(--color-line-soft)] px-5 py-3.5"
            @click="openCompetition(c)"
          >
            <div class="flex h-10 w-8 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
              <span data-mono class="text-[8px] text-[color:var(--color-ink-muted)]">{{ formatDate(c.date).top }}</span>
              <span data-num class="mt-0.5 text-base font-semibold leading-none">{{ formatDate(c.date).bottom }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-semibold tracking-tight text-[color:var(--color-ink)]">{{ c.name }}</p>
              <p class="mt-0.5 truncate text-xs text-[color:var(--color-ink-soft)]">
                {{ c.courseSnapshot.clubName }} · {{ getFormatLabel(c.format) }}
              </p>
              <p v-if="leader(c)" data-mono class="mt-1 text-[10px] text-[color:var(--color-ink-muted)]">
                {{ leader(c)!.name }} · {{ leader(c)!.value }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <button
      data-testid="new-competition"
      aria-label="Ny runde"
      class="absolute right-5 bottom-[calc(2rem+var(--safe-bottom))] flex h-14 w-14 items-center justify-center rounded-[20px] bg-[color:var(--color-accent)] text-[color:var(--color-bg)] shadow-[0_10px_30px_rgba(27,58,47,0.28),0_2px_6px_rgba(0,0,0,0.1)]"
      @click="router.push('/competitions/new')"
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 4v14M4 11h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
