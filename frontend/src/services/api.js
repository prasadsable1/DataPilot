import axios from 'axios'

const SESSION_KEY = 'datapilot-session-id'
let sessionId = localStorage.getItem(SESSION_KEY)
if (!sessionId) {
  sessionId = crypto.randomUUID()
  localStorage.setItem(SESSION_KEY, sessionId)
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'X-Session-ID': sessionId },
})

export function errorMessage(error) {
  return error.response?.data?.detail || error.message || 'Something went wrong. Please try again.'
}

export default api
