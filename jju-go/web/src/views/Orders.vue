<template>
  <div class="orders page">
    <div class="container">
      <div class="order-tabs">
        <div 
          v-for="tab in tabs" 
          :key="tab.value" 
          :class="['tab-item', { active: activeTab === tab.value }]"
          @click="changeTab(tab.value)"
        >
          <span class="tab-name">{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
        </div>
      </div>

      <div class="orders-list" v-loading="loading">
        <div v-for="order in displayOrders" :key="order.id" class="order-card glass-card">
          <RouterLink :to="`/goods/${order.goods?.id}`" class="goods-link">
            <el-image :src="order.goods?.pics?.[0]" fit="cover" class="goods-img" />
          </RouterLink>
          
          <div class="order-content">
            <div class="order-header">
              <div class="title">{{ order.goods?.title }}</div>
              <div class="price">¥{{ order.amount }}</div>
            </div>
            
            <div class="status-info">
              <el-tag :type="getStatusType(order.status)" size="small">
                {{ getStatusText(order.status) }}
              </el-tag>
              
              <div v-if="order.status === 'pending_payment'" class="countdown">
                <span class="countdown-label">付款倒计时：</span>
                <span class="countdown-time">{{ formatCountdown(order.payment_deadline) }}</span>
              </div>
              
              <div v-if="order.status === 'pending_delivery'" class="delivery-info">
                <span class="countdown-label">交易倒计时：</span>
                <span class="countdown-time">{{ formatCountdown(order.delivery_deadline) }}</span>
                <GlassButton variant="primary" size="small" @click="goTrade(order.id)">
                  去交易
                </GlassButton>
              </div>
              
              <div v-if="order.status === 'pending_review'" class="review-info">
                <span>交易已完成，可进行评价</span>
                <GlassButton variant="primary" size="small" @click="openReviewDialog(order)">
                  评价
                </GlassButton>
              </div>
            </div>
            
            <div class="verification-section">
              <div v-if="order.status === 'pending_delivery'" class="my-code-box">
                <span class="label">我的核销码：</span>
                <span class="code-text">{{ order.trade_code || '----' }}</span>
                <button @click="copyCode(order.trade_code)" class="copy-btn">复制</button>
              </div>
              
              <div v-if="order.status === 'pending_delivery'" class="action-area">
                <input
                  v-model="inputCodes[order.id]"
                  type="text"
                  :placeholder="isSeller(order) ? '请输入买家提供的交易码' : '请输入卖家提供的交易码'"
                  class="code-input"
                  maxlength="6"
                  @keyup.enter="verifyTransaction(order)"
                />
                <GlassButton variant="primary" size="small" @click="verifyTransaction(order)">
                  {{ isSeller(order) ? '验证并收款' : '确认交易' }}
                </GlassButton>
              </div>
              
              <div v-if="order.status === 'history' || order.status === 'after_sale'" class="success-badge">
                <el-icon><CircleCheck /></el-icon> {{ order.status === 'history' ? '交易已完成' : '售后期' }}
              </div>
              
              <div v-if="order.status === 'cancelled'" class="cancelled-badge">
                <el-icon><CircleClose /></el-icon> 已取消/超时
              </div>
            </div>
          </div>
          
          <div class="actions">
            <GlassButton v-if="order.status === 'pending_payment'" variant="primary" size="small" @click="goPay(order.id)">
              去支付
            </GlassButton>
            <GlassButton v-if="order.status === 'pending_payment'" variant="default" size="small" @click="cancelOrder(order.id)">
              取消
            </GlassButton>
            <GlassButton v-if="order.status === 'cancelled'" variant="default" size="small" @click="removeFromCart(order.id)">
              移出购物车
            </GlassButton>
          </div>
        </div>
        
        <el-empty v-if="!displayOrders.length && !loading" :description="emptyText" />
      </div>
    </div>
    
    <el-dialog v-model="reviewDialogVisible" title="评价订单" width="400px">
      <div class="review-form">
        <div class="rating-row">
          <span>评分：</span>
          <el-rate v-model="reviewForm.rating" />
        </div>
        <el-input v-model="reviewForm.content" type="textarea" :rows="3" placeholder="写下你的评价..." />
      </div>
      <template #footer>
        <GlassButton @click="reviewDialogVisible = false">取消</GlassButton>
        <GlassButton variant="primary" @click="submitReview">提交</GlassButton>
      </template>
    </el-dialog>
    
    <transition name="confetti">
      <div v-if="showSuccess" class="success-modal" @click="showSuccess = false">
        <div class="success-content">
          <div class="success-icon">🎊</div>
          <h2>{{ successType === 'trade' ? '交易成功！' : '评价成功！' }}</h2>
          <p class="subtitle">感谢使用九院易购，祝你生活愉快！</p>
          <GlassButton variant="primary" @click="showSuccess = false">确定</GlassButton>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('all')
const loading = ref(false)
const allOrders = ref([])
const inputCodes = ref({})
const showSuccess = ref(false)
const successType = ref('trade')
const reviewDialogVisible = ref(false)
const reviewForm = ref({ rating: 5, content: '' })
const currentReviewOrder = ref(null)
const countdownTimer = ref(null)
const countdownData = ref({})

const tabs = computed(() => [
  { label: '全部', value: 'all', count: allOrders.value.length },
  { label: '待付款', value: 'pending_payment', count: allOrders.value.filter(o => o.status === 'pending_payment').length },
  { label: '待收货', value: 'pending_delivery', count: allOrders.value.filter(o => o.status === 'pending_delivery').length },
  { label: '待评价', value: 'pending_review', count: allOrders.value.filter(o => o.status === 'pending_review').length },
  { label: '售后', value: 'after_sale', count: allOrders.value.filter(o => o.status === 'after_sale').length },
  { label: '历史订单', value: 'history', count: allOrders.value.filter(o => o.status === 'history').length }
])

const displayOrders = computed(() => {
  if (activeTab.value === 'all') return allOrders.value
  return allOrders.value.filter(o => o.status === activeTab.value)
})

const emptyText = computed(() => {
  const map = {
    all: '暂无订单',
    pending_payment: '暂无待付款订单',
    pending_delivery: '暂无待收货订单',
    pending_review: '暂无待评价订单',
    after_sale: '暂无售后订单',
    history: '暂无历史订单'
  }
  return map[activeTab.value] || '暂无订单'
})

const isSeller = (order) => {
  return order.goods?.seller_id === userStore.userInfo?.id
}

const getStatusType = (status) => {
  const map = {
    pending_payment: 'warning',
    pending_delivery: '',
    pending_review: 'success',
    after_sale: 'info',
    history: 'success',
    cancelled: 'info',
    cart: 'info'
  }
  return map[status] || ''
}

const getStatusText = (status) => {
  const map = {
    pending_payment: '待付款',
    pending_delivery: '待收货',
    pending_review: '待评价',
    after_sale: '售后中',
    history: '已完成',
    cancelled: '已取消',
    cart: '购物车'
  }
  return map[status] || status
}

const formatCountdown = (deadline) => {
  if (!deadline) return '--:--:--'
  const now = new Date()
  const end = new Date(deadline)
  const diff = end - now
  
  if (diff <= 0) {
    checkExpiredOrders()
    return '已超时'
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const updateCountdowns = () => {
  allOrders.value.forEach(order => {
    if (order.status === 'pending_payment' || order.status === 'pending_delivery') {
      countdownData.value[order.id] = formatCountdown(order.payment_deadline || order.delivery_deadline)
    }
  })
}

const checkExpiredOrders = async () => {
  await fetchOrders()
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const [bought, sold] = await Promise.all([
      request.get('/orders/buyer'),
      request.get('/orders/seller')
    ])
    allOrders.value = [...(bought.data || []), ...(sold.data || [])].map(o => ({
      ...o,
      trade_code: o.trade_code || generateTradeCode()
    }))
    updateCountdowns()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const generateTradeCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)
}

const changeTab = (value) => {
  activeTab.value = value
}

const copyCode = async (code) => {
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('复制成功')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

const verifyTransaction = async (order) => {
  const inputCode = inputCodes.value[order.id]
  if (!inputCode || inputCode.length !== 6) {
    ElMessage.warning('请输入6位交易码')
    return
  }
  
  loading.value = true
  try {
    await request.post(`/orders/${order.id}/verify`, { trade_code: inputCode })
    order.status = 'pending_review'
    successType.value = 'trade'
    showSuccess.value = true
    inputCodes.value[order.id] = ''
    ElMessage.success('交易成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '验证失败，请检查交易码是否正确')
  } finally {
    loading.value = false
  }
}

const goPay = (orderId) => router.push(`/pay/${orderId}`)
const goTrade = (orderId) => router.push(`/verify/${orderId}`)

const cancelOrder = async (orderId) => {
  try {
    await request.post(`/orders/${orderId}/cancel`)
    ElMessage.success('订单已取消')
    fetchOrders()
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '取消失败')
  }
}

const removeFromCart = async (orderId) => {
  try {
    await request.delete(`/orders/${orderId}`)
    allOrders.value = allOrders.value.filter(o => o.id !== orderId)
    ElMessage.success('已移出')
  } catch (e) {
    console.error(e)
  }
}

const openReviewDialog = (order) => {
  currentReviewOrder.value = order
  reviewForm.value = { rating: 5, content: '' }
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!currentReviewOrder.value) return
  
  loading.value = true
  try {
    await request.post(`/orders/${currentReviewOrder.value.id}/review`, reviewForm.value)
    currentReviewOrder.value.status = 'after_sale'
    reviewDialogVisible.value = false
    successType.value = 'review'
    showSuccess.value = true
    ElMessage.success('评价成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '评价失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrders()
  countdownTimer.value = setInterval(updateCountdowns, 1000)
})

onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
})
</script>

<style lang="scss" scoped>
.order-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 0;
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-size: 14px;
  background: #f5f5f5;
  color: #666;
  
  &:hover {
    background: #e8e8e8;
    color: #333;
  }
  
  &.active {
    background: #E4393C;
    color: #fff;
    
    .tab-badge {
      background: #fff;
      color: #E4393C;
    }
  }
}

.tab-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: #f0f0f0;
  color: #666;
}

.orders-list {
  padding: 20px 0;
}

.order-card {
  display: flex;
  gap: 16px;
  background: #fff;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  align-items: flex-start;
  transition: transform 250ms ease, box-shadow 250ms ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  }
}

.goods-link {
  .goods-img {
    width: 80px;
    height: 80px;
    border-radius: 8px;
  }
}

.order-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #111111;
}

.price {
  color: #E4393C;
  font-size: 18px;
  font-weight: 700;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 6px;
  
  .countdown-label {
    font-size: 12px;
    color: #666;
  }
  
  .countdown-time {
    font-size: 14px;
    font-weight: 600;
    color: #E4393C;
  }
}

.delivery-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 13px;
}

.verification-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.my-code-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
  border: 1px solid #ffcccc;
  border-radius: 8px;
  
  .label {
    font-size: 13px;
    color: #666;
  }
  
  .code-text {
    font-size: 20px;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: #E4393C;
    letter-spacing: 2px;
  }
  
  .copy-btn {
    padding: 4px 10px;
    font-size: 12px;
    background: #E4393C;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: #c93232;
    }
  }
}

.action-area {
  display: flex;
  gap: 10px;
  
  .code-input {
    flex: 1;
    padding: 10px 14px;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    letter-spacing: 2px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
    
    &:focus {
      border-color: #E4393C;
    }
  }
}

.success-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #10b981;
  font-weight: 600;
}

.cancelled-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fff5f5;
  border: 1px solid #ffcccc;
  border-radius: 8px;
  color: #999;
  font-weight: 600;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .rating-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.success-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}

.success-content {
  text-align: center;
  padding: 50px 60px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: scale-in 0.4s ease;
  
  .success-icon {
    font-size: 80px;
    margin-bottom: 16px;
  }
  
  h2 {
    font-size: 32px;
    font-weight: 700;
    color: #E4393C;
    margin-bottom: 12px;
  }
  
  .subtitle {
    font-size: 16px;
    color: #666;
    margin-bottom: 30px;
  }
}

@keyframes scale-in {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.confetti-enter-active,
.confetti-leave-active {
  transition: opacity 0.3s ease;
}

.confetti-enter-from,
.confetti-leave-to {
  opacity: 0;
}
</style>