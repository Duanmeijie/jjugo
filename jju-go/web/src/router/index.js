import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/views/Register.vue') },
  { path: '/goods/:id', name: 'GoodsDetail', component: () => import('@/views/GoodsDetail.vue') },
  { path: '/publish', name: 'Publish', component: () => import('@/views/Publish.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/views/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/orders', name: 'Orders', component: () => import('@/views/Orders.vue'), meta: { requiresAuth: true } },
  { path: '/verify', name: 'Verify', component: () => import('@/views/Verify.vue'), meta: { requiresAuth: true } },
  { path: '/pay/:orderId', name: 'Pay', component: () => import('@/views/Pay.vue'), meta: { requiresAuth: true } },
  { path: '/admin', redirect: '/admin/dashboard' },
  { path: '/admin/dashboard', name: 'Dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { requiresAdmin: true } },
  { path: '/admin/users', name: 'Users', component: () => import('@/views/admin/Users.vue'), meta: { requiresAdmin: true } },
  { path: '/admin/goods', name: 'Goods', component: () => import('@/views/admin/Goods.vue'), meta: { requiresAdmin: true } },
  { path: '/admin/orders', name: 'AdminOrders', component: () => import('@/views/admin/Orders.vue'), meta: { requiresAdmin: true } },
  { path: '/admin/sensitive-words', name: 'SensitiveWords', component: () => import('@/views/admin/SensitiveWords.vue'), meta: { requiresAdmin: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const whiteList = ['/login', '/register']

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin) {
    if (!token) {
      next('/login')
    } else {
      try {
        const userStore = useUserStore()
        if (!userStore.userInfo) {
          await userStore.fetchUserInfo()
        }
        if (!userStore.userInfo || userStore.userInfo.role !== 'admin') {
          next('/')
        } else {
          next()
        }
      } catch (e) {
        next('/login')
      }
    }
  } else if (!token && !whiteList.includes(to.path)) {
    next()
  } else {
    next()
  }
})

export default router