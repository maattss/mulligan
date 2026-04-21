import { createRouter, createWebHistory } from 'vue-router'

import CompetitionRoundView from '@/views/CompetitionRoundView.vue'
import CompetitionSetupView from '@/views/CompetitionSetupView.vue'
import DashboardView from '@/views/DashboardView.vue'
import { nb } from '@/locales/nb'
import PlayersView from '@/views/PlayersView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        title: nb.routes.dashboard.title,
        description: nb.routes.dashboard.description,
      },
    },
    {
      path: '/players',
      name: 'players',
      component: PlayersView,
      meta: {
        title: nb.routes.players.title,
        description: nb.routes.players.description,
      },
    },
    {
      path: '/competitions/new',
      name: 'competition-new',
      component: CompetitionSetupView,
      meta: {
        title: nb.routes.competitionNew.title,
        description: nb.routes.competitionNew.description,
      },
    },
    {
      path: '/competitions/:competitionId',
      name: 'competition-round',
      component: CompetitionRoundView,
      meta: {
        title: nb.routes.competitionRound.title,
        description: nb.routes.competitionRound.description,
      },
    },
  ],
  scrollBehavior() {
    return {
      top: 0,
    }
  },
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : nb.appName
  document.title = `${title} | ${nb.appName}`
})

export default router
