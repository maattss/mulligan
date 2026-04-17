import { createRouter, createWebHistory } from 'vue-router'

import CompetitionRoundView from '@/views/CompetitionRoundView.vue'
import CompetitionSetupView from '@/views/CompetitionSetupView.vue'
import DashboardView from '@/views/DashboardView.vue'
import PlayersView from '@/views/PlayersView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        title: 'Scoreboard',
        description: 'Overview of local players, active rounds, and recent results.',
      },
    },
    {
      path: '/players',
      name: 'players',
      component: PlayersView,
      meta: {
        title: 'Players',
        description: 'Maintain the handicap profiles used when you create local competitions.',
      },
    },
    {
      path: '/competitions/new',
      name: 'competition-new',
      component: CompetitionSetupView,
      meta: {
        title: 'New Competition',
        description: 'Choose the course, format, buddies, tees, and side games before the round starts.',
      },
    },
    {
      path: '/competitions/:competitionId',
      name: 'competition-round',
      component: CompetitionRoundView,
      meta: {
        title: 'Live Round',
        description: 'Keep score hole-by-hole, review the live leaderboard, and finish the competition offline.',
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
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Mulligan'
  document.title = `${title} | Mulligan`
})

export default router
