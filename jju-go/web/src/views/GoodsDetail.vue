<template>
  <div class="goods-detail page" v-loading="loading">
    <div class="container">
      <div v-if="error" class="error-state">
        <p>{{ error }}</p>
        <el-button type="primary" @click="fetchGoods">刷新重试</el-button>
      </div>
      <div class="goods-container glass-card" v-else-if="goods">
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
            <span class="seller-name">{{ goods.seller?.nickname }}</span>
          </div>
          
          <div class="description">{{ goods.description }}</div>
          
          <div class="actions">
            <el-button :type="isFavorited ? 'danger' : ''" :icon="Star" @click="toggleFavorite">
              {{ isFavorited ? '已收藏' : '收藏' }}
            </el-button>
            <GlassButton variant="primary" size="large" @click="buyNow" :disabled="!userStore.isLoggedIn">
              立即购买
            </GlassButton>
          </div>
        </div>
      </div>
      
      <div class="comments-section glass-card">
        <h3>留言</h3>
        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <el-avatar :size="32" :src="comment.user?.avatar" />
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-user">{{ comment.user?.nickname }}</span>
                <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
              </div>
              <div class="comment-text">{{ comment.content }}</div>
            </div>
          </div>
        </div>
        
        <div class="comment-form" v-if="userStore.isLoggedIn">
          <el-input v-model="commentContent" placeholder="写下你的留言..." class="glass-input" />
          <GlassButton variant="primary" @click="submitComment" :loading="commentLoading">留言</GlassButton>
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
import GlassButton from '@/components/GlassButton.vue'

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

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}-${date.getDate()}`
}

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
  padding: 24px;
  background: #fff;
  border-radius: 16px;
}

.goods-images {
  width: 400px;
  flex-shrink: 0;
  
  :deep(.el-carousel__item) {
    border-radius: 12px;
  }
}

.goods-info {
  flex: 1;
}

.title {
  font-size: 26px;
  font-weight: 700;
  color: #111111;
  margin-bottom: 20px;
  line-height: 1.4;
}

.price {
  font-size: 36px;
  color: #E4393C;
  font-weight: 700;
  margin-bottom: 24px;
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  
  .seller-name {
    font-size: 16px;
    font-weight: 500;
    color: #666666;
  }
}

.description {
  font-size: 15px;
  line-height: 1.8;
  color: #444444;
  margin-bottom: 30px;
}

.actions {
  display: flex;
  gap: 16px;
}

.comments-section {
  margin-top: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #333333;
    margin-bottom: 20px;
  }
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.comment-user {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
}

.comment-time {
  font-size: 12px;
  color: #999999;
}

.comment-text {
  font-size: 14px;
  color: #555555;
  line-height: 1.6;
}

.comment-form {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  
  .glass-input {
    flex: 1;
  }
}

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #FF3B30;
}

@media (max-width: 768px) {
  .goods-container {
    flex-direction: column;
    gap: 20px;
  }
  
  .goods-images {
    width: 100%;
  }
}
</style>