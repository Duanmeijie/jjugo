<template>
  <div class="account page">
    <div class="container">
      <GlassCard>
        <h2>账户信息</h2>
        
        <div class="info-section">
          <div class="section-title">基本信息</div>
          <div class="user-avatar">
            <el-avatar :size="80" :src="userInfo?.avatar" />
          </div>
          <div class="user-nickname">
            昵称：{{ userInfo?.nickname || '未设置' }}
          </div>
        </div>
        
        <el-divider />
        
        <div class="info-section">
          <div class="section-title">实名认证信息</div>
          <div v-if="hasCompleteInfo" class="verified-badge">
            <el-icon color="#67c23a"><CircleCheck /></el-icon>
            <span>已完善实名信息</span>
          </div>
          <div v-else class="unverified-tip">
            <el-icon color="#E4393C"><Warning /></el-icon>
            <span>请完善以下信息后才能发布商品或购买</span>
          </div>
          
          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="info-form">
            <el-form-item label="学号" prop="student_id">
              <el-input v-model="form.student_id" placeholder="请输入学号" />
            </el-form-item>
            
            <el-form-item label="学院" prop="college">
              <el-input v-model="form.college" placeholder="请输入学院" />
            </el-form-item>
            
            <el-form-item label="班级" prop="class">
              <el-input v-model="form.class" placeholder="请输入班级" />
            </el-form-item>
            
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
            
            <el-form-item>
              <GlassButton variant="primary" @click="saveInfo" :loading="saving">
                保存信息
              </GlassButton>
            </el-form-item>
          </el-form>
        </div>
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
import { CircleCheck, Warning } from '@element-plus/icons-vue'
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const saving = ref(false)
const hasCompleteInfo = ref(false)

const form = ref({
  student_id: '',
  college: '',
  class: '',
  phone: ''
})

const rules = {
  student_id: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  college: [{ required: true, message: '请输入学院', trigger: 'blur' }],
  class: [{ required: true, message: '请输入班级', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
}

const userInfo = computed(() => userStore.userInfo)

const fetchUserInfo = async () => {
  try {
    const res = await request.get('/user/info')
    const data = res.data
    hasCompleteInfo.value = data.has_complete_info
    form.value.student_id = data.student_id || ''
    form.value.phone = data.phone || ''
  } catch (e) {
    console.error(e)
  }
}

const saveInfo = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  saving.value = true
  try {
    await request.put('/user/info', {
      student_id: form.value.student_id,
      phone: form.value.phone,
      nickname: userInfo.value?.nickname
    })
    hasCompleteInfo.value = true
    ElMessage.success('信息保存成功')
    await userStore.fetchUserInfo()
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  fetchUserInfo()
})
</script>

<style lang="scss" scoped>
.account {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  text-align: center;
  color: #ff6b6b;
  margin-bottom: 30px;
}

.info-section {
  padding: 20px;
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
  }
}

.user-avatar {
  text-align: center;
  margin-bottom: 16px;
}

.user-nickname {
  text-align: center;
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.verified-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 20px;
  color: #67c23a;
  font-weight: 600;
}

.unverified-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #fff5f5;
  border-radius: 8px;
  margin-bottom: 20px;
  color: #E4393C;
}

.info-form {
  margin-top: 20px;
}
</style>