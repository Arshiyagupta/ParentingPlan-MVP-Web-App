'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import Toast, { ToastProps } from '@/components/ui/Toast'

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Date.now().toString()
    const newToast = {
      ...toast,
      id,
      onClose: removeToast
    }
    setToasts(prev => [...prev, newToast])
  }

  const showSuccess = (message: string, title?: string) => {
    showToast({ type: 'success', message, title })
  }

  const showError = (message: string, title?: string) => {
    showToast({ type: 'error', message, title })
  }

  const showInfo = (message: string, title?: string) => {
    showToast({ type: 'info', message, title })
  }

  const showWarning = (message: string, title?: string) => {
    showToast({ type: 'warning', message, title })
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}