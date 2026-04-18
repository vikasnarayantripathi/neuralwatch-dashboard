import axios from 'axios'

const API_BASE = 'https://neuralwatch-api-production.up.railway.app'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nw_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nw_token')
      localStorage.removeItem('nw_tenant')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email, password) =>
  api.post('/api/auth/login', { email, password })

export const register = (name, email, password) =>
  api.post('/api/auth/register', { name, email, password })

export const getMe = () =>
  api.get('/api/auth/me')

// Cameras — use rtsp_url to match backend
export const getCameras = () =>
  api.get('/api/cameras')

export const addCamera = (data) =>
  api.post('/api/cameras', {
    name: data.name,
    rtsp_url: data.stream_url || data.rtsp_url,
    brand: data.brand || 'generic'
  })

export const deleteCamera = (id) =>
  api.delete(`/api/cameras/${id}`)

export const getCameraHealth = (id) =>
  api.get(`/api/cameras/${id}/health`)

// Alerts
export const getAlerts = () =>
  api.get('/api/alerts')

export const dismissAlert = (id) =>
  api.post(`/api/alerts/${id}/dismiss`)

export const confirmAlert = (id) =>
  api.post(`/api/alerts/${id}/confirm`)

// Relay
export const getRelays = () =>
  api.get('/api/relay')

// Stream control
export const startStream = (cameraId) =>
  api.post(`/api/stream/${cameraId}/start`)

export const stopStream = (cameraId) =>
  api.post(`/api/stream/${cameraId}/stop`)

export const getActiveStreams = () =>
  api.get('/api/stream/active')

// Playback
export const getSegments = (cameraId, date) =>
  api.get(`/api/playback/${cameraId}/segments${date ? `?date=${date}` : ''}`)

export const getPlaylist = (cameraId, date) =>
  api.get(`/api/playback/${cameraId}/playlist${date ? `?date=${date}` : ''}`)

export const getRecordingDates = (cameraId) =>
  api.get(`/api/playback/${cameraId}/dates`)

export default api
