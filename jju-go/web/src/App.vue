<template>
  <div id="app">
    <GlassNavbar>
      <template #left>
        <RouterLink to="/" class="nav-logo">九院易购</RouterLink>
      </template>
      <template #center>
        <RouterLink to="/" class="nav-link" :class="{ active: $route.path === '/' }">首页</RouterLink>
        <RouterLink to="/publish" class="nav-link" :class="{ active: $route.path === '/publish' }">发布</RouterLink>
        <RouterLink to="/orders" class="nav-link" :class="{ active: $route.path === '/orders' }">订单</RouterLink>
      </template>
      <template #right>
        <template v-if="userStore.isLoggedIn">
          <div class="user-menu" @click="showUserMenu = !showUserMenu">
            <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
            <span class="user-nickname">{{ userStore.userInfo?.nickname }}</span>
          </div>
          <transition name="fade">
            <div v-if="showUserMenu" class="dropdown-menu glass" @click="showUserMenu = false">
              <div class="dropdown-item" @click="$router.push('/profile')">个人中心</div>
              <div class="dropdown-item" @click="handleLogout">退出登录</div>
            </div>
          </transition>
        </template>
        <template v-else>
          <RouterLink to="/login">
            <GlassButton variant="primary" size="small">登录/注册</GlassButton>
          </RouterLink>
        </template>
      </template>
    </GlassNavbar>
    
    <main class="main">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
    
    <footer class="footer glass">
      <div class="container">
        <p>&copy; 2026 九院易购 - 校园二手交易平台</p>
      </div>
    </footer>
    <ChatBot />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import ChatBot from '@/components/ChatBot.vue'
import GlassNavbar from '@/components/GlassNavbar.vue'
import GlassButton from '@/components/GlassButton.vue'

const userStore = useUserStore()
const router = useRouter()
const showUserMenu = ref(false)

onMounted(async () => {
  await userStore.initialize()
})

const handleLogout = () => {
  userStore.logout()
  router.push('/')
  showUserMenu.value = false
}
</script>

<style lang="scss" scoped>
.main {
  min-height: calc(100vh - 120px);
  padding-top: 70px;
}

.footer {
  padding: 20px 0;
  text-align: center;
  color: var(--text-secondary, #6C6C70);
  margin-top: 40px;
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
  min-width: 140px;
  padding: 6px;
}

.dropdown-item {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary, #000);
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
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

.page-enter-active,
.page-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
}
</style>