<script setup lang="ts">
import { computed } from 'vue'
import { MinusIcon, PlusIcon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  label: string
  subtitle?: string
  value: number | null
  badge?: string
  par: number
}>()

const emit = defineEmits<{
  update: [value: number | null]
}>()

const displayValue = computed(() => props.value === null ? '' : String(props.value))

function nudge(delta: number) {
  const nextValue = Math.max(1, (props.value ?? props.par) + delta)
  emit('update', nextValue)
}

function handleInput(next: string | number) {
  const raw = typeof next === 'number' ? String(next) : next

  if (!raw) {
    emit('update', null)
    return
  }

  const numericValue = Number(raw)
  emit('update', Number.isFinite(numericValue) ? Math.max(1, numericValue) : null)
}
</script>

<template>
  <Card class="border-border/80 bg-card/80 backdrop-blur">
    <CardHeader class="gap-3 pb-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <CardTitle class="text-lg">
            {{ label }}
          </CardTitle>
          <CardDescription v-if="subtitle">
            {{ subtitle }}
          </CardDescription>
        </div>

        <Badge v-if="badge" variant="secondary" class="rounded-full">
          {{ badge }}
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3">
        <Button variant="outline" class="h-14 rounded-2xl" @click="nudge(-1)">
          <MinusIcon />
        </Button>

        <Input
          inputmode="numeric"
          type="number"
          min="1"
          :model-value="displayValue"
          class="h-16 rounded-2xl border-border/90 text-center text-2xl font-semibold tracking-tight"
          @update:model-value="handleInput"
        />

        <Button variant="outline" class="h-14 rounded-2xl" @click="nudge(1)">
          <PlusIcon />
        </Button>
      </div>

      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        Hole par {{ par }}
      </p>
    </CardContent>
  </Card>
</template>
