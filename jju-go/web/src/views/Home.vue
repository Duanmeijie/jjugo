<template>
  <div class="home page">
    <div class="container">
      <div class="search-bar glass-card">
        <div class="search-wrapper">
          <el-input v-model="keyword" placeholder="搜索商品名称、描述..." @keyup.enter="search" size="large" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" :icon="Search" @click="search" size="large">搜索</el-button>
        </div>
        
        <div class="search-filters">
          <el-select v-model="sortBy" placeholder="排序方式" size="small" @change="search" class="filter-select">
            <el-option label="最新发布" value="new" />
            <el-option label="价格从低到高" value="price_asc" />
            <el-option label="价格从高到低" value="price_desc" />
            <el-option label="最多浏览" value="hot" />
          </el-select>
          
          <el-input-number v-model="minPrice" :min="0" :precision="2" placeholder="最低价" size="small" class="price-input" controls-position="right" />
          <span class="price-separator">-</span>
          <el-input-number v-model="maxPrice" :min="0" :precision="2" placeholder="最高价" size="small" class="price-input" controls-position="right" />
          
          <el-button size="small" @click="resetFilters">重置</el-button>
        </div>
      </div>
      
      <div class="categories glass-tabs">
        <button 
          :class="['glass-tab', { active: categoryId === 0 }]"
          @click="selectCategory(0)"
        >
          全部
        </button>
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
        <el-icon :size="64" color="#ccc"><ShoppingBag /></el-icon>
        <p>暂无商品，去发布一个吧</p>
        <RouterLink to="/publish">
          <GlassButton variant="primary">发布商品</GlassButton>
        </RouterLink>
      </div>

      <el-row :gutter="20" class="goods-grid" v-else>
        <el-col :xs="12" :sm="8" :md="6" v-for="goods in goodsList" :key="goods.id">
          <GlassCard clickable @click="$router.push(`/goods/${goods.id}`)">
            <div class="goods-card">
              <div class="image-wrapper">
                <el-image :src="goods.pics[0]" fit="cover" class="goods-image" lazy />
                <div class="image-overlay">
                  <el-tag size="small" type="success" v-if="goods.status === 'selling'">在售</el-tag>
                </div>
              </div>
              <div class="goods-info">
                <div class="title">{{ goods.title }}</div>
                <div class="price-row">
                  <span class="price">¥{{ goods.price }}</span>
                  <span class="view-count">
                    <el-icon><View /></el-icon>
                    {{ goods.view_count }}
                  </span>
                </div>
                <div class="seller-row">
                  <el-avatar :size="20" :src="goods.seller?.avatar" />
                  <span class="seller">{{ goods.seller?.nickname }}</span>
                </div>
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
import { Search, ShoppingBag, View } from '@element-plus/icons-vue'
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
const sortBy = ref('new')
const minPrice = ref(null)
const maxPrice = ref(null)

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
    const params = { page: page.value, limit: limit.value, sort: sortBy.value }
    if (keyword.value) params.keyword = keyword.value
    if (categoryId.value) params.category_id = categoryId.value
    if (minPrice.value !== null) params.min_price = minPrice.value
    if (maxPrice.value !== null) params.max_price = maxPrice.value
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

const resetFilters = () => {
  keyword.value = ''
  categoryId.value = 0
  sortBy.value = 'new'
  minPrice.value = null
  maxPrice.value = null
  fetchGoods(true)
}

onMounted(() => {
  fetchCategories()
  fetchGoods()
})
</script>

<style lang="scss" scoped>
.search-bar {
  margin: 20px 0;
  padding: 20px;
}

.search-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  
  .el-input {
    flex: 1;
  }
}

.search-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  
  .filter-select {
    width: 140px;
  }
  
  .price-input {
    width: 120px;
  }
  
  .price-separator {
    color: #999;
  }
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

.image-wrapper {
  position: relative;
  
  .goods-image {
    width: 100%;
    height: 200px;
    display: block;
    border-radius: 12px 12px 0 0;
  }
  
  .image-overlay {
    position: absolute;
    top: 12px;
    right: 12px;
  }
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
  margin-bottom: 10px;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.price {
  color: #F43F5E;
  font-size: 20px;
  font-weight: 700;
}

.view-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.seller-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seller {
  font-size: 13px;
  color: var(--text-secondary, #64748B);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-more {
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .search-filters {
    .filter-select, .price-input {
      width: 100%;
    }
  }
}
</style>