'use client'

import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'
import Card from './Card'
import { useToast } from '@/context/ToastContext'

interface InviteCoparentModalProps {
  isOpen: boolean
  onClose: () => void
  approvedMessage?: string
  connectionCode?: string
}

export default function InviteCoparentModal({
  isOpen,
  onClose,
  approvedMessage = "I appreciate how you always make time for school drop-offs.",
  connectionCode = "ABC123"
}: InviteCoparentModalProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showSuccess, showError } = useToast()

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      // Call API to send invite
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      // Show success toast
      showSuccess(`Invite sent to ${email}!`)

      // Reset form
      setEmail('')

      // Close modal
      onClose()
    } catch (error) {
      console.error('Failed to send invite:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invite. Please try again.'
      showError(errorMessage)
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(connectionCode)
    showSuccess('Connection code copied!')
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('')
      setError('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite your co-parent" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email input */}
        <Input
          type="email"
          label="Co-parent's Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          placeholder="Enter their email address"
          required
          autoFocus
        />

        {/* Preview card */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            We'll include your approved message:
          </label>
          <Card className="bg-slate-50">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-safetalk-green flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white">A</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-800 italic">
                  "{approvedMessage}"
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Connection code */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Connection Code
          </label>
          <div className="flex items-center space-x-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono border">
              {connectionCode}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Included automatically in the invite
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            className="flex-1"
          >
            Send invite
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          You can send the invite later from the sidebar if needed
        </p>
      </form>
    </Modal>
  )
}