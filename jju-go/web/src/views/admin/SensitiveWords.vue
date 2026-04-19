<template>
  <div class="sensitive-words-admin">
    <el-card v-loading="loading">
      <div class="add-bar">
        <el-input v-model="newWord" placeholder="输入敏感词" style="width: 200px; margin-right: 10px" />
        <el-select v-model="newLevel" placeholder="风险等级" style="width: 120px; margin-right: 10px">
          <el-option label="低风险" :value="1" />
          <el-option label="中风险" :value="2" />
          <el-option label="高风险" :value="3" />
        </el-select>
        <el-button type="primary" @click="addWord">添加</el-button>
      </div>
      
      <el-table :data="words" stripe style="margin-top: 20px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="word" label="敏感词" />
        <el-table-column prop="level" label="风险等级" width="120">
          <template #default="{ row }">
            <el-tag :type="row.level === 1 ? '' : row.level === 2 ? 'warning' : 'danger'">
              {{ row.level === 1 ? '低风险' : row.level === 2 ? '中风险' : '高风险' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="deleteWord(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const words = ref([])
const loading = ref(false)
const newWord = ref('')
const newLevel = ref(1)

const fetchWords = async () => {
  loading.value = true
  try {
    const res = await request.get('/admin/sensitive-words')
    words.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const addWord = async () => {
  if (!newWord.value.trim()) {
    ElMessage.warning('请输入敏感词')
    return
  }
  try {
    await request.post('/admin/sensitive-words', { word: newWord.value, level: newLevel.value })
    ElMessage.success('添加成功')
    newWord.value = ''
    fetchWords()
  } catch (e) {
    console.error(e)
  }
}

const deleteWord = async (word) => {
  try {
    await ElMessageBox.confirm('确定要删除该敏感词吗？', '提示')
    await request.delete(`/admin/sensitive-words/${word.id}`)
    ElMessage.success('删除成功')
    fetchWords()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

onMounted(() => fetchWords())
</script>

<style lang="scss" scoped>
.add-bar {
  display: flex;
}
</style>