<template>
  <div class="login page">
    <div class="container">
      <GlassCard class="login-card">
        <h2>登录</h2>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="学号" prop="student_id">
            <el-input v-model="form.student_id" placeholder="请输入学号" class="glass-input" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" class="glass-input" @keyup.enter="submit" />
          </el-form-item>
          <el-form-item>
            <GlassButton variant="primary" style="width: 100%" @click="submit" :loading="loading">
              登录
            </GlassButton>
          </el-form-item>
        </el-form>
        <div class="footer-link">
          <span>还没有账号？</span>
          <RouterLink to="/register">去注册</RouterLink>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = ref({ student_id: '', password: '' })
const rules = {
  student_id: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const submit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await request.post('/auth/login', form.value)
    userStore.setToken(res.data.token)
    await userStore.fetchUserInfo()
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
}

.login-card {
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