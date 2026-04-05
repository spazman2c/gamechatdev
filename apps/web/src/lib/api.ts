import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import type { PublicUser } from '@nexora/types'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
})

// Request: attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Single shared refresh promise — both AppShell and the 401 interceptor use this
// so only one refresh request ever goes out at a time regardless of how many callers.
let pendingRefresh: Promise<string | null> | null = null

export function getOrRefreshToken(): Promise<string | null> {
  const current = useAuthStore.getState().accessToken
  if (current) return Promise.resolve(current)

  if (pendingRefresh) return pendingRefresh

  pendingRefresh = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) {
        // 401/403 means the refresh token is genuinely expired — log out
        if (res.status === 401 || res.status === 403) {
          useAuthStore.getState().clearAuth()
        }
        return null
      }
      const data = await res.json() as { accessToken: string; user: PublicUser }
      useAuthStore.getState().setAuth(data.accessToken, data.user)
      return data.accessToken
    })
    .catch(() => {
      // Network error (offline, server down) — do NOT log out, just return null
      // The user will be retried on the next action
      return null
    })
    .finally(() => { pendingRefresh = null })

  return pendingRefresh
}

// Response: refresh access token on 401, retry once
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const token = await getOrRefreshToken()
      if (!token) return Promise.reject(error)
      originalRequest.headers.Authorization = `Bearer ${token}`
      return api(originalRequest)
    }

    return Promise.reject(error)
  },
)
