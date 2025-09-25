'use client'

import { TextareaHTMLAttributes, forwardRef, useEffect, useRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  autoResize?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  autoResize = false,
  className = '',
  ...props
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const combinedRef = ref || textareaRef

  useEffect(() => {
    if (autoResize && combinedRef && 'current' in combinedRef && combinedRef.current) {
      const textarea = combinedRef.current
      const resizeTextarea = () => {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }

      textarea.addEventListener('input', resizeTextarea)
      resizeTextarea() // Initial resize

      return () => textarea.removeEventListener('input', resizeTextarea)
    }
  }, [autoResize, combinedRef])

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}

      <textarea
        ref={combinedRef}
        className={`input-field ${autoResize ? 'resize-none' : 'resize-y'} min-h-[100px] ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea