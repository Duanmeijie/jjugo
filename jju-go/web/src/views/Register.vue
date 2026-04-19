<template>
  <div class="register page">
    <div class="container">
      <el-card class="register-card">
        <h2>注册</h2>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="学号" prop="student_id">
            <el-input v-model="form.student_id" placeholder="10位数字学号" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="11位手机号" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="6-20位密码" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" placeholder="2-20位昵称" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" style="width: 100%" @click="submit" :loading="loading">注册</el-button>
          </el-form-item>
        </el-form>
        <div class="footer-link">
          <span>已有账号？</span>
          <RouterLink to="/login">去登录</RouterLink>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const form = ref({ student_id: '', phone: '', password: '', nickname: '' })

const validateStudentId = (rule, value, callback) => {
  if (!/^\d{10}$/.test(value)) {
    callback(new Error('学号必须为10位数字'))
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

const rules = {
  student_id: [{ required: true, validator: validateStudentId, trigger: 'blur' }],
  phone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
  password: [{ required: true, min: 6, max: 20, message: '密码6-20位', trigger: 'blur' }],
  nickname: [{ required: true, min: 2, max: 20, message: '昵称2-20位', trigger: 'blur' }]
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
  padding: 20px;
  
  h2 {
    text-align: center;
    margin-bottom: 20px;
    color: #ff6b6b;
  }
}

.footer-link {
  text-align: center;
  margin-top: 10px;
  a {
    color: #ff6b6b;
    margin-left: 5px;
  }
}
</style>