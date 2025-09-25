import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'active' | 'locked' | 'completed'
  className?: string
}

export default function Badge({ children, variant = 'active', className = '' }: BadgeProps) {
  const variantClasses = {
    active: 'bg-safetalk-green text-white',
    locked: 'bg-gray-200 text-slate-500',
    completed: 'bg-success text-white'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}