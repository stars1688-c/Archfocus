// src/app/(auth)/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // Wait for Zustand persist to finish hydrating before checking auth
  useEffect(() => {
    if (useAuthStore.persist?.hasHydrated?.()) {
      setReady(true)
      return
    }
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => {
      setReady(true)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.push('/')
    }
  }, [ready, isAuthenticated, router])

  const handleLogin = async () => {
    if (!phone || !password) {
      setError('请输入手机号和密码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth', { phone, password })

      if (response.data.success) {
        login(response.data.data.user, response.data.data.token)
        localStorage.setItem('auth_token', response.data.data.token)
        router.push('/')
      } else {
        setError(response.data.error || '登录失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (!ready || isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-bg via-white to-orange-50 p-5">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">📌 ArchFocus</h1>
          <p className="text-gray-500 text-sm mt-1">小红书 AI 运营助手</p>
        </div>

        <div className="space-y-5">
          <Input
            label="手机号"
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </Button>

          <p className="text-center text-xs text-gray-400 mt-4">
            账号由管理员在后台创建，请联系管理员获取
          </p>
        </div>
      </div>
    </div>
  )
}