<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  BookOpenTextIcon,
  CircleDotDashedIcon,
  FolderPlusIcon,
  TrophyIcon,
  UsersRoundIcon,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { getCatalogMetadata } from '@/lib/course-catalog'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const route = useRoute()
const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const catalogMeta = getCatalogMetadata()

const navigationItems = computed(() => [
  {
    to: '/',
    label: 'Scoreboard',
    icon: TrophyIcon,
    badge: competitionsStore.competitions.filter((competition) => competition.status === 'in_progress').length || undefined,
  },
  {
    to: '/players',
    label: 'Players',
    icon: UsersRoundIcon,
    badge: playersStore.players.length || undefined,
  },
  {
    to: '/competitions/new',
    label: 'New Competition',
    icon: FolderPlusIcon,
  },
])
</script>

<template>
  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader class="gap-3 border-b border-sidebar-border/80 px-4 py-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/60">
            Mulligan
          </p>
          <h2 class="text-lg font-semibold text-sidebar-foreground">
            Clubhouse
          </h2>
        </div>
        <Badge variant="secondary" class="rounded-full">
          Offline
        </Badge>
      </div>

      <div class="rounded-2xl border border-sidebar-border/80 bg-sidebar-primary/8 p-3 text-sm text-sidebar-foreground/80">
        One scorer, local rounds, seeded Bergen and Stavanger catalog.
      </div>
    </SidebarHeader>

    <SidebarContent class="px-2 py-4">
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigationItems" :key="item.to">
              <SidebarMenuButton as-child :is-active="route.path === item.to" :tooltip="item.label">
                <RouterLink :to="item.to">
                  <component :is="item.icon" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
              <SidebarMenuBadge v-if="item.badge">
                {{ item.badge }}
              </SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>Catalog</SidebarGroupLabel>
        <SidebarGroupContent>
          <div class="space-y-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 p-3 text-sm text-sidebar-foreground/80">
            <div class="flex items-start gap-2">
              <BookOpenTextIcon class="mt-0.5 size-4 shrink-0" />
              <div>
                <p class="font-medium text-sidebar-foreground">
                  {{ catalogMeta.totalCourses }} bundled courses
                </p>
                <p class="text-xs text-sidebar-foreground/65">
                  Built from the local seed and sync pipeline.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2">
              <CircleDotDashedIcon class="mt-0.5 size-4 shrink-0" />
              <div>
                <p class="font-medium text-sidebar-foreground">
                  Generated {{ new Date(catalogMeta.generatedAt).toLocaleDateString() }}
                </p>
                <p class="text-xs text-sidebar-foreground/65">
                  {{ catalogMeta.source }}
                </p>
              </div>
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="border-t border-sidebar-border/80 px-4 py-4 text-xs text-sidebar-foreground/65">
      Handicap-aware scoring and quick competition setup for local buddy games.
    </SidebarFooter>
  </Sidebar>
</template>
