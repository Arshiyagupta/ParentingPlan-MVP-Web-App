'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const { error } = await signIn(formData.email, formData.password)

      if (error) {
        console.error('Login failed:', error)
        setErrors({ submit: error.message || 'Invalid email or password. Please try again.' })
      } else {
        // Auth context will handle the redirect automatically
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Login failed:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Welcome back
            </h1>
            <p className="text-slate-600">
              Sign in to your SafeTalk account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              placeholder="Enter your email"
              required
            />

            <Input
              type="password"
              label="Password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              placeholder="Enter your password"
              required
            />

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              className="w-full"
            >
              Log in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-semibold text-safetalk-green hover:text-safetalk-green-hover"
              >
                Create account
              </Link>
            </p>
          </div>

          {/* Future: Forgot password link */}
          {/* <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              Forgot your password?
            </Link>
          </div> */}
        </Card>
      </div>
    </div>
  )
}