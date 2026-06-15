// src/components/layout/mobile-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const navItems = [
  { href: '/', icon: '📊', label: '工作台' },
  { href: '/create', icon: '✍️', label: '创作' },
  { href: '/drafts', icon: '📋', label: '笔记库' },
  { href: '/analytics', icon: '📈', label: '数据' },
]

export function MobileNav() {
  const pathname = usePathname()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout()
      window.location.href = '/login'
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 text-center py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-gray-400'
              )}
            >
              <div className="text-lg mb-0.5">{item.icon}</div>
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 text-center py-2 text-xs text-gray-400 transition-colors hover:text-red-500"
        >
          <div className="text-lg mb-0.5">🚪</div>
          退出
        </button>
      </div>
    </nav>
  )
}
