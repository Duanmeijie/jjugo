<template>
  <div class="profile page">
    <div class="container">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="我的发布" name="published">
          <div class="sub-tabs">
            <div 
              v-for="tab in publishedTabs" 
              :key="tab.value" 
              :class="['sub-tab', { active: activePublishedSubTab === tab.value }]"
              @click="activePublishedSubTab = tab.value"
            >
              {{ tab.label }}
            </div>
          </div>
          <div class="goods-list" v-loading="loading">
            <div v-for="item in filteredPublishedList" :key="item.id" class="goods-item">
              <el-image :src="item.pics?.[0]" fit="cover" class="goods-img" />
              <div class="goods-info">
                <div class="title">{{ item.title }}</div>
                <div class="price">¥{{ item.price }}</div>
                <el-tag :type="getPublishedStatusType(item.status)" size="small">
                  {{ getPublishedStatusText(item.status) }}
                </el-tag>
                <div class="goods-actions">
                  <el-button v-if="item.status === 'selling' || item.status === 'approved'" type="danger" size="small" @click="deleteGoods(item.id)">
                    下架
                  </el-button>
                </div>
              </div>
            </div>
            <el-empty v-if="!filteredPublishedList.length && !loading" description="暂无发布" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我卖出的" name="sold">
          <div class="sub-tabs">
            <div 
              v-for="tab in soldTabs" 
              :key="tab.value" 
              :class="['sub-tab', { active: activeSoldSubTab === tab.value }]"
              @click="activeSoldSubTab = tab.value"
            >
              {{ tab.label }}
            </div>
          </div>
          <div class="orders-list" v-loading="loading">
            <div v-for="item in filteredSoldList" :key="item.id" class="order-card">
              <RouterLink :to="`/goods/${item.goods?.id}`" class="goods-link">
                <el-image :src="item.goods?.pics?.[0]" fit="cover" class="goods-img" />
              </RouterLink>
              <div class="order-info">
                <div class="title">{{ item.goods?.title }}</div>
                <div class="price">¥{{ item.amount }}</div>
                <el-tag :type="getSoldStatusType(item.status)" size="small">
                  {{ getSoldStatusText(item.status) }}
                </el-tag>
                <div v-if="item.status === 'pending_delivery'" class="trade-info">
                  <div class="trade-code">交易码：{{ item.trade_code }}</div>
                  <div v-if="item.goods?.seller_student_info" class="buyer-info">
                    买家学号：{{ item.goods?.seller_student_info?.student_id || '--' }}
                  </div>
                </div>
              </div>
              <div class="order-actions">
                <el-button v-if="item.status === 'pending_delivery'" type="primary" size="small" @click="goVerify(item.id)">
                  确认交易
                </el-button>
              </div>
            </div>
            <el-empty v-if="!filteredSoldList.length && !loading" description="暂无卖出记录" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我购买的" name="bought">
          <div class="sub-tabs">
            <div 
              v-for="tab in boughtTabs" 
              :key="tab.value" 
              :class="['sub-tab', { active: activeBoughtSubTab === tab.value }]"
              @click="activeBoughtSubTab = tab.value"
            >
              {{ tab.label }}
            </div>
          </div>
          <div class="orders-list" v-loading="loading">
            <div v-for="item in filteredBoughtList" :key="item.id" class="order-card">
              <RouterLink :to="`/goods/${item.goods?.id}`" class="goods-link">
                <el-image :src="item.goods?.pics?.[0]" fit="cover" class="goods-img" />
              </RouterLink>
              <div class="order-info">
                <div class="title">{{ item.goods?.title }}</div>
                <div class="price">¥{{ item.amount }}</div>
                <el-tag :type="getBoughtStatusType(item.status)" size="small">
                  {{ getBoughtStatusText(item.status) }}
                </el-tag>
                <div v-if="item.status === 'pending_delivery'" class="trade-info">
                  <div class="trade-code">交易码：{{ item.trade_code }}</div>
                </div>
              </div>
              <div class="order-actions">
                <el-button v-if="item.status === 'pending_payment'" type="primary" size="small" @click="goPay(item.id)">
                  去支付
                </el-button>
                <el-button v-if="item.status === 'pending_delivery'" type="primary" size="small" @click="goVerify(item.id)">
                  确认交易
                </el-button>
              </div>
            </div>
            <el-empty v-if="!filteredBoughtList.length && !loading" description="暂无购买记录" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我的收藏" name="favorites">
          <div class="goods-list" v-loading="loading">
            <RouterLink v-for="item in favoritesList" :key="item.id" :to="`/goods/${item.id}`" class="goods-item">
              <el-image :src="item.pics?.[0]" fit="cover" class="goods-img" />
              <div class="goods-info">
                <div class="title">{{ item.title }}</div>
                <div class="price">¥{{ item.price }}</div>
              </div>
            </RouterLink>
            <el-empty v-if="!favoritesList.length && !loading" description="暂无收藏" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('published')
const activePublishedSubTab = ref('all')
const activeSoldSubTab = ref('all')
const activeBoughtSubTab = ref('all')

const loading = ref(false)
const publishedList = ref([])
const boughtList = ref([])
const soldList = ref([])
const favoritesList = ref([])

const publishedTabs = [
  { label: '全部', value: 'all' },
  { label: '出售中', value: 'selling' },
  { label: '待审核', value: 'pending' },
  { label: '已售出', value: 'sold_out' }
]

const soldTabs = [
  { label: '全部', value: 'all' },
  { label: '待交易', value: 'pending_delivery' },
  { label: '待评价', value: 'pending_review' },
  { label: '售后中', value: 'after_sale' },
  { label: '已完成', value: 'history' }
]

const boughtTabs = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: 'pending_payment' },
  { label: '待交易', value: 'pending_delivery' },
  { label: '待评价', value: 'pending_review' },
  { label: '已完成', value: 'history' }
]

const filteredPublishedList = computed(() => {
  if (activePublishedSubTab.value === 'all') return publishedList.value
  return publishedList.value.filter(g => g.status === activePublishedSubTab.value)
})

const filteredSoldList = computed(() => {
  if (activeSoldSubTab.value === 'all') return soldList.value
  return soldList.value.filter(o => o.status === activeSoldSubTab.value)
})

const filteredBoughtList = computed(() => {
  if (activeBoughtSubTab.value === 'all') return boughtList.value
  return boughtList.value.filter(o => o.status === activeBoughtSubTab.value)
})

const getPublishedStatusType = (status) => {
  const map = { selling: 'success', approved: 'success', pending: 'warning', sold_out: 'info', sold_pending: 'warning', rejected: 'danger' }
  return map[status] || ''
}

const getPublishedStatusText = (status) => {
  const map = { selling: '出售中', approved: '在售', pending: '待审核', sold_out: '已售出', sold_pending: '待交易', rejected: '已拒绝' }
  return map[status] || status
}

const getSoldStatusType = (status) => {
  const map = { pending_payment: 'warning', pending_delivery: '', pending_review: 'success', after_sale: 'info', history: 'success', cancelled: 'info' }
  return map[status] || ''
}

const getSoldStatusText = (status) => {
  const map = { pending_payment: '待付款', pending_delivery: '待交易', pending_review: '待评价', after_sale: '售后中', history: '已完成', cancelled: '已取消' }
  return map[status] || status
}

const getBoughtStatusType = (status) => {
  return getSoldStatusType(status)
}

const getBoughtStatusText = (status) => {
  return getSoldStatusText(status)
}

const deleteGoods = async (id) => {
  try {
    await request.delete(`/goods/${id}`)
    publishedList.value = publishedList.value.filter(g => g.id !== id)
    ElMessage.success('已下架')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const goPay = (orderId) => router.push(`/pay/${orderId}`)
const goVerify = (orderId) => router.push(`/verify/${orderId}`)

const fetchData = async () => {
  loading.value = true
  try {
    const [published, bought, sold, favorites] = await Promise.all([
      request.get('/goods/my'),
      request.get('/orders/buyer'),
      request.get('/orders/seller'),
      request.get('/user/favorites')
    ])
    publishedList.value = published.data || []
    boughtList.value = bought.data || []
    soldList.value = sold.data || []
    favoritesList.value = favorites.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchData()
  }
})
</script>

<style lang="scss" scoped>
.sub-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 0;
  flex-wrap: wrap;
}

.sub-tab {
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  background: #f5f5f5;
  transition: all 0.2s;
  
  &:hover {
    background: #e8e8e8;
  }
  
  &.active {
    background: #E4393C;
    color: #fff;
  }
}

.goods-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 20px 0;
}

.goods-item {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: block;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.goods-img {
  width: 100%;
  height: 150px;
  display: block;
}

.goods-info {
  padding: 12px;
  
  .title {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 8px;
  }
  
  .price {
    color: #ff6b6b;
    font-weight: bold;
    margin-bottom: 8px;
  }
  
  .goods-actions {
    margin-top: 8px;
  }
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
  align-items: center;
}

.goods-link {
  .goods-img {
    width: 80px;
    height: 80px;
    border-radius: 8px;
  }
}

.order-info {
  flex: 1;
  
  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .price {
    color: #E4393C;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  .trade-info {
    font-size: 12px;
    color: #666;
    margin-top: 8px;
    
    .trade-code {
      color: #E4393C;
      font-weight: 600;
    }
  }
}

.order-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 768px) {
  .goods-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>