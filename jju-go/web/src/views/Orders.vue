<template>
  <div class="orders page">
    <div class="container">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="我购买的" name="bought">
          <div class="orders-list" v-loading="loading">
            <div v-for="order in boughtList" :key="order.id" class="order-card">
              <RouterLink :to="`/goods/${order.goods?.id}`" class="goods-link">
                <el-image :src="order.goods?.pics[0]" fit="cover" class="goods-img" />
              </RouterLink>
              <div class="order-info">
                <div class="title">{{ order.goods?.title }}</div>
                <div class="price">¥{{ order.amount }}</div>
                <el-tag :type="order.status === 'completed' ? 'success' : order.status === 'pending_verify' ? 'warning' : ''">
                  {{ order.status === 'completed' ? '已完成' : order.status === 'pending_verify' ? '待核验' : '待支付' }}
                </el-tag>
              </div>
              <div class="actions">
                <el-button v-if="order.status === 'pending_pay'" type="primary" @click="goPay(order.id)">去支付</el-button>
                <el-button v-if="order.status === 'pending_verify'" @click="goVerify(order.id)">核验</el-button>
              </div>
            </div>
            <el-empty v-if="!boughtList.length && !loading" description="暂无购买记录" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我卖出的" name="sold">
          <div class="orders-list" v-loading="loading">
            <div v-for="order in soldList" :key="order.id" class="order-card">
              <RouterLink :to="`/goods/${order.goods?.id}`" class="goods-link">
                <el-image :src="order.goods?.pics[0]" fit="cover" class="goods-img" />
              </RouterLink>
              <div class="order-info">
                <div class="title">{{ order.goods?.title }}</div>
                <div class="price">¥{{ order.amount }}</div>
                <el-tag :type="order.status === 'completed' ? 'success' : order.status === 'pending_verify' ? 'warning' : ''">
                  {{ order.status === 'completed' ? '已完成' : order.status === 'pending_verify' ? '待核验' : '待支付' }}
                </el-tag>
              </div>
              <div class="actions">
                <el-button v-if="order.status === 'pending_verify'" @click="goVerify(order.id)">确认完成</el-button>
              </div>
            </div>
            <el-empty v-if="!soldList.length && !loading" description="暂无卖出记录" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/utils/request'

const router = useRouter()
const activeTab = ref('bought')
const loading = ref(false)
const boughtList = ref([])
const soldList = ref([])

const fetchOrders = async () => {
  loading.value = true
  try {
    const [bought, sold] = await Promise.all([
      request.get('/orders/buyer'),
      request.get('/orders/seller')
    ])
    boughtList.value = bought.data
    soldList.value = sold.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const goPay = (orderId) => router.push(`/pay/${orderId}`)
const goVerify = (orderId) => {
  router.push(`/orders?q=${orderId}`)
}

onMounted(() => fetchOrders())
</script>

<style lang="scss" scoped>
.orders-list {
  padding: 20px 0;
}

.order-card {
  display: flex;
  gap: 15px;
  background: #fff;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 8px;
  align-items: center;
}

.goods-link {
  .goods-img {
    width: 80px;
    height: 80px;
    border-radius: 4px;
  }
}

.order-info {
  flex: 1;
}

.title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.price {
  color: #ff6b6b;
  font-weight: bold;
  margin-bottom: 8px;
}
</style>