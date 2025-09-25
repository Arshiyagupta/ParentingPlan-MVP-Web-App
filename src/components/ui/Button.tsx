import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl'

  const variantClasses = {
    primary: 'bg-safetalk-green text-white hover:bg-safetalk-green-hover focus:ring-safetalk-green',
    secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 focus:ring-gray-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[48px]'
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  )
}