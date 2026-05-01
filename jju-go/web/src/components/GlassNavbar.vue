<template>
  <header :class="['glass-nav', { scrolled: isScrolled }]">
    <div class="nav-left">
      <slot name="left">
        <RouterLink to="/" class="nav-logo">九院易购</RouterLink>
      </slot>
    </div>
    
    <nav class="nav-center">
      <slot name="center">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="nav-link"
          :class="{ active: isActive(link.path) }"
        >
          {{ link.name }}
        </RouterLink>
      </slot>
    </nav>
    
    <div class="nav-right">
      <slot name="right">
        <GlassButton
          v-if="!userStore.isLoggedIn"
          variant="primary"
          size="small"
          @click="$router.push('/login')"
        >
          登录
        </GlassButton>
        <div v-else class="user-menu" @click="showUserMenu = !showUserMenu">
          <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
          <span class="user-nickname">{{ userStore.userInfo?.nickname }}</span>
          <transition name="fade">
            <div v-if="showUserMenu" class="dropdown-menu glass">
              <div class="dropdown-item" @click.stop="$router.push('/cart')">
                <el-icon><ShoppingCart /></el-icon> 购物车
              </div>
              <div class="dropdown-item" @click.stop="$router.push('/account')">
                <el-icon><Setting /></el-icon> 账户设置
              </div>
              <div class="dropdown-item" @click.stop="$router.push('/profile')">
                <el-icon><User /></el-icon> 个人中心
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click.stop="handleLogout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </div>
            </div>
          </transition>
        </div>
      </slot>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ShoppingCart, Setting, User, SwitchButton } from '@element-plus/icons-vue'
import GlassButton from './GlassButton.vue'

defineProps({
  navLinks: {
    type: Array,
    default: () => [
      { name: '首页', path: '/' },
      { name: '购物车', path: '/cart' },
      { name: '发布', path: '/publish' },
      { name: '订单', path: '/orders' }
    ]
  }
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isScrolled = ref(false)
const showUserMenu = ref(false)

const isActive = (path) => {
  return route.path === path
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

const handleLogout = () => {
  userStore.logout()
  router.push('/')
  showUserMenu.value = false
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style lang="scss" scoped>
.glass-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  transition: backdrop-filter 200ms ease, background 200ms ease;

  &.scrolled {
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    background: rgba(255, 255, 255, 0.8);
  }
}

@media (prefers-color-scheme: dark) {
  .glass-nav {
    background: rgba(0, 0, 0, 0.5);
    border-bottom-color: rgba(255, 255, 255, 0.1);

    &.scrolled {
      background: rgba(0, 0, 0, 0.8);
    }
  }
}

:global([data-theme="dark"]) .glass-nav {
  background: rgba(0, 0, 0, 0.5);
  border-bottom-color: rgba(255, 255, 255, 0.1);

  &.scrolled {
    background: rgba(0, 0, 0, 0.8);
  }
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-center {
  display: flex;
  gap: 24px;
}

.nav-logo {
  font-size: 20px;
  font-weight: 700;
  color: #ff6b6b;
  text-decoration: none;
}

.nav-link {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary, #6C6C70);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 150ms ease;

  &:hover {
    color: var(--text-primary, #000);
    background: rgba(0, 0, 0, 0.05);
  }

  &.active {
    color: #007AFF;
    background: rgba(0, 122, 255, 0.1);
  }
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 150ms ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .user-nickname {
    font-size: 14px;
    font-weight: 500;
  }
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  padding: 6px;
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary, #000);
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .el-icon {
    font-size: 16px;
  }
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 6px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>