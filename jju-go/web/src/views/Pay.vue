<template>
  <div class="pay page">
    <div class="container">
      <el-card class="pay-card" v-loading="loading">
        <div v-if="!paid" class="pay-form">
          <h2>确认支付</h2>
          <div class="order-info" v-if="order">
            <el-image :src="order.goods?.pics[0]" fit="cover" class="goods-img" />
            <div class="info">
              <div class="title">{{ order.goods?.title }}</div>
              <div class="price">¥{{ order.amount }}</div>
            </div>
          </div>
          
          <div class="pay-actions">
            <el-button type="primary" size="large" @click="handlePay" :loading="paying">
              {{ paying ? '支付处理中...' : '确认支付' }}
            </el-button>
          </div>
        </div>
        
        <div v-else class="pay-success">
          <el-icon class="success-icon" color="#67c23a"><CircleCheck /></el-icon>
          <h2>支付成功</h2>
          <div class="trade-code">
            <div class="label">交易码</div>
            <div class="code">{{ tradeCode }}</div>
          </div>
          <p class="tip">请向卖家出示此交易码完成线下核验</p>
          <el-button type="primary" @click="goOrders">查看订单</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { CircleCheck } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const orderId = parseInt(route.params.orderId)
const order = ref(null)
const loading = ref(false)
const paying = ref(false)
const paid = ref(false)
const tradeCode = ref('')

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await request.get(`/orders/${orderId}`)
    order.value = res.data
    if (order.value.status === 'pending_verify') {
      paid.value = true
      tradeCode.value = order.value.trade_code
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handlePay = async () => {
  paying.value = true
  try {
    const res = await request.post(`/orders/${orderId}/pay`)
    tradeCode.value = res.data.trade_code
    paid.value = true
    ElMessage.success('支付成功')
  } catch (e) {
    console.error(e)
  } finally {
    paying.value = false
  }
}

const goOrders = () => router.push('/orders')

onMounted(() => fetchOrder())
</script>

<style lang="scss" scoped>
.pay {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
}

.pay-card {
  width: 500px;
  text-align: center;
}

.pay-form {
  h2 {
    color: #ff6b6b;
    margin-bottom: 30px;
  }
}

.order-info {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 30px;
}

.goods-img {
  width: 100px;
  height: 100px;
  border-radius: 4px;
}

.info {
  flex: 1;
  text-align: left;
}

.title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.price {
  font-size: 24px;
  color: #ff6b6b;
  font-weight: bold;
}

.pay-success {
  .success-icon {
    font-size: 60px;
    margin-bottom: 20px;
  }
  
  h2 {
    color: #67c23a;
    margin-bottom: 30px;
  }
}

.trade-code {
  background: #f5f5f5;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  
  .label {
    font-size: 14px;
    color: #999;
    margin-bottom: 10px;
  }
  
  .code {
    font-size: 48px;
    font-weight: bold;
    color: #ff6b6b;
    letter-spacing: 8px;
  }
}

.tip {
  color: #999;
  margin-bottom: 20px;
}
</style>