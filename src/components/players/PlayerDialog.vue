<script setup lang="ts">
import { reactive, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import { Textarea } from '@/components/ui/textarea'
import type { PlayerProfile } from '@/lib/golf'

const props = defineProps<{
  open: boolean
  player?: PlayerProfile | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [payload: {
    id?: string
    name: string
    handicapIndex: number
    homeClub?: string
    notes?: string
  }]
}>()

const draft = reactive({
  id: undefined as string | undefined,
  name: '',
  handicapIndex: 18.4,
  homeClub: '',
  notes: '',
})

watch(
  () => props.player,
  (player) => {
    draft.id = player?.id
    draft.name = player?.name ?? ''
    draft.handicapIndex = player?.handicapIndex ?? 18.4
    draft.homeClub = player?.homeClub ?? ''
    draft.notes = player?.notes ?? ''
  },
  { immediate: true },
)

function close() {
  emit('update:open', false)
}

function submit() {
  if (!draft.name.trim()) {
    toast.error('A player name is required.')
    return
  }

  emit('save', {
    id: draft.id,
    name: draft.name,
    handicapIndex: Number(draft.handicapIndex),
    homeClub: draft.homeClub,
    notes: draft.notes,
  })
  close()
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>
          {{ player ? 'Edit Player' : 'Add Player' }}
        </DialogTitle>
        <DialogDescription>
          Save the name and handicap snapshot you want to reuse during local competitions.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field>
          <FieldLabel for="player-name">
            Name
          </FieldLabel>
          <Input id="player-name" v-model="draft.name" placeholder="Mats" />
        </Field>

        <Field>
          <FieldLabel>
            Handicap Index
          </FieldLabel>
          <NumberField v-model="draft.handicapIndex" :min="-5" :max="54" :step="0.1">
            <NumberFieldContent>
              <NumberFieldInput />
              <NumberFieldDecrement />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
          <FieldDescription>
            This value is copied into each competition snapshot when you create a round.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel for="player-home-club">
            Home Club
          </FieldLabel>
          <Input id="player-home-club" v-model="draft.homeClub" placeholder="Stavanger Golfklubb" />
        </Field>

        <Field>
          <FieldLabel for="player-notes">
            Notes
          </FieldLabel>
          <Textarea id="player-notes" v-model="draft.notes" rows="4" placeholder="Optional reminders about tees or competition preferences." />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button variant="outline" @click="close">
          Cancel
        </Button>
        <Button @click="submit">
          Save Player
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
