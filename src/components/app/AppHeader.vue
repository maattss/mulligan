<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CalendarRangeIcon, FolderPlusIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

const route = useRoute()

const title = computed(() => typeof route.meta.title === 'string' ? route.meta.title : 'Mulligan')
const description = computed(() => typeof route.meta.description === 'string' ? route.meta.description : '')
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur md:px-6">
    <div class="flex items-start gap-3">
      <SidebarTrigger class="mt-0.5" />

      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
          Mulligan
        </p>
        <h1 class="text-xl font-semibold tracking-tight text-foreground">
          {{ title }}
        </h1>
        <p v-if="description" class="mt-1 max-w-2xl text-sm text-muted-foreground">
          {{ description }}
        </p>
      </div>

      <div class="hidden gap-2 md:flex">
        <Button as-child variant="outline">
          <RouterLink to="/players">
            <CalendarRangeIcon data-icon="inline-start" />
            Players
          </RouterLink>
        </Button>
        <Button as-child>
          <RouterLink to="/competitions/new">
            <FolderPlusIcon data-icon="inline-start" />
            New Competition
          </RouterLink>
        </Button>
      </div>
    </div>
  </header>
</template>
