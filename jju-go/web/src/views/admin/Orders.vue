<template>
  <div class="orders-admin">
    <el-card v-loading="loading">
      <div class="filter-bar">
        <el-select v-model="statusFilter" placeholder="筛选状态" clearable @change="fetchOrders">
          <el-option label="待支付" value="pending_pay" />
          <el-option label="待核验" value="pending_verify" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </div>
      
      <el-table :data="orders" stripe>
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
            <el-tag :type="row.status === 'completed' ? 'success' : row.status === 'pending_verify' ? 'warning' : row.status === 'cancelled' ? 'info' : ''">
              {{ row.status === 'completed' ? '已完成' : row.status === 'pending_verify' ? '待核验' : row.status === 'cancelled' ? '已取消' : '待支付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trade_code" label="交易码" width="100">
          <template #default="{ row }">
            {{ row.trade_code || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination v-if="total > pageSize" :current-page="page" :page-size="pageSize" :total="total" 
        @current-change="fetchOrders" layout="prev, pager, next" style="margin-top: 15px; justify-content: center" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'
import { formatTime } from '@/utils/format'

const orders = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const statusFilter = ref('')

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit: pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await request.get('/admin/orders', { params })
    orders.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchOrders())
</script>

<style lang="scss" scoped>
.filter-bar {
  margin-bottom: 15px;
}
</style>