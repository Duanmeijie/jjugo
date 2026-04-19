<template>
  <div class="goods-admin">
    <el-card v-loading="loading">
      <div class="filter-bar">
        <el-select v-model="statusFilter" placeholder="筛选状态" clearable @change="fetchGoods">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已售出" value="sold" />
        </el-select>
      </div>
      
      <el-table :data="goods" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="商品标题" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="seller_nickname" label="卖家" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : row.status === 'sold' ? 'info' : 'warning'">
              {{ row.status === 'approved' ? '已通过' : row.status === 'rejected' ? '已拒绝' : row.status === 'sold' ? '已售出' : '待审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="view_count" label="浏览" width="80" />
        <el-table-column prop="created_at" label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="text" size="small" @click="changeStatus(row, 'approved')">通过</el-button>
            <el-button v-if="row.status === 'pending'" type="text" size="small" @click="changeStatus(row, 'rejected')">拒绝</el-button>
            <el-button v-if="row.status === 'approved'" type="text" size="small" @click="changeStatus(row, 'rejected')">下架</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination v-if="total > pageSize" :current-page="page" :page-size="pageSize" :total="total" 
        @current-change="fetchGoods" layout="prev, pager, next" style="margin-top: 15px; justify-content: center" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'
import { formatTime } from '@/utils/format'
import { ElMessage, ElMessageBox } from 'element-plus'

const goods = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const statusFilter = ref('')

const fetchGoods = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit: pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await request.get('/admin/goods', { params })
    goods.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const changeStatus = async (item, newStatus) => {
  try {
    await ElMessageBox.confirm(`确定要${newStatus === 'approved' ? '通过' : newStatus === 'rejected' ? '拒绝' : '下架'}该商品吗？`, '提示')
    await request.put(`/admin/goods/${item.id}/status`, { status: newStatus })
    ElMessage.success('操作成功')
    fetchGoods()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

onMounted(() => fetchGoods())
</script>

<style lang="scss" scoped>
.filter-bar {
  margin-bottom: 15px;
}
</style>