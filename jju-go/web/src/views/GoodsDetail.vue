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
          
          <div v-if="goods.seller_student_info" class="seller-auth">
            <el-tag type="success" size="small">卖家实名认证</el-tag>
          </div>
          
          <div class="seller-info">
            <el-avatar :size="40" :src="goods.seller?.avatar" />
            <div class="seller-detail">
              <span class="seller-name">{{ goods.seller?.nickname }}</span>
              <span v-if="goods.seller?.student_info?.college" class="seller-college">
                {{ goods.seller?.student_info?.college }} · {{ goods.seller?.student_info?.class }}
              </span>
            </div>
          </div>
          
          <div v-if="goods.preferred_location || goods.preferred_time_slots?.length" class="trade-agreement">
            <div class="agreement-title">交易约定</div>
            <div v-if="goods.preferred_location" class="agreement-item">
              <span class="label">交易地点：</span>
              <span>{{ goods.preferred_location }}</span>
            </div>
            <div v-if="goods.preferred_time_slots?.length" class="agreement-item">
              <span class="label">交易时间：</span>
              <span>{{ goods.preferred_time_slots?.join('、') }}</span>
            </div>
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
        <h3>留言区</h3>
        <div class="comment-list">
          <div 
            v-for="comment in visibleComments" 
            :key="comment.id" 
            :class="['comment-item', { 'is-verified': comment.is_verified_buyer, 'is-private': comment.visibility === 'private' }]"
          >
            <el-avatar :size="32" :src="comment.user?.avatar" :class="{ 'gold-border': comment.is_verified_buyer }" />
            <div class="comment-content">
              <div class="comment-header">
                <span :class="['comment-user', { 'verified-buyer': comment.is_verified_buyer }]">
                  {{ comment.user?.nickname }}
                  <el-tag v-if="comment.is_verified_buyer" type="warning" size="small" class="verified-tag">已购</el-tag>
                </span>
                <span v-if="comment.visibility === 'private'" class="private-tag">
                  <el-icon><Lock /></el-icon> 私密
                </span>
                <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
              </div>
              <div :class="['comment-text', { 'private-text': comment.visibility === 'private' && !comment.is_own && !comment.is_seller }]">
                <template v-if="comment.visibility === 'private' && !comment.is_own && !comment.is_seller">
                  <el-icon><Lock /></el-icon> 此为私密留言，仅卖家和留言者可见
                </template>
                <template v-else>
                  {{ comment.content }}
                </template>
              </div>
            </div>
            <div v-if="comment.is_own || comment.is_seller" class="comment-actions">
              <el-button type="danger" size="small" text @click="deleteComment(comment.id)">删除</el-button>
            </div>
          </div>
        </div>
        
        <div v-if="userStore.isLoggedIn" class="comment-form">
          <div class="comment-options">
            <el-switch v-model="isPrivate" active-text="私密留言" inactive-text="" />
            <span class="switch-tip">开启后仅卖家与您可见</span>
          </div>
          <el-input v-model="commentContent" placeholder="写下你的留言..." class="glass-input" />
          <GlassButton variant="primary" @click="submitComment" :loading="commentLoading">留言</GlassButton>
        </div>
        <div v-else class="login-tip">
          <el-button type="primary" @click="router.push('/login')">登录后留言</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { request } from '@/utils/request'
import { Star, Lock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const isPrivate = ref(false)

const visibleComments = computed(() => {
  const userId = userStore.userInfo?.id
  return comments.value.filter(c => {
    if (c.visibility === 'public') return true
    if (c.visibility === 'private') {
      return c.is_seller || c.is_own
    }
    return true
  })
})

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
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
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '下单失败')
  }
}

const submitComment = async () => {
  if (!commentContent.value.trim()) return
  commentLoading.value = true
  try {
    await request.post(`/goods/${route.params.id}/comments`, { 
      content: commentContent.value,
      visibility: isPrivate.value ? 'private' : 'public'
    })
    commentContent.value = ''
    isPrivate.value = false
    await fetchGoods()
    ElMessage.success('留言成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || '留言失败')
  } finally {
    commentLoading.value = false
  }
}

const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定删除此留言吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.delete(`/comments/${commentId}`)
    comments.value = comments.value.filter(c => c.id !== commentId)
    ElMessage.success('删除成功')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
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
  margin-bottom: 16px;
}

.seller-auth {
  margin-bottom: 16px;
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  
  .seller-detail {
    display: flex;
    flex-direction: column;
  }
  
  .seller-name {
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }
  
  .seller-college {
    font-size: 13px;
    color: #999;
  }
}

.trade-agreement {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  
  .agreement-title {
    font-size: 14px;
    font-weight: 600;
    color: #E4393C;
    margin-bottom: 12px;
  }
  
  .agreement-item {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
    
    .label {
      color: #999;
    }
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
  
  &.is-verified {
    background: linear-gradient(135deg, #fffbf0 0%, #fff 100%);
    margin: 0 -12px;
    padding: 12px;
    border-radius: 8px;
    border-bottom: 1px solid #f0e6d2;
  }
  
  &.is-private {
    background: #f5f5f5;
    margin: 0 -12px;
    padding: 12px;
    border-radius: 8px;
  }
  
  .gold-border {
    border: 2px solid #D4AF37;
  }
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.comment-user {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  
  &.verified-buyer {
    color: #D4AF37;
  }
}

.verified-tag {
  margin-left: 4px;
}

.private-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
}

.comment-time {
  font-size: 12px;
  color: #999999;
}

.comment-text {
  font-size: 14px;
  color: #555555;
  line-height: 1.6;
  
  &.private-text {
    color: #999;
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.comment-actions {
  display: flex;
  align-items: flex-start;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
  
  .comment-options {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .switch-tip {
      font-size: 12px;
      color: #999;
    }
  }
  
  .glass-input {
    width: 100%;
  }
}

.login-tip {
  margin-top: 20px;
  text-align: center;
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