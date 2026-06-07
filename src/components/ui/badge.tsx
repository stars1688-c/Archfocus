// src/components/ui/badge.tsx
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'red' | 'blue' | 'green' | 'orange' | 'purple'
}

export function Badge({ className, variant = 'blue', ...props }: BadgeProps) {
  const variants = {
    red: 'bg-primary-bg text-primary',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}