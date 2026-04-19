<template>
  <div id="app">
    <header class="header">
      <div class="container header-content">
        <RouterLink to="/" class="logo">九院易购</RouterLink>
        <nav class="nav">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink to="/publish">发布</RouterLink>
          <RouterLink to="/orders">订单</RouterLink>
        </nav>
        <div class="user-area">
          <template v-if="userStore.isLoggedIn">
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
                <span class="nickname">{{ userStore.userInfo?.nickname }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout">退出</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <RouterLink to="/login">
              <el-button type="primary">登录/注册</el-button>
            </RouterLink>
          </template>
        </div>
      </div>
    </header>
    <main class="main">
      <RouterView />
    </main>
    <footer class="footer">
      <div class="container">
        <p>&copy; 2026 九院易购 - 校园二手交易平台</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

userStore.fetchUserInfo()

const handleCommand = (command) => {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    userStore.logout()
    router.push('/')
  }
}
</script>

<style lang="scss" scoped>
.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  color: #ff6b6b;
}

.nav {
  display: flex;
  gap: 30px;
  a {
    font-size: 16px;
    &:hover, &.router-link-active {
      color: #ff6b6b;
    }
  }
}

.user-area {
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
}

.main {
  min-height: calc(100vh - 120px);
}

.footer {
  background: #fff;
  padding: 20px 0;
  text-align: center;
  color: #999;
}
</style>