// src/components/layout/header.tsx
'use client'

import { Menu } from 'lucide-react'

interface HeaderProps {
  title: string
  showHamburger?: boolean
  onHamburgerClick?: () => void
  rightContent?: React.ReactNode
}

export function Header({ title, showHamburger, onHamburgerClick, rightContent }: HeaderProps) {
  return (
    <header className="h-14 px-6 bg-white border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showHamburger && (
          <button
            onClick={onHamburgerClick}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {rightContent && <div>{rightContent}</div>}
    </header>
  )
}
