<template>
  <div class="profile page">
    <div class="container">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="我的发布" name="published">
          <div class="goods-list" v-loading="loading">
            <div v-for="item in publishedList" :key="item.id" class="goods-item">
              <el-image :src="item.pics[0]" fit="cover" class="goods-img" />
              <div class="goods-info">
                <div class="title">{{ item.title }}</div>
                <div class="price">¥{{ item.price }}</div>
                <el-tag :type="item.status === 'approved' ? 'success' : item.status === 'sold' ? 'info' : 'warning'">
                  {{ item.status === 'approved' ? '在售' : item.status === 'sold' ? '已售' : '待审核' }}
                </el-tag>
              </div>
            </div>
            <el-empty v-if="!publishedList.length && !loading" description="暂无发布" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我的购买" name="bought">
          <div class="goods-list" v-loading="loading">
            <div v-for="item in boughtList" :key="item.id" class="order-item">
              <div class="order-info">
                <div class="title">{{ item.goods?.title }}</div>
                <div class="price">¥{{ item.amount }}</div>
                <el-tag :type="item.status === 'completed' ? 'success' : 'warning'">
                  {{ item.status === 'completed' ? '已完成' : '进行中' }}
                </el-tag>
              </div>
            </div>
            <el-empty v-if="!boughtList.length && !loading" description="暂无购买记录" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我的卖出" name="sold">
          <div class="goods-list" v-loading="loading">
            <div v-for="item in soldList" :key="item.id" class="order-item">
              <div class="order-info">
                <div class="title">{{ item.goods?.title }}</div>
                <div class="price">¥{{ item.amount }}</div>
                <el-tag :type="item.status === 'completed' ? 'success' : 'warning'">
                  {{ item.status === 'completed' ? '已完成' : '进行中' }}
                </el-tag>
              </div>
            </div>
            <el-empty v-if="!soldList.length && !loading" description="暂无卖出记录" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="我的收藏" name="favorites">
          <div class="goods-list" v-loading="loading">
            <RouterLink v-for="item in favoritesList" :key="item.id" :to="`/goods/${item.id}`" class="goods-item">
              <el-image :src="item.pics[0]" fit="cover" class="goods-img" />
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
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'

const userStore = useUserStore()
const activeTab = ref('published')
const loading = ref(false)
const publishedList = ref([])
const boughtList = ref([])
const soldList = ref([])
const favoritesList = ref([])

const fetchData = async () => {
  loading.value = true
  try {
    const [published, bought, sold, favorites] = await Promise.all([
      request.get('/goods'),
      request.get('/orders/buyer'),
      request.get('/orders/seller'),
      request.get('/user/favorites')
    ])
    publishedList.value = published.data.list.filter(g => g.seller?.id === userStore.userInfo?.id)
    boughtList.value = bought.data
    soldList.value = sold.data
    favoritesList.value = favorites.data
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
}

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
}

.order-item {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
}

.order-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .goods-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>