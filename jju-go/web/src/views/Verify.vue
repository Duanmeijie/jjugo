<template>
  <div class="verify page">
    <div class="container">
      <GlassCard class="verify-card" v-loading="loading">
        <div v-if="!verified" class="verify-form">
          <h2>订单核验</h2>
          <div class="order-info" v-if="order">
            <el-image :src="order.goods?.pics[0]" fit="cover" class="goods-img" />
            <div class="info">
              <div class="title">{{ order.goods?.title }}</div>
              <div class="price">¥{{ order.amount }}</div>
              <el-tag :type="order.status === 'completed' ? 'success' : 'warning'">
                {{ order.status === 'completed' ? '已完成' : '待核验' }}
              </el-tag>
            </div>
          </div>
          
          <div class="verify-input">
            <p class="tip">请输入买家提供的6位交易码完成核验</p>
            <el-input 
              v-model="inputCode" 
              placeholder="请输入6位交易码" 
              maxlength="6" 
              class="code-input"
              @keyup.enter="handleVerify"
            />
          </div>
          
          <div class="verify-actions">
            <GlassButton variant="primary" size="large" @click="handleVerify" :loading="verifying">
              {{ verifying ? '核验中...' : '确认核验' }}
            </GlassButton>
          </div>
        </div>
        
        <div v-else class="verify-success">
          <el-icon class="success-icon"><CircleCheck /></el-icon>
          <h2>核验成功</h2>
          <p class="tip">订单已完成，确认收货</p>
          <GlassButton variant="primary" @click="goOrders">查看订单</GlassButton>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { CircleCheck } from '@element-plus/icons-vue'
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const route = useRoute()
const router = useRouter()

const orderId = parseInt(route.query.id)
const order = ref(null)
const loading = ref(false)
const verifying = ref(false)
const verified = ref(false)
const inputCode = ref('')

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await request.get(`/orders/${orderId}`)
    order.value = res.data
    if (order.value.status === 'completed') {
      verified.value = true
    }
  } catch (e) {
    ElMessage.error('订单加载失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleVerify = async () => {
  if (!inputCode.value || inputCode.value.length !== 6) {
    ElMessage.warning('请输入6位交易码')
    return
  }
  
  verifying.value = true
  try {
    await request.post(`/orders/${orderId}/verify`, { trade_code: inputCode.value })
    verified.value = true
    ElMessage.success('核验成功')
  } catch (e) {
    ElMessage.error('核验失败，请检查交易码是否正确')
  } finally {
    verifying.value = false
  }
}

const goOrders = () => {
  router.push('/orders')
}

onMounted(() => {
  if (!orderId) {
    ElMessage.error('缺少订单ID')
    router.push('/orders')
    return
  }
  fetchOrder()
})
</script>

<style lang="scss" scoped>
.verify {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: 40px 20px;
}

.verify-card {
  width: 100%;
  max-width: 480px;
  padding: 30px;
  text-align: center;
}

.verify-form {
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 24px;
  }
}

.order-info {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: left;

  .goods-img {
    width: 80px;
    height: 80px;
    border-radius: 8px;
  }

  .info {
    flex: 1;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #111;
    margin-bottom: 8px;
  }

  .price {
    font-size: 20px;
    font-weight: 700;
    color: #E4393C;
    margin-bottom: 8px;
  }
}

.verify-input {
  margin-bottom: 24px;
  
  .tip {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }
  
  .code-input {
    :deep(.el-input__wrapper) {
      font-size: 24px;
      letter-spacing: 8px;
      text-align: center;
      padding: 12px 20px;
      border-radius: 12px;
    }
  }
}

.verify-actions {
  margin-top: 16px;
}

.verify-success {
  padding: 40px 0;
  
  .success-icon {
    font-size: 64px;
    color: #67c23a;
    margin-bottom: 20px;
  }
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 16px;
  }
  
  .tip {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
  }
}
</style>