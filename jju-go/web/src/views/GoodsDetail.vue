<template>
  <div class="goods-detail page" v-loading="loading">
    <div class="container">
      <div v-if="error" class="error-state">
        <p>{{ error }}</p>
        <el-button type="primary" @click="fetchGoods">刷新重试</el-button>
      </div>
      <div class="goods-container" v-else-if="goods">
        <div class="goods-images">
          <el-carousel height="400px" v-if="goods.pics?.length">
            <el-carousel-item v-for="(pic, index) in goods.pics" :key="index">
              <el-image :src="pic" fit="contain" style="width: 100%; height: 100%" />
            </el-carousel-item>
          </el-carousel>
        </div>
        
        <div class="goods-info">
          <h1 class="title">{{ goods.title }}</h1>
          <div class="price">¥{{ goods.price }}</div>
          
          <div class="seller-info">
            <el-avatar :size="40" :src="goods.seller?.avatar" />
            <span>{{ goods.seller?.nickname }}</span>
          </div>
          
          <div class="description">{{ goods.description }}</div>
          
          <div class="actions">
            <el-button :type="isFavorited ? 'danger' : ''" :icon="Star" @click="toggleFavorite">
              {{ isFavorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button type="primary" size="large" @click="buyNow" :disabled="!userStore.isLoggedIn">
              立即购买
            </el-button>
          </div>
        </div>
      </div>
      
      <div class="comments-section">
        <h3>留言</h3>
        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <el-avatar :size="32" :src="comment.user?.avatar" />
            <div class="comment-content">
              <div class="comment-user">{{ comment.user?.nickname }}</div>
              <div>{{ comment.content }}</div>
            </div>
          </div>
        </div>
        
        <div class="comment-form" v-if="userStore.isLoggedIn">
          <el-input v-model="commentContent" placeholder="写下你的留言..." />
          <el-button type="primary" @click="submitComment" :loading="commentLoading">留言</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { Star } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const goods = ref(null)
const loading = ref(true)
const error = ref('')
const isFavorited = ref(false)
const comments = ref([])
const commentContent = ref('')
const commentLoading = ref(false)

const fetchGoods = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await request.get(`/goods/${route.params.id}`)
    goods.value = res.data
    isFavorited.value = res.data.is_favorited || false
    comments.value = res.data.comments || []
  } catch (e) {
    error.value = '商品加载失败，请刷新重试'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  try {
    await request.post(`/goods/${route.params.id}/favorite`)
    isFavorited.value = !isFavorited.value
    ElMessage.success(isFavorited.value ? '收藏成功' : '取消收藏')
  } catch (e) {}
}

const buyNow = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  try {
    const res = await request.post('/orders', { goods_id: parseInt(route.params.id) })
    ElMessage.success('下单成功')
    router.push(`/pay/${res.data.id}`)
  } catch (e) {}
}

const submitComment = async () => {
  if (!commentContent.value.trim()) return
  commentLoading.value = true
  try {
    await request.post(`/goods/${route.params.id}/comments`, { content: commentContent.value })
    commentContent.value = ''
    await fetchGoods()
    ElMessage.success('留言成功')
  } catch (e) {} finally {
    commentLoading.value = false
  }
}

onMounted(() => fetchGoods())
</script>

<style lang="scss" scoped>
.goods-container {
  display: flex;
  gap: 40px;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}

.goods-images {
  width: 400px;
  flex-shrink: 0;
}

.goods-info {
  flex: 1;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.price {
  font-size: 32px;
  color: #ff6b6b;
  font-weight: bold;
  margin-bottom: 20px;
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.description {
  line-height: 1.8;
  margin-bottom: 30px;
}

.actions {
  display: flex;
  gap: 10px;
}

.comments-section {
  margin-top: 20px;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  
  h3 {
    margin-bottom: 15px;
  }
}

.comment-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.comment-content {
  flex: 1;
}

.comment-user {
  font-weight: bold;
  margin-bottom: 4px;
}

.comment-form {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #f56c6c;
}
</style>