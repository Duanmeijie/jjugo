<template>
  <div class="pay page">
    <div class="container">
      <el-card class="pay-card" v-loading="loading">
        <div v-if="!paid" class="pay-form">
          <h2>确认支付</h2>
          
          <div class="identity-confirm">
            <div class="confirm-title">
              <el-icon color="#E4393C"><InfoFilled /></el-icon>
              订单身份信息确认
            </div>
            <div class="confirm-content">
              <div class="confirm-item">
                <span class="label">学号：</span>
                <span class="value">{{ userInfo?.student_id || '未填写' }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">手机号：</span>
                <span class="value">{{ userInfo?.phone || '未填写' }}</span>
              </div>
              <div v-if="!hasCompleteInfo" class="confirm-tip">
                <el-icon color="#E4393C"><Warning /></el-icon>
                请先完善个人身份信息
                <el-button type="primary" size="small" @click="goAccount">去完善</el-button>
              </div>
            </div>
          </div>
          
          <div class="order-info" v-if="order">
            <el-image :src="order.goods?.pics?.[0]" fit="cover" class="goods-img" />
            <div class="info">
              <div class="title">{{ order.goods?.title }}</div>
              <div class="price">¥{{ order.amount }}</div>
              <div v-if="order.goods?.preferred_location" class="trade-location">
                交易地点：{{ order.goods?.preferred_location }}
              </div>
              <div v-if="order.goods?.preferred_time_slots?.length" class="trade-time">
                交易时间：{{ order.goods?.preferred_time_slots?.join('、') }}
              </div>
            </div>
          </div>
          
          <div class="pay-actions">
            <el-button 
              type="primary" 
              size="large" 
              @click="handlePay" 
              :loading="paying"
              :disabled="!hasCompleteInfo"
            >
              {{ !hasCompleteInfo ? '请先完善身份信息' : (paying ? '支付处理中...' : '确认支付') }}
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { CircleCheck, InfoFilled, Warning } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const orderId = parseInt(route.params.orderId)
const order = ref(null)
const loading = ref(false)
const paying = ref(false)
const paid = ref(false)
const tradeCode = ref('')

const userInfo = computed(() => userStore.userInfo)
const hasCompleteInfo = computed(() => !!(userInfo.value?.student_id && userInfo.value?.phone))

const fetchOrder = async () => {
  loading.value = true
  try {
    const res = await request.get(`/orders/${orderId}`)
    order.value = res.data
    if (order.value.status === 'pending_delivery') {
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
  if (!hasCompleteInfo.value) {
    ElMessage.warning('请先完善个人身份信息')
    return
  }
  
  paying.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  try {
    const res = await request.post(`/orders/${orderId}/pay`)
    tradeCode.value = res.data.trade_code
    paid.value = true
    ElMessage.success('支付成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '支付失败')
  } finally {
    paying.value = false
  }
}

const goOrders = () => router.push('/orders')
const goAccount = () => router.push('/account')

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
}

.pay-form {
  h2 {
    color: #ff6b6b;
    margin-bottom: 30px;
    text-align: center;
  }
}

.identity-confirm {
  background: #fff5f5;
  border: 1px solid #ffcccc;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  
  .confirm-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #E4393C;
    margin-bottom: 12px;
  }
  
  .confirm-content {
    .confirm-item {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 14px;
      
      .label {
        color: #666;
      }
      
      .value {
        color: #333;
        font-weight: 500;
      }
    }
    
    .confirm-tip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #E4393C;
      margin-top: 12px;
    }
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
  margin-bottom: 8px;
}

.trade-location, .trade-time {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.pay-success {
  text-align: center;
  
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