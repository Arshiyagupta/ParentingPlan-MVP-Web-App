'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [confirmationStatus, setConfirmationStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get URL parameters from the confirmation email
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // The tokens are automatically handled by Supabase
          // Check if user is now authenticated
          setTimeout(() => {
            if (user) {
              setConfirmationStatus('success')
            } else {
              setConfirmationStatus('error')
              setError('Email confirmation was successful, but there was an issue signing you in. Please try logging in manually.')
            }
            setIsLoading(false)
          }, 2000)
        } else {
          setConfirmationStatus('error')
          setError('Invalid confirmation link. Please check your email and try clicking the link again.')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Email confirmation error:', error)
        setConfirmationStatus('error')
        setError('An error occurred during email confirmation. Please try again.')
        setIsLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [searchParams, user])

  const handleContinue = () => {
    // Check if there's an invite token to handle
    const inviteToken = searchParams.get('invite')

    if (inviteToken) {
      // Redirect to dashboard and let it handle the invite
      router.push(`/dashboard?invite=${inviteToken}`)
    } else {
      router.push('/dashboard')
    }
  }

  const handleRetry = () => {
    router.push('/signup')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <Card>
          {confirmationStatus === 'loading' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Confirming your email...
              </h1>

              <p className="text-slate-600 mb-6">
                Please wait while we confirm your account.
              </p>
            </div>
          )}

          {confirmationStatus === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-success rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Email confirmed!
              </h1>

              <p className="text-slate-600 mb-6">
                Your account has been successfully verified. You're ready to start using SafeTalk.
              </p>

              <Button
                variant="primary"
                size="md"
                onClick={handleContinue}
                className="w-full"
              >
                Continue to Dashboard
              </Button>
            </div>
          )}

          {confirmationStatus === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Confirmation failed
              </h1>

              <p className="text-slate-600 mb-6">
                {error}
              </p>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRetry}
                  className="w-full"
                >
                  Try again
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Go to login
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}