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
import { formatCatalogEntryCount, formatGeneratedCatalogDate, nb } from '@/locales/nb'
import { useCompetitionsStore } from '@/stores/competitions'
import { usePlayersStore } from '@/stores/players'

const route = useRoute()
const playersStore = usePlayersStore()
const competitionsStore = useCompetitionsStore()
const catalogMeta = getCatalogMetadata()
const copy = nb.sidebar

const navigationItems = computed(() => [
  {
    to: '/',
    label: nb.routes.dashboard.title,
    icon: TrophyIcon,
    badge: competitionsStore.competitions.filter((competition) => competition.status === 'in_progress').length || undefined,
  },
  {
    to: '/players',
    label: nb.routes.players.title,
    icon: UsersRoundIcon,
    badge: playersStore.players.length || undefined,
  },
  {
    to: '/competitions/new',
    label: nb.routes.competitionNew.title,
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
            {{ nb.appName }}
          </p>
          <h2 class="text-lg font-semibold text-sidebar-foreground">
            {{ copy.title }}
          </h2>
        </div>
        <Badge variant="secondary" class="rounded-full">
          {{ copy.status }}
        </Badge>
      </div>

      <div class="rounded-2xl border border-sidebar-border/80 bg-sidebar-primary/8 p-3 text-sm text-sidebar-foreground/80">
        {{ copy.intro }}
      </div>
    </SidebarHeader>

    <SidebarContent class="px-2 py-4">
      <SidebarGroup>
        <SidebarGroupLabel>{{ copy.workspace }}</SidebarGroupLabel>
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
        <SidebarGroupLabel>{{ copy.catalog }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <div class="space-y-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 p-3 text-sm text-sidebar-foreground/80">
            <div class="flex items-start gap-2">
              <BookOpenTextIcon class="mt-0.5 size-4 shrink-0" />
              <div>
                <p class="font-medium text-sidebar-foreground">
                  {{ formatCatalogEntryCount(catalogMeta.totalCourses) }}
                </p>
                <p class="text-xs text-sidebar-foreground/65">
                  {{ copy.builtFromSeed }}
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2">
              <CircleDotDashedIcon class="mt-0.5 size-4 shrink-0" />
              <div>
                <p class="font-medium text-sidebar-foreground">
                  {{ formatGeneratedCatalogDate(catalogMeta.generatedAt) }}
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
      {{ copy.footer }}
    </SidebarFooter>
  </Sidebar>
</template>
