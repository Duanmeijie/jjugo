<template>
  <div class="chatbot-container">
    <div class="chatbot-float" @click="toggleChat" v-if="!isOpen">
      <el-icon :size="28"><ChatDotRound /></el-icon>
    </div>

    <transition name="slide">
      <div class="chatbot-panel" v-if="isOpen">
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
            <div class="message-bubble">您好！我是九院小助手，请问有什么可以帮您？</div>
          </div>

          <div class="hot-questions" v-if="hotQuestions.length && messages.length <= 1">
            <el-tag
              v-for="q in hotQuestions"
              :key="q.id"
              class="hot-tag"
              @click="sendQuickQuestion(q.question)"
            >
              {{ q.question }}
            </el-tag>
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
                <div class="message-bubble">
                  <span v-if="msg.typing">正在思考...</span>
                  <span v-else>{{ msg.text }}</span>
                </div>
              </div>
            </div>
            <div class="message-bubble user-bubble" v-else>
              <span>{{ msg.text }}</span>
            </div>
          </div>
        </div>

        <div class="chatbot-input">
          <el-select v-model="selectedModel" placeholder="选择模型" class="model-select" :disabled="loading">
            <el-option label="自动推荐" value="" />
            <el-option label="MiniMax M2.5 Free" value="minimax-m2.5-free" />
            <el-option label="GLM-4 Flash" value="glm-4-flash" />
            <el-option label="Qwen Turbo" value="qwen-turbo" />
            <el-option label="Nemotron-3-8B" value="nemotron-3-8b" />
          </el-select>
          <el-input
            v-model="inputMessage"
            placeholder="输入问题，AI 智能客服为您解答..."
            @keyup.enter="sendMessage"
            :disabled="loading"
          />
          <el-button
            type="primary"
            :icon="Position"
            @click="sendMessage"
            :loading="loading"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { ChatDotRound, Close, Service, Position, Lightning } from '@element-plus/icons-vue'
import axios from 'axios'

const isOpen = ref(false)
const inputMessage = ref('')
const messages = ref([])
const hotQuestions = ref([])
const loading = ref(false)
const messagesRef = ref(null)
const selectedModel = ref('')

const toggleChat = () => {
  isOpen.value = !isOpen.value
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
  background: #ff6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.1);
  }
}

.chatbot-panel {
  width: 350px;
  height: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chatbot-header {
  height: 50px;
  background: #ff6b6b;
  color: #fff;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-size: 16px;
    font-weight: bold;
  }

  .close-btn {
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }
}

.chatbot-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f5f7fa;
}

.welcome-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.robot-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ffa8a8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.error-bubble {
  background: #fee;
  color: #d00;
  border: 1px solid #fcc;
}

.model-name {
  font-size: 11px;
  color: #999;
  text-align: right;
  
  &.ai {
    color: #999;
  }
  
  &.local {
    color: #409eff;
  }
  
  &.error {
    color: #f56c6c;
  }
}

.user-bubble {
  background: #e0e0e0;
  color: #333;
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

.message-source {
  display: flex;
  align-items: center;
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
  cursor: pointer;
  &:hover {
    background: #ff6b6b;
    color: #fff;
    border-color: #ff6b6b;
  }
}

.chatbot-input {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
  align-items: center;

  .model-select {
    width: 130px;
    flex-shrink: 0;
  }

  .el-input {
    flex: 1;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 768px) {
  .chatbot-panel {
    width: 100%;
    height: 70%;
    border-radius: 0;
  }

  .chatbot-container {
    bottom: 0;
    right: 0;
  }
}
</style>