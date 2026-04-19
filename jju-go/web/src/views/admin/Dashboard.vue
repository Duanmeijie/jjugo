<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总用户数" :value="stats.total_users">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总商品数" :value="stats.total_goods">
            <template #prefix>
              <el-icon><Goods /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总订单数" :value="stats.total_orders">
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card stat-today">
          <el-statistic title="今日订单" :value="stats.today_orders">
            <template #prefix>
              <el-icon><Calendar /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>
    
    <el-card class="recent-orders" v-loading="loading">
      <template #header>
        <span>最近订单</span>
      </template>
      <el-table :data="recentOrders" stripe>
        <el-table-column prop="id" label="订单ID" width="80" />
        <el-table-column prop="goods_title" label="商品" show-overflow-tooltip />
        <el-table-column prop="buyer_nickname" label="买家" width="100" />
        <el-table-column prop="seller_nickname" label="卖家" width="100" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : row.status === 'pending_verify' ? 'warning' : ''">
              {{ row.status === 'completed' ? '已完成' : row.status === 'pending_verify' ? '待核验' : '待支付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'
import { formatTime } from '@/utils/format'
import { User, Goods, Document, Calendar } from '@element-plus/icons-vue'

const stats = ref({ total_users: 0, total_goods: 0, total_orders: 0, today_orders: 0 })
const recentOrders = ref([])
const loading = ref(false)

const fetchStats = async () => {
  try {
    const res = await request.get('/admin/stats')
    stats.value = res.data
  } catch (e) {
    console.error(e)
  }
}

const fetchRecentOrders = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/orders', { params: { limit: 10 } })
    recentOrders.value = res.data.list
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchRecentOrders()
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stat-card {
    .el-statistic__head {
      font-size: 14px;
    color: #999;
    margin-bottom: 10px;
    }
    .el-statistic__content {
      font-size: 32px;
      color: #409eff;
    }
  }
  
  .stat-today .el-statistic__content {
    color: #67c23a;
  }
  
  .recent-orders {
    margin-top: 20px;
  }
}
</style>