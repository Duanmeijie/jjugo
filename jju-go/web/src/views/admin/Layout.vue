<template>
  <el-container class="admin-layout">
    <el-aside width="200px">
      <div class="logo">九院易购后台</div>
      <el-menu :default-active="activeMenu" router>
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/goods">
          <el-icon><Goods /></el-icon>
          <span>商品管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/orders">
          <el-icon><Document /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/sensitive-words">
          <el-icon><Warning /></el-icon>
          <span>敏感词管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-right">
          <span>管理员：{{ userStore.userInfo?.nickname }}</span>
          <el-button @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { DataAnalysis, User, Goods, Document, Warning } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const logout = () => {
  userStore.logout()
  router.push('/')
}
</script>

<style lang="scss" scoped>
.admin-layout {
  min-height: 100vh;
}

.el-aside {
  background: #304156;
  
  .logo {
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    padding: 20px;
    background: #2b3a4a;
  }
  
  .el-menu {
    border-right: none;
    background: #304156;
    
    .el-menu-item {
      color: #bfc9d4;
      
      &:hover, &.is-active {
        background: #263445;
        color: #409eff;
      }
    }
  }
}

.el-header {
  background: #fff;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;
  }
}

.el-main {
  background: #f0f2f5;
}
</style>