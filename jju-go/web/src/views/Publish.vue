<template>
  <div class="publish page">
    <div class="container">
      <el-card>
        <h2>发布商品</h2>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="2-100字符" />
          </el-form-item>
          
          <el-form-item label="分类" prop="category_id">
            <el-select v-model="form.category_id" placeholder="选择分类">
              <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="价格" prop="price">
            <el-input-number v-model="form.price" :min="0.01" :precision="2" />
          </el-form-item>
          
          <el-form-item label="描述" prop="description">
            <el-input type="textarea" v-model="form.description" :rows="6" placeholder="10-2000字符商品的详细描述" />
          </el-form-item>
          
          <el-form-item label="图片">
            <el-upload ref="uploadRef" action="/api/goods" :headers="uploadHeaders" :data="uploadData" :multiple="true" :limit="5" :auto-upload="false" :on-change="handleChange" :on-success="handleSuccess" :on-error="handleError" list-type="picture-card" accept="image/jpeg,image/png,image/jpg,image/webp">
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="submit" :loading="loading">发布</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const uploadRef = ref()
const loading = ref(false)
const categories = ref([])
const uploadedFiles = ref([])

const form = ref({
  title: '',
  category_id: '',
  price: 1,
  description: ''
})

const rules = {
  title: [{ required: true, min: 2, max: 100, message: '标题2-100字符', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  description: [{ required: true, min: 10, max: 2000, message: '描述10-2000字符', trigger: 'blur' }]
}

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const uploadData = computed(() => ({
  title: form.value.title,
  description: form.value.description,
  price: form.value.price,
  category_id: form.value.category_id
}))

const handleChange = (file, files) => {
  uploadedFiles.value = files
}

const handleSuccess = (response) => {
  ElMessage.success('发布成功')
  router.push('/')
}

const handleError = (error) => {
  ElMessage.error(error.message || '发布失败')
  loading.value = false
}

const submit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  if (uploadedFiles.value.length === 0) {
    ElMessage.warning('请上传至少1张图片')
    return
  }
  
  loading.value = true
  uploadRef.value.submit()
}

const fetchCategories = async () => {
  try {
    const res = await request.get('/goods/categories')
    categories.value = res.data.flatMap(c => c.children.length ? c.children : [c])
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  fetchCategories()
})
</script>

<style lang="scss" scoped>
.publish {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  text-align: center;
  color: #ff6b6b;
  margin-bottom: 20px;
}
</style>