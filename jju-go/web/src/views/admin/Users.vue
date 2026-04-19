<template>
  <div class="users-admin">
    <el-card v-loading="loading">
      <el-table :data="users" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="student_id" label="学号" width="120" />
        <el-table-column prop="nickname" label="昵称" width="100" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="role" label="角色" width="80">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : ''">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button v-if="row.role !== 'admin'" type="text" size="small" @click="toggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination v-if="total > pageSize" :current-page="page" :page-size="pageSize" :total="total" 
        @current-change="fetchUsers" layout="prev, pager, next" style="margin-top: 15px; justify-content: center" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'
import { formatTime } from '@/utils/format'
import { ElMessage, ElMessageBox } from 'element-plus'

const users = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/users', { params: { page: page.value, limit: pageSize.value } })
    users.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (user) => {
  const newStatus = user.status === 'active' ? 'banned' : 'active'
  try {
    await ElMessageBox.confirm(`确定要${newStatus === 'banned' ? '禁用' : '启用'}该用户吗？`, '提示')
    await request.put(`/admin/users/${user.id}/status`, { status: newStatus })
    ElMessage.success('操作成功')
    fetchUsers()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

onMounted(() => fetchUsers())
</script>

<style lang="scss" scoped>
</style>