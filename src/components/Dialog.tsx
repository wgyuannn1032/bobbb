import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  children: ReactNode
  onClose?: () => void
  labelledBy?: string
  describedBy?: string
  role?: 'dialog' | 'alertdialog'
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  panelClassName?: string
  overlayClassName?: string
}

/** Shared accessible modal shell for dialogs across the app. */
export default function Dialog({
  children,
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  closeOnBackdrop = true,
  closeOnEscape = true,
  panelClassName = '',
  overlayClassName = '',
}: DialogProps) {
  useEffect(() => {
    if (!closeOnEscape || !onClose) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, onClose])

  const content = (
    <div
      className={`app-overlay fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${overlayClassName}`}
      onMouseDown={event => {
        if (closeOnBackdrop && onClose && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : '對話視窗'}
        aria-describedby={describedBy}
        className={`app-surface app-text w-full border rounded-2xl shadow-2xl animate-fade-in-up ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
