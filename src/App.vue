<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/app/AppHeader.vue'
import AppSidebar from '@/components/app/AppSidebar.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()

const ready = computed(() => playersStore.hydrated && competitionsStore.hydrated)

onMounted(async () => {
  await Promise.all([
    playersStore.hydrate(),
    competitionsStore.hydrate(),
  ])
})
</script>

<template>
  <SidebarProvider>
    <AppSidebar />

    <SidebarInset class="bg-[radial-gradient(circle_at_top,_rgba(31,122,88,0.08),_transparent_32%),linear-gradient(180deg,_rgba(246,240,223,0.96),_rgba(255,255,255,0.98))]">
      <AppHeader />

      <main class="min-h-[calc(100svh-5rem)] px-4 py-6 md:px-6 md:py-8">
        <div v-if="!ready" class="grid gap-4 md:grid-cols-3">
          <Skeleton class="h-44 rounded-3xl" />
          <Skeleton class="h-44 rounded-3xl" />
          <Skeleton class="h-44 rounded-3xl" />
        </div>

        <RouterView v-else />
      </main>
    </SidebarInset>

    <Toaster rich-colors position="top-right" />
  </SidebarProvider>
</template>
