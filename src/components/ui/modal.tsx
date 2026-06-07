// src/components/ui/modal.tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

const Modal = DialogPrimitive.Root
const ModalTrigger = DialogPrimitive.Trigger
const ModalClose = DialogPrimitive.Close

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto',
        'bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
ModalContent.displayName = DialogPrimitive.Content.displayName

const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between px-5 py-4 border-b border-gray-100', className)} {...props} />
)
ModalHeader.displayName = 'ModalHeader'

const ModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-4', className)} {...props} />
)
ModalBody.displayName = 'ModalBody'

const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 px-5 py-4 border-t border-gray-100', className)} {...props} />
)
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalTrigger, ModalClose, ModalContent, ModalHeader, ModalBody, ModalFooter }