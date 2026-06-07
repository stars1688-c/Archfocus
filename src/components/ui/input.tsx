// src/components/ui/input.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-500 mb-1.5">
            {label}
          </label>
        )}
        <input
          className={cn(
            'w-full px-3.5 py-2 border border-gray-200 rounded-lg outline-none transition-all',
            'focus:border-primary focus:ring-2 focus:ring-primary/10',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }