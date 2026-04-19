<template>
  <div class="home page">
    <div class="container">
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="搜索商品..." @keyup.enter="search" size="large">
          <template #append>
            <el-button :icon="Search" @click="search">搜索</el-button>
          </template>
        </el-input>
      </div>
      
      <div class="categories">
        <el-button :type="categoryId === 0 ? 'primary' : ''" @click="selectCategory(0)">全部</el-button>
        <el-button v-for="cat in categories" :key="cat.id" :type="categoryId === cat.id ? 'primary' : ''" @click="selectCategory(cat.id)">
          {{ cat.name }}
        </el-button>
      </div>

      <el-row :gutter="20" class="goods-grid" v-loading="loading">
        <el-col :span="6" v-for="goods in goodsList" :key="goods.id">
          <RouterLink :to="`/goods/${goods.id}`" class="goods-card">
            <el-image :src="goods.pics[0]" fit="cover" class="goods-image" />
            <div class="goods-info">
              <div class="title">{{ goods.title }}</div>
              <div class="price">¥{{ goods.price }}</div>
              <div class="seller">{{ goods.seller?.nickname }}</div>
            </div>
          </RouterLink>
        </el-col>
      </el-row>

      <div class="load-more" v-if="hasMore">
        <el-button @click="loadMoreGoods" :loading="loadingMore">加载更多</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { request } from '@/utils/request'

const keyword = ref('')
const categoryId = ref(0)
const categories = ref([])
const goodsList = ref([])
const page = ref(1)
const limit = ref(12)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)

const hasMore = () => goodsList.value.length < total.value

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
  }
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (keyword.value) params.keyword = keyword.value
    if (categoryId.value) params.category_id = categoryId.value
    const res = await request.get('/goods', { params })
    if (reset) {
      goodsList.value = res.data.list
    } else {
      goodsList.value.push(...res.data.list)
    }
    total.value = res.data.total
  } catch (e) {
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

.goods-grid {
  .el-col {
    margin-bottom: 20px;
  }
}

.goods-card {
  display: block;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.goods-image {
  width: 100%;
  height: 200px;
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
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.seller {
  font-size: 12px;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 20px;
}
</style>