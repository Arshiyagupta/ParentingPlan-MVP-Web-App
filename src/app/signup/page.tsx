'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const { signUp } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmailSent, setShowEmailSent] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const result = await signUp(formData.email, formData.password, inviteToken || undefined)

      if (result.error) {
        console.error('Signup failed:', result.error)
        setErrors({ submit: result.error.message || 'Account creation failed. Please try again.' })
      } else {
        // Email confirmation is disabled, all users go directly to dashboard
        // If there was an invite token, pass it to dashboard for processing
        const dashboardUrl = result.inviteToken ? `/dashboard?invite=${result.inviteToken}` : '/dashboard'
        router.push(dashboardUrl)
      }
    } catch (error) {
      console.error('Signup failed:', error)
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
        {inviteToken && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              You&apos;ve been invited to join SafeTalk! Create your account to get started.
            </p>
          </div>
        )}

        <Card>
          {showEmailSent ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-safetalk-green rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Check your email
              </h1>

              <p className="text-slate-600 mb-6">
                We&apos;ve sent a confirmation link to <strong>{formData.email}</strong>
              </p>

              <p className="text-sm text-slate-500 mb-6">
                Click the link in your email to confirm your account and complete the setup process.
              </p>

              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowEmailSent(false)}
                  className="w-full"
                >
                  Back to signup
                </Button>

                <p className="text-xs text-slate-500">
                  Didn&apos;t receive the email? Check your spam folder or try signing up again.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                  Create your account
                </h1>
                <p className="text-slate-600">
                  Join SafeTalk to start building better co-parenting communication
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
              placeholder="Create a secure password"
              required
            />

            <Input
              type="password"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              placeholder="Confirm your password"
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
              Create account
            </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-safetalk-green hover:text-safetalk-green-hover"
                  >
                    Log in
                  </Link>
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">
                  By continuing you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-slate-600">Loading...</div>
      </div>
    </div>}>
      <SignupPageContent />
    </Suspense>
  )
}