<template>
  <div class="publish page">
    <div class="container">
      <GlassCard>
        <h2>发布商品</h2>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-divider content-position="left">基本信息</el-divider>
          
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="2-100字符" class="glass-input" />
          </el-form-item>
          
          <el-form-item label="分类" prop="category_id">
            <el-select v-model="form.category_id" placeholder="选择分类" class="glass-input">
              <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="价格" prop="price">
            <el-input-number v-model="form.price" :min="0.01" :precision="2" />
          </el-form-item>
          
          <el-form-item label="描述" prop="description">
            <el-input type="textarea" v-model="form.description" :rows="6" placeholder="10-2000字符商品的详细描述" class="glass-input" />
          </el-form-item>
          
          <el-form-item label="商品图片">
            <el-upload ref="uploadRef" action="/api/goods" :headers="uploadHeaders" :data="uploadData" :multiple="true" :limit="5" :auto-upload="false" :on-change="handleChange" :on-success="handleSuccess" :on-error="handleError" list-type="picture-card" accept="image/jpeg,image/png,image/jpg,image/webp">
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div class="upload-tip">最多上传5张图片</div>
          </el-form-item>
          
          <el-divider content-position="left">实名认证（必填）</el-divider>
          
          <el-form-item label="学号" prop="student_id">
            <el-input v-model="form.student_id" placeholder="请输入学号" class="glass-input" />
          </el-form-item>
          
          <el-form-item label="学院" prop="college">
            <el-input v-model="form.college" placeholder="请输入学院" class="glass-input" />
          </el-form-item>
          
          <el-form-item label="班级" prop="class">
            <el-input v-model="form.class" placeholder="请输入班级" class="glass-input" />
          </el-form-item>
          
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入联系电话" class="glass-input" />
          </el-form-item>
          
          <el-divider content-position="left">交易约定（可选）</el-divider>
          
          <el-form-item label="期望交易时间">
            <div class="time-slots">
              <el-checkbox-group v-model="form.preferred_time_slots">
                <el-checkbox-button v-for="slot in timeSlotOptions" :key="slot" :label="slot">
                  {{ slot }}
                </el-checkbox-button>
              </el-checkbox-group>
            </div>
            <div class="form-tip">选择方便交易的时间段</div>
          </el-form-item>
          
          <el-form-item label="交易地点">
            <el-input v-model="form.preferred_location" placeholder="例如：一食堂附近、生活区操场等" class="glass-input" />
            <div class="form-tip">建议填写校园内具体地点，方便买家联系</div>
          </el-form-item>
          
          <el-form-item>
            <GlassButton variant="primary" @click="submit" :loading="loading">发布商品</GlassButton>
          </el-form-item>
        </el-form>
      </GlassCard>
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
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const uploadRef = ref()
const loading = ref(false)
const categories = ref([])
const uploadedFiles = ref([])

const timeSlotOptions = [
  '08:00-09:30', '09:30-11:00', '11:00-12:30', '12:00-13:30',
  '13:30-15:00', '15:00-16:30', '16:30-18:00', '18:00-19:00',
  '19:00-20:30', '20:30-22:00'
]

const form = ref({
  title: '',
  category_id: '',
  price: 1,
  description: '',
  student_id: '',
  college: '',
  class: '',
  phone: '',
  preferred_time_slots: [],
  preferred_location: ''
})

const rules = {
  title: [{ required: true, min: 2, max: 100, message: '标题2-100字符', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  description: [{ required: true, min: 10, max: 2000, message: '描述10-2000字符', trigger: 'blur' }],
  student_id: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  college: [{ required: true, message: '请输入学院', trigger: 'blur' }],
  class: [{ required: true, message: '请输入班级', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const uploadData = computed(() => ({
  title: form.value.title,
  description: form.value.description,
  price: form.value.price,
  category_id: form.value.category_id,
  student_id: form.value.student_id,
  college: form.value.college,
  class: form.value.class,
  phone: form.value.phone,
  preferred_time_slots: JSON.stringify(form.value.preferred_time_slots),
  preferred_location: form.value.preferred_location
}))

const handleChange = (file, files) => {
  uploadedFiles.value = files
}

const handleSuccess = () => {
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
  margin-bottom: 24px;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.time-slots {
  .el-checkbox-button {
    margin-bottom: 8px;
  }
}

:deep(.el-divider__text) {
  color: #E4393C;
  font-weight: 600;
  background: #fff5f5;
}
</style>