<template>
  <div class="register page">
    <div class="container">
      <GlassCard class="register-card">
        <h2>注册</h2>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="学号" prop="student_id">
            <el-input v-model="form.student_id" placeholder="11位数字学号" class="glass-input" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="11位手机号" class="glass-input" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="3-15位密码" class="glass-input" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" placeholder="最多20位昵称" class="glass-input" />
          </el-form-item>
          <el-form-item>
            <GlassButton variant="primary" style="width: 100%" @click="submit" :loading="loading">
              注册
            </GlassButton>
          </el-form-item>
        </el-form>
        <div class="footer-link">
          <span>已有账号？</span>
          <RouterLink to="/login">去登录</RouterLink>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const form = ref({ student_id: '', phone: '', password: '', nickname: '' })

const validateStudentId = (rule, value, callback) => {
  if (!/^\d{11}$/.test(value)) {
    callback(new Error('学号必须为11位数字'))
  } else {
    callback()
  }
}

const validatePhone = (rule, value, callback) => {
  if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('手机号格式错误'))
  } else {
    callback()
  }
}

const validatePassword = (rule, value, callback) => {
  if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{3,15}$/.test(value)) {
    callback(new Error('密码3-15位，支持字母/数字/特殊字符'))
  } else {
    callback()
  }
}

const validateNickname = (rule, value, callback) => {
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9]{1,20}$/.test(value)) {
    callback(new Error('昵称支持中英文，最多20位'))
  } else {
    callback()
  }
}

const rules = {
  student_id: [{ required: true, validator: validateStudentId, trigger: 'blur' }],
  phone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  nickname: [{ required: true, validator: validateNickname, trigger: 'blur' }]
}

const submit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await request.post('/auth/register', form.value)
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.register {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
}

.register-card {
  width: 400px;
  padding: 30px;
  
  h2 {
    text-align: center;
    margin-bottom: 24px;
    color: #ff6b6b;
  }
}

.footer-link {
  text-align: center;
  margin-top: 16px;
  a {
    color: #007AFF;
    margin-left: 5px;
    font-weight: 500;
  }
}
</style>