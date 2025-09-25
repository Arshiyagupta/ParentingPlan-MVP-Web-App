'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [connectionCode, setConnectionCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAutoConnect = async () => {
    if (!inviteToken) return

    setIsSubmitting(true)

    try {
      // Call API to accept invite
      const response = await fetch('/api/connect/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: inviteToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Redirect to dashboard
      router.push(data.redirectTo || '/dashboard')
    } catch (error) {
      console.error('Auto-connect failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect accounts automatically.'
      setError(errorMessage + ' Please try again.')
      setIsSubmitting(false)
    }
  }

  // Auto-connect if accessed from invite link
  useEffect(() => {
    if (inviteToken) {
      handleAutoConnect()
    }
  }, [inviteToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connectionCode.trim()) {
      setError('Connection code is required')
      return
    }

    if (connectionCode.length < 6) {
      setError('Connection code must be at least 6 characters')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // TODO: Call API to connect with code
      console.log('Connecting with code:', connectionCode)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock validation - in real app, server would validate
      if (connectionCode.toLowerCase() === 'abc123') {
        router.push('/dashboard')
      } else {
        setError('Invalid connection code. Please check and try again.')
      }
    } catch (error) {
      console.error('Connection failed:', error)
      setError('Connection failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConnectionCode(e.target.value.toUpperCase())
    if (error) {
      setError('')
    }
  }

  if (inviteToken && isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Card className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-safetalk-green border-t-transparent mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Connecting your accounts
            </h1>
            <p className="text-slate-600">
              Please wait while we set up your connection...
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        {inviteToken && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              Connecting your account from the invitation...
            </p>
          </div>
        )}

        <Card>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Connect with your co-parent
            </h1>
            <p className="text-slate-600">
              Enter the connection code shared by your co-parent
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Connection Code"
              value={connectionCode}
              onChange={handleInputChange}
              error={error}
              placeholder="Enter connection code"
              helperText="This is usually 6-8 uppercase characters"
              maxLength={8}
              pattern="[A-Z0-9]+"
              required
              autoFocus={!inviteToken}
              disabled={inviteToken && isSubmitting}
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              className="w-full"
              disabled={inviteToken && isSubmitting}
            >
              Connect
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Need help? Make sure you have the correct connection code from your co-parent.
            </p>
          </div>

          {!inviteToken && (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-600">
                Don't have a code?{' '}
                <button className="font-semibold text-safetalk-green hover:text-safetalk-green-hover">
                  Ask your co-parent to send you an invite
                </button>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}