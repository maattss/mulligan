import { createRouter, createWebHistory } from 'vue-router'

import CompetitionReviewView from '@/views/CompetitionReviewView.vue'
import CompetitionRoundView from '@/views/CompetitionRoundView.vue'
import CompetitionSetupView from '@/views/CompetitionSetupView.vue'
import CompetitionsListView from '@/views/CompetitionsListView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'competitions',
      component: CompetitionsListView,
      meta: { title: 'Competitions' },
    },
    {
      path: '/competitions/new',
      name: 'competition-new',
      component: CompetitionSetupView,
      meta: { title: 'New Competition' },
    },
    {
      path: '/competitions/:competitionId',
      name: 'competition-round',
      component: CompetitionRoundView,
      meta: { title: 'Live Round' },
    },
    {
      path: '/competitions/:competitionId/review',
      name: 'competition-review',
      component: CompetitionReviewView,
      meta: { title: 'Review' },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Mulligan'
  document.title = `${title} | Mulligan`
})

export default router
