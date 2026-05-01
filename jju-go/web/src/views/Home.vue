<template>
  <div class="home page">
    <div class="container">
      <div class="search-bar glass-card">
        <el-input v-model="keyword" placeholder="搜索商品..." @keyup.enter="search" size="large">
          <template #append>
            <el-button :icon="Search" @click="search">搜索</el-button>
          </template>
        </el-input>
      </div>
      
      <div class="categories glass-tabs">
        <button 
          v-for="cat in categories" 
          :key="cat.id" 
          :class="['glass-tab', { active: categoryId === cat.id }]"
          @click="selectCategory(cat.id)"
        >
          {{ cat.name }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="glass-loader"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-state glass-card">
        <p>{{ error }}</p>
        <GlassButton variant="primary" @click="fetchGoods(true)">刷新重试</GlassButton>
      </div>

      <div v-else-if="goodsList.length === 0" class="empty-state glass-card">
        <p>暂无商品，去发布一个吧</p>
        <RouterLink to="/publish">
          <GlassButton variant="primary">发布商品</GlassButton>
        </RouterLink>
      </div>

      <el-row :gutter="20" class="goods-grid" v-else>
        <el-col :span="6" v-for="goods in goodsList" :key="goods.id">
          <GlassCard clickable @click="$router.push(`/goods/${goods.id}`)">
            <div class="goods-card">
              <el-image :src="goods.pics[0]" fit="cover" class="goods-image" />
              <div class="goods-info">
                <div class="title">{{ goods.title }}</div>
                <div class="price">¥{{ goods.price }}</div>
                <div class="seller">{{ goods.seller?.nickname }}</div>
              </div>
            </div>
          </GlassCard>
        </el-col>
      </el-row>

      <div class="load-more" v-if="hasMore">
        <GlassButton @click="loadMoreGoods" :loading="loadingMore">加载更多</GlassButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { request } from '@/utils/request'
import GlassCard from '@/components/GlassCard.vue'
import GlassButton from '@/components/GlassButton.vue'

const keyword = ref('')
const categoryId = ref(0)
const categories = ref([])
const goodsList = ref([])
const page = ref(1)
const limit = ref(12)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')

const hasMore = computed(() => goodsList.value.length < total.value)

const fetchCategories = async () => {
  try {
    const res = await request.get('/goods/categories')
    categories.value = res.data.filter(c => c.parent_id === 0)
  } catch (e) {
    console.error(e)
  }
}

const fetchGoods = async (reset = false) => {
  if (reset) {
    page.value = 1
    goodsList.value = []
    error.value = ''
  }
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (keyword.value) params.keyword = keyword.value
    if (categoryId.value) params.category_id = categoryId.value
    const res = await request.get('/goods', { params })
    if (reset) {
      goodsList.value = res.data.list || []
    } else {
      goodsList.value.push(...(res.data.list || []))
    }
    total.value = res.data.total || 0
  } catch (e) {
    error.value = '加载失败，请刷新重试'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const search = () => fetchGoods(true)
const selectCategory = (id) => { categoryId.value = id; fetchGoods(true) }
const loadMoreGoods = async () => {
  loadingMore.value = true
  page.value++
  await fetchGoods()
  loadingMore.value = false
}

onMounted(() => {
  fetchCategories()
  fetchGoods()
})
</script>

<style lang="scss" scoped>
.search-bar {
  margin: 20px 0;
}

.categories {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.loading-state, .empty-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  p {
    margin-bottom: 20px;
    color: var(--text-secondary, #4a4a6a);
  }
}

.empty-state {
  p {
    font-size: 16px;
    margin-bottom: 20px;
  }
}

.error-state {
  color: #FF3B30;
}

.goods-grid {
  .el-col {
    margin-bottom: 20px;
  }
}

.goods-card {
  display: block;
  border-radius: 16px;
  overflow: hidden;
  transition: transform 300ms ease, box-shadow 300ms ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  }
}

.goods-image {
  width: 100%;
  height: 200px;
  display: block;
  border-radius: 12px 12px 0 0;
}

.goods-info {
  padding: 14px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1a1a2e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

.price {
  color: #F43F5E;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}

.seller {
  font-size: 13px;
  color: var(--text-secondary, #64748B);
}

.load-more {
  text-align: center;
  padding: 20px;
}
</style>