// src/components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const navItems = [
  { href: '/', icon: '📊', label: '工作台' },
  { href: '/create', icon: '✍️', label: '创作' },
  { href: '/drafts', icon: '📋', label: '笔记库' },
  { href: '/analytics', icon: '📈', label: '数据分析' },
]

interface SidebarProps {
  userName?: string
  planInfo?: string
}

export function Sidebar({ userName = '用户', planInfo = '个人版' }: SidebarProps) {
  const pathname = usePathname()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout()
      window.location.href = '/login'
    }
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
          AF
        </div>
        <h2 className="text-base font-semibold">ArchFocus</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-bg text-primary'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              <span className="text-lg w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-bg text-primary flex items-center justify-center font-semibold text-sm">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-xs text-gray-400">{planInfo}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span>🚪</span>
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  )
}
