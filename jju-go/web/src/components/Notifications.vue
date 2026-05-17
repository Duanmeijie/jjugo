<template>
  <div class="notifications-container">
    <div class="notifications-bell" @click="toggleNotifications">
      <el-icon :size="24"><Bell /></el-icon>
      <span class="unread-badge" v-if="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </div>

    <transition name="slide-down">
      <div class="notifications-panel glass" v-if="isOpen">
        <div class="notifications-header">
          <span class="title">通知中心</span>
          <div class="header-actions">
            <el-button size="small" @click="markAllAsRead" v-if="unreadCount > 0">全部已读</el-button>
            <el-icon @click="toggleNotifications" class="close-btn"><Close /></el-icon>
          </div>
        </div>

        <div class="notifications-list" ref="listRef">
          <div v-if="notifications.length === 0" class="empty-state">
            <el-icon :size="48" color="#ccc"><Bell /></el-icon>
            <p>暂无通知</p>
          </div>

          <div
            v-for="notif in notifications"
            :key="notif.id"
            :class="['notification-item', { unread: !notif.is_read }]"
            @click="handleNotificationClick(notif)"
          >
            <div class="notif-icon" :class="notif.type">
              <el-icon :size="20">
                <ChatDotRound v-if="notif.type === 'new_comment'" />
                <ShoppingCart v-else-if="notif.type === 'order_created' || notif.type === 'order_completed'" />
                <Sell v-else-if="notif.type === 'goods_sold'" />
                <InfoFilled v-else />
              </el-icon>
            </div>
            <div class="notif-content">
              <div class="notif-title">{{ notif.title }}</div>
              <div class="notif-text">{{ notif.content }}</div>
              <div class="notif-time">{{ formatTime(notif.created_at) }}</div>
            </div>
            <el-button
              size="small"
              type="danger"
              :icon="Delete"
              circle
              class="delete-btn"
              @click.stop="deleteNotification(notif.id)"
            />
          </div>
        </div>

        <div class="load-more" v-if="hasMore && notifications.length > 0">
          <el-button @click="loadMore" :loading="loading">加载更多</el-button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Bell, Close, ChatDotRound, ShoppingCart, Sell, InfoFilled, Delete } from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const isOpen = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const listRef = ref(null)
const currentPage = ref(1)
const hasMore = ref(true)

let pollInterval = null

const toggleNotifications = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    loadNotifications()
  }
}

const fetchUnreadCount = async () => {
  try {
    const res = await axios.get('/api/notifications/unread-count')
    if (res.data.code === 200) {
      unreadCount.value = res.data.data.count
    }
  } catch (err) {
    console.error('Failed to fetch unread count:', err)
  }
}

const loadNotifications = async (reset = true) => {
  if (loading.value) return
  
  loading.value = true
  try {
    if (reset) {
      currentPage.value = 1
      notifications.value = []
    }
    
    const res = await axios.get('/api/notifications', {
      params: {
        page: currentPage.value,
        limit: 10
      }
    })
    
    if (res.data.code === 200) {
      const data = res.data.data
      if (reset) {
        notifications.value = data.list
      } else {
        notifications.value = [...notifications.value, ...data.list]
      }
      hasMore.value = notifications.value.length < data.total
    }
  } catch (err) {
    ElMessage.error('加载通知失败')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  currentPage.value++
  loadNotifications(false)
}

const markAllAsRead = async () => {
  try {
    const res = await axios.put('/api/notifications/read-all')
    if (res.data.code === 200) {
      notifications.value.forEach(n => n.is_read = true)
      unreadCount.value = 0
      ElMessage.success('已全部标记为已读')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const handleNotificationClick = async (notif) => {
  if (!notif.is_read) {
    try {
      await axios.put(`/api/notifications/${notif.id}/read`)
      notif.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }
  
  if (notif.related_id) {
    if (notif.type === 'order_created' || notif.type === 'order_completed') {
      window.location.href = `/orders`
    } else if (notif.type === 'new_comment' || notif.type === 'goods_sold') {
      window.location.href = `/goods/${notif.related_id}`
    }
  }
}

const deleteNotification = async (id) => {
  try {
    const res = await axios.delete(`/api/notifications/${id}`)
    if (res.data.code === 200) {
      notifications.value = notifications.value.filter(n => n.id !== id)
      ElMessage.success('已删除')
      fetchUnreadCount()
    }
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

const formatTime = (time) => {
  const now = new Date()
  const date = new Date(time)
  const diff = now - date
  
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (7 * 24 * 60 * 60 * 1000))}天前`
  
  return date.toLocaleDateString('zh-CN')
}

const startPolling = () => {
  pollInterval = setInterval(() => {
    fetchUnreadCount()
  }, 30000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
}

onMounted(() => {
  fetchUnreadCount()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style lang="scss" scoped>
.notifications-container {
  position: fixed;
  top: 70px;
  right: 20px;
  z-index: 9998;
}

.notifications-bell {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
  
  .unread-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #E4393C;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }
}

.notifications-panel {
  position: absolute;
  top: 54px;
  right: 0;
  width: 380px;
  max-height: 500px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notifications-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .close-btn {
    cursor: pointer;
    padding: 4px;
    border-radius: 8px;
    transition: background 0.2s;
    
    &:hover {
      background: #f5f5f5;
    }
  }
}

.notifications-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  
  p {
    margin-top: 12px;
    font-size: 14px;
  }
}

.notification-item {
  padding: 14px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &.unread {
    background: #fff9f9;
    
    &::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      background: #E4393C;
      border-radius: 50%;
    }
  }
}

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.new_comment {
    background: #e8f4ff;
    color: #1890ff;
  }
  
  &.order_created, &.order_completed {
    background: #f6ffed;
    color: #52c41a;
  }
  
  &.goods_sold {
    background: #fff7e6;
    color: #fa8c16;
  }
  
  &.system {
    background: #f9f0ff;
    color: #722ed1;
  }
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.notif-text {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 6px;
}

.notif-time {
  font-size: 12px;
  color: #999;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  
  .notification-item:hover & {
    opacity: 1;
  }
}

.load-more {
  padding: 12px;
  text-align: center;
  border-top: 1px solid #f0f0f0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .notifications-container {
    top: 60px;
    right: 10px;
  }
  
  .notifications-panel {
    width: calc(100vw - 20px);
    max-width: 380px;
  }
}
</style>
