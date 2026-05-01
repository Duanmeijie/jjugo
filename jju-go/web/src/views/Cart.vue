<template>
  <div class="cart page">
    <div class="container">
      <GlassCard>
        <h2>购物车</h2>
        
        <div class="cart-list" v-loading="loading">
          <div v-for="item in cartList" :key="item.id" class="cart-item">
            <RouterLink :to="`/goods/${item.goods?.id}`" class="goods-link">
              <el-image :src="item.goods?.pics?.[0]" fit="cover" class="goods-img" />
            </RouterLink>
            
            <div class="cart-content">
              <div class="goods-title">{{ item.goods?.title }}</div>
              <div class="goods-price">¥{{ item.amount }}</div>
              <div v-if="item.goods?.preferred_location" class="trade-location">
                <span class="label">交易地点：</span>
                <span>{{ item.goods?.preferred_location }}</span>
              </div>
              <div v-if="item.goods?.preferred_time_slots?.length" class="trade-time">
                <span class="label">交易时间：</span>
                <span>{{ item.goods?.preferred_time_slots?.join(', ') }}</span>
              </div>
            </div>
            
            <div class="cart-actions">
              <GlassButton variant="primary" size="small" @click="goPay(item.id)">
                去付款
              </GlassButton>
              <GlassButton variant="default" size="small" @click="removeItem(item.id)">
                删除
              </GlassButton>
            </div>
          </div>
          
          <el-empty v-if="!cartList.length && !loading" description="购物车是空的，快去选购商品吧！" />
        </div>
        
        <div v-if="cartList.length" class="cart-summary">
          <div class="total-info">
            共 <span class="count">{{ cartList.length }}</span> 件商品
          </div>
          <GlassButton variant="primary" @click="goShopping">继续购物</GlassButton>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const router = useRouter()
const loading = ref(false)
const cartList = ref([])

const fetchCart = async () => {
  loading.value = true
  try {
    const res = await request.get('/orders/cart')
    cartList.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const goPay = (orderId) => {
  router.push(`/pay/${orderId}`)
}

const removeItem = async (orderId) => {
  try {
    await request.delete(`/orders/${orderId}`)
    cartList.value = cartList.value.filter(item => item.id !== orderId)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const goShopping = () => {
  router.push('/')
}

onMounted(() => fetchCart())
</script>

<style lang="scss" scoped>
.cart {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  text-align: center;
  color: #ff6b6b;
  margin-bottom: 24px;
}

.cart-list {
  min-height: 300px;
}

.cart-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
}

.goods-link {
  .goods-img {
    width: 80px;
    height: 80px;
    border-radius: 8px;
  }
}

.cart-content {
  flex: 1;
  
  .goods-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .goods-price {
    font-size: 18px;
    color: #E4393C;
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  .trade-location, .trade-time {
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
    
    .label {
      color: #999;
    }
  }
}

.cart-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 2px solid #E4393C;
  margin-top: 20px;
  
  .total-info {
    font-size: 16px;
    color: #666;
    
    .count {
      color: #E4393C;
      font-weight: 700;
    }
  }
}
</style>