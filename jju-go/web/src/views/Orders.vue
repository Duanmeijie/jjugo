<template>
  <div class="orders page">
    <div class="container">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="我购买的" name="bought">
          <div class="orders-list" v-loading="loading">
            <div v-for="order in boughtList" :key="order.id" class="order-card glass-card">
              <RouterLink :to="`/goods/${order.goods?.id}`" class="goods-link">
                <el-image :src="order.goods?.pics[0]" fit="cover" class="goods-img" />
              </RouterLink>
              
              <div class="order-content">
                <div class="order-header">
                  <div class="title">{{ order.goods?.title }}</div>
                  <div class="price">¥{{ order.amount }}</div>
                </div>
                
                <div class="verification-section">
                  <div class="my-code-box">
                    <span class="label">我的核销码：</span>
                    <span class="code-text">{{ order.trade_code || '----' }}</span>
                    <button @click="copyCode(order.trade_code)" class="copy-btn">复制</button>
                  </div>
                  
                  <div v-if="order.status === 'pending_verify'" class="action-area">
                    <input
                      v-model="inputCodes[order.id]"
                      type="text"
                      placeholder="请输入卖家提供的交易码"
                      class="code-input"
                      maxlength="6"
                      @keyup.enter="verifyTransaction(order, 'buyer')"
                    />
                    <GlassButton variant="primary" size="small" @click="verifyTransaction(order, 'buyer')">
                      确认交易
                    </GlassButton>
                  </div>
                  
                  <div v-else-if="order.status === 'completed'" class="success-badge">
                    <el-icon><CircleCheck /></el-icon> 交易已完成
                  </div>
                </div>
              </div>
              
              <div class="actions">
                <GlassButton v-if="order.status === 'pending_pay'" variant="primary" size="small" @click="goPay(order.id)">去支付</GlassButton>
              </div>
            </div>
            <el-empty v-if="!boughtList.length && !loading" description="暂无购买记录" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我卖出的" name="sold">
          <div class="orders-list" v-loading="loading">
            <div v-for="order in soldList" :key="order.id" class="order-card glass-card">
              <RouterLink :to="`/goods/${order.goods?.id}`" class="goods-link">
                <el-image :src="order.goods?.pics[0]" fit="cover" class="goods-img" />
              </RouterLink>
              
              <div class="order-content">
                <div class="order-header">
                  <div class="title">{{ order.goods?.title }}</div>
                  <div class="price">¥{{ order.amount }}</div>
                </div>
                
                <div class="verification-section">
                  <div class="my-code-box">
                    <span class="label">我的核销码：</span>
                    <span class="code-text">{{ order.trade_code || '----' }}</span>
                    <button @click="copyCode(order.trade_code)" class="copy-btn">复制</button>
                  </div>
                  
                  <div v-if="order.status === 'pending_verify'" class="action-area">
                    <input
                      v-model="inputCodes[order.id]"
                      type="text"
                      placeholder="请输入买家提供的交易码"
                      class="code-input"
                      maxlength="6"
                      @keyup.enter="verifyTransaction(order, 'seller')"
                    />
                    <GlassButton variant="primary" size="small" @click="verifyTransaction(order, 'seller')">
                      验证并收款
                    </GlassButton>
                  </div>
                  
                  <div v-else-if="order.status === 'completed'" class="success-badge">
                    <el-icon><CircleCheck /></el-icon> 交易已完成
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-if="!soldList.length && !loading" description="暂无卖出记录" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <transition name="confetti">
      <div v-if="showSuccess" class="success-modal" @click="showSuccess = false">
        <div class="success-content">
          <div class="confetti-container">
            <span v-for="i in 20" :key="i" class="confetti" :style="{ '--i': i }">🎉</span>
          </div>
          <div class="success-icon">🎊</div>
          <h2>交易成功！</h2>
          <p class="subtitle">感谢使用九院易购，祝你生活愉快！</p>
          <GlassButton variant="primary" @click="showSuccess = false">确定</GlassButton>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { CircleCheck } from '@element-plus/icons-vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const activeTab = ref('bought')
const loading = ref(false)
const boughtList = ref([])
const soldList = ref([])
const inputCodes = ref({})
const showSuccess = ref(false)
const successOrder = ref(null)

const fetchOrders = async () => {
  loading.value = true
  try {
    const [bought, sold] = await Promise.all([
      request.get('/orders/buyer'),
      request.get('/orders/seller')
    ])
    boughtList.value = bought.data.map(o => ({ ...o, trade_code: generateTradeCode() }))
    soldList.value = sold.data.map(o => ({ ...o, trade_code: generateTradeCode() }))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const generateTradeCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('复制成功')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

const verifyTransaction = async (order, role) => {
  const inputCode = inputCodes.value[order.id]
  if (!inputCode || inputCode.length !== 6) {
    ElMessage.warning('请输入6位交易码')
    return
  }
  
  loading.value = true
  try {
    await request.post(`/orders/${order.id}/verify`, { trade_code: inputCode })
    order.status = 'completed'
    successOrder.value = order
    showSuccess.value = true
    inputCodes.value[order.id] = ''
    ElMessage.success(role === 'seller' ? '收款成功' : '交易成功')
  } catch (e) {
    ElMessage.error('验证失败，请检查交易码是否正确')
  } finally {
    loading.value = false
  }
}

const goPay = (orderId) => router.push(`/pay/${orderId}`)

onMounted(() => fetchOrders())
</script>

<style lang="scss" scoped>
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

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  font-size: 24px;
  top: -30px;
  left: calc(var(--i) * 5%);
  animation: confetti-fall 3s ease-out infinite;
  animation-delay: calc(var(--i) * 0.15s);
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(500px) rotate(720deg);
    opacity: 0;
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