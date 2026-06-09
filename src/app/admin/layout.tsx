'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const userStr = localStorage.getItem('admin_user')
    if (!token || !userStr) {
      if (pathname !== '/admin/login') {
        router.replace('/admin/login')
      } else {
        setLoading(false)
      }
      return
    }
    setAdmin(JSON.parse(userStr))
    setLoading(false)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.replace('/admin/login')
  }

  // 登录页使用独立布局
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  const navItems = [
    { label: '用户管理', path: '/admin/users', icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-gray-100">
          <span className="font-bold text-primary">ArchFocus 管理后台</span>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                pathname.startsWith(item.path)
                  ? 'text-primary bg-primary-bg font-medium border-r-2 border-primary'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 mb-2">{admin.username}</div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-primary transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
