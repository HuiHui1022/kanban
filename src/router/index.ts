import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import KanbanView from '../views/KanbanView.vue'
import LoginView from '../views/LoginView.vue'
import SignupView from '../views/SignupView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupView,
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'kanban',
      component: KanbanView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  try {
    // Try to check authentication status if not already authenticated
    if (!authStore.isAuthenticated) {
      await authStore.checkAuth()
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return next('/login')
    }

    if (to.meta.requiresAdmin && !authStore.currentUser?.isAdmin) {
      return next('/')
    }

    next()
  } catch (error) {
    console.error('Navigation guard error:', error)
    if (to.meta.requiresAuth) {
      next('/login')
    } else {
      next()
    }
  }
})

export default router
