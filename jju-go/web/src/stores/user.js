import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const isLoggedIn = computed(() => !!token.value)

  async function fetchUserInfo() {
    if (!token.value) return
    try {
      const res = await request.get('/auth/me')
      userInfo.value = res.data
    } catch (e) {
      console.error(e)
    }
  }

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  if (token.value) {
    fetchUserInfo()
  }

  return { token, userInfo, isLoggedIn, setToken, logout, fetchUserInfo }
})