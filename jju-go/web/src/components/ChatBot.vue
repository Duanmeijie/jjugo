<template>
  <div class="chatbot-container">
    <div class="chatbot-float glass" @click="toggleChat" v-if="!isOpen">
      <el-icon :size="28"><ChatDotRound /></el-icon>
    </div>

    <transition name="slide">
      <div class="chatbot-panel glass" v-if="isOpen">
        <div class="chatbot-header">
          <div class="header-left">
            <span class="title">九院小助手</span>
            <el-tag type="success" size="small" effect="dark">AI 增强版</el-tag>
          </div>
          <el-icon @click="toggleChat" class="close-btn"><Close /></el-icon>
        </div>

        <div class="chatbot-messages" ref="messagesRef">
          <div class="welcome-message">
            <div class="robot-avatar">
              <el-icon :size="24"><Service /></el-icon>
            </div>
            <div class="message-bubble bot-bubble">您好！我是九院小助手，请问有什么可以帮您？</div>
          </div>

          <div class="hot-questions" v-if="hotQuestions.length && messages.length <= 1">
            <div
              v-for="q in hotQuestions"
              :key="q.id"
              class="hot-tag glass"
              @click="sendQuickQuestion(q.question)"
            >
              {{ q.question }}
            </div>
          </div>

          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message-item', msg.isUser ? 'user' : 'bot']"
          >
            <div class="bot-message-wrapper" v-if="!msg.isUser">
              <div class="robot-avatar">
                <el-icon :size="20"><Service /></el-icon>
              </div>
              <div class="message-content">
                <div class="model-name" :class="msg.source">
                  {{ msg.source === 'ai' ? (msg.modelName || 'AI') : '本地智能模式' }}
                </div>
                <div class="message-bubble bot-bubble">
                  <span v-if="msg.typing" class="typing-indicator">
                    <span></span><span></span><span></span>
                  </span>
                  <span v-else>{{ msg.text }}</span>
                </div>
              </div>
            </div>
            <div class="message-bubble user-bubble" v-else>
              <span>{{ msg.text }}</span>
            </div>
          </div>
        </div>

        <div class="chatbot-input" v-if="isOpen">
          <el-select 
            v-model="selectedModel" 
            placeholder="选择模型" 
            class="model-select" 
            :disabled="loading"
            popper-class="model-dropdown"
          >
            <el-option label="自动推荐" value="" />
            <el-option 
              v-for="model in availableModels" 
              :key="model.id" 
              :label="`${model.name} (${model.provider})`" 
              :value="model.id" 
            />
          </el-select>
          <el-input
            v-model="inputMessage"
            placeholder="输入问题，AI 智能客服为您解答..."
            @keyup.enter="sendMessage"
            :disabled="loading"
            class="message-input"
          />
          <GlassButton variant="primary" :icon="Position" @click="sendMessage" :loading="loading" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { ChatDotRound, Close, Service, Position } from '@element-plus/icons-vue'
import axios from 'axios'
import GlassButton from './GlassButton.vue'

const isOpen = ref(false)
const inputMessage = ref('')
const messages = ref([])
const hotQuestions = ref([])
const loading = ref(false)
const messagesRef = ref(null)
const selectedModel = ref('')
const availableModels = ref([])

const toggleChat = () => {
  isOpen.value = !isOpen.value
}

const fetchAvailableModels = async () => {
  try {
    const res = await axios.get('/api/chatbot/models')
    if (res.data.code === 200) {
      availableModels.value = res.data.data.models
    }
  } catch (err) {
    console.error('Failed to fetch available models:', err)
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const fetchHotQuestions = async () => {
  try {
    const res = await axios.get('/api/chatbot/hot-questions')
    if (res.data.code === 200) {
      hotQuestions.value = res.data.data
    }
  } catch (err) {
    console.error('Failed to fetch hot questions:', err)
  }
}

const sendQuickQuestion = (question) => {
  addUserMessage(question)
  sendToBot(question)
}

const addUserMessage = (text) => {
  messages.value.push({ text, isUser: true, modelName: '' })
  scrollToBottom()
}

const addBotMessage = (text, typing = false, source = 'local', modelName = '本地离线模式') => {
  messages.value.push({ text, isUser: false, typing, source, modelName })
  scrollToBottom()
}

const updateLastBotMessage = (text, source = 'local', modelName = '本地离线模式') => {
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg && !lastMsg.isUser) {
    lastMsg.text = text
    lastMsg.typing = false
    lastMsg.source = source
    lastMsg.modelName = modelName
  }
  scrollToBottom()
}

const sendMessage = () => {
  const text = inputMessage.value.trim()
  if (!text || loading.value) return

  inputMessage.value = ''
  addUserMessage(text)
  sendToBot(text)
}

const sendToBot = async (text) => {
  loading.value = true
  addBotMessage('', true, 'local', '')

  try {
    const history = messages.value.filter(m => !m.typing).slice(-6).map(m => ({
      text: m.text,
      isUser: m.isUser
    }))
    const res = await axios.post('/api/chatbot/ask', { 
      message: text, 
      history,
      model: selectedModel.value || undefined
    })
    if (res.data.code === 200) {
      const data = res.data.data
      const reply = data.reply || data.answer || '服务暂不可用'
      const modelName = data.modelName || '未知'
      const source = data.source || 'local'
      await typeWriterEffect(reply, source, modelName)
    }
  } catch (err) {
    updateLastBotMessage('网络错误，请稍后再试', 'error', '连接失败')
  } finally {
    loading.value = false
  }
}

const typeWriterEffect = async (text, source = 'local', modelName = '未知模型') => {
  const lastMsg = messages.value[messages.value.length - 1]
  if (!lastMsg || lastMsg.isUser) {
    addBotMessage('', true, source, modelName)
  }

  let displayed = ''
  const chars = text.split('')

  for (let i = 0; i < chars.length; i++) {
    displayed += chars[i]
    const currentMsg = messages.value[messages.value.length - 1]
    if (currentMsg) {
      currentMsg.text = displayed
      currentMsg.typing = false
      currentMsg.source = source
      currentMsg.modelName = modelName
    }
    await new Promise(resolve => setTimeout(resolve, 30))
  }
}

onMounted(() => {
  fetchHotQuestions()
  fetchAvailableModels()
})
</script>

<style lang="scss" scoped>
.chatbot-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.chatbot-float {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E4393C 0%, #FF6B6B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(228, 57, 60, 0.4);
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px rgba(228, 57, 60, 0.5);
  }
}

.chatbot-panel {
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 380px;
  height: 540px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: visible;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

.chatbot-header {
  height: 60px;
  background: linear-gradient(135deg, #E4393C 0%, #FF6B6B 100%);
  color: #fff;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title {
    font-size: 17px;
    font-weight: 600;
  }

  .close-btn {
    cursor: pointer;
    padding: 4px;
    border-radius: 8px;
    transition: background 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.chatbot-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f8f9fa;
}

.welcome-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.robot-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E4393C 0%, #FF6B6B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(228, 57, 60, 0.3);
}

.message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.bot-bubble {
  background: #fff;
  color: #333333;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-bubble {
  background: linear-gradient(135deg, #E4393C 0%, #FF6B6B 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(228, 57, 60, 0.3);
}

.model-name {
  font-size: 11px;
  color: #999999;
  text-align: right;
  
  &.ai { color: #E4393C; }
  &.local { color: #FF6B6B; }
  &.error { color: #FF3B30; }
}

.bot-message-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;

  &.user {
    justify-content: flex-end;
  }

  &.bot {
    justify-content: flex-start;
  }
}

.hot-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.hot-tag {
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  border: 1px solid #e0e0e0;
  color: #333333;
  
  &:hover {
    background: linear-gradient(135deg, #E4393C 0%, #FF6B6B 100%);
    color: #fff;
    border-color: transparent;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(228, 57, 60, 0.3);
  }
}

.chatbot-input {
  padding: 14px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
  align-items: center;
  position: relative;
  z-index: 9998;

  .model-select {
    width: 110px;
    flex-shrink: 0;
    position: relative;
    z-index: 10000;
    
    :deep(.el-select__wrapper) {
      border-radius: 20px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      box-shadow: none;
      
      &:hover, &.is-focused {
        border-color: #E4393C;
        box-shadow: 0 0 0 2px rgba(228, 57, 60, 0.1);
      }
    }
  }

  .message-input {
    flex: 1;
    
    :deep(.el-input__wrapper) {
      border-radius: 20px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      box-shadow: none;
      
      &:hover, &.is-focused {
        border-color: #E4393C;
        box-shadow: 0 0 0 2px rgba(228, 57, 60, 0.1);
      }
    }
  }
}

.typing-indicator {
  display: inline-flex;
  gap: 4px;
  
  span {
    width: 6px;
    height: 6px;
    background: #E4393C;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 768px) {
  .chatbot-panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
    bottom: 0;
    right: 0;
  }

  .chatbot-container {
    bottom: 0;
    right: 0;
  }
}
</style>