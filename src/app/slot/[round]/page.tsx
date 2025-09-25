'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import InviteCoparentModal from '@/components/ui/InviteCoparentModal'

interface ChatMessage {
  id: string
  type: 'system' | 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function SlotPage() {
  const router = useRouter()
  const params = useParams()
  const round = parseInt(params.round as string)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: "What would you like to appreciate about your co-parent?",
      timestamp: new Date()
    }
  ])
  const [currentDraft, setCurrentDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAiSuggestion, setHasAiSuggestion] = useState(false)
  const [showToxicityWarning, setShowToxicityWarning] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [approvedText, setApprovedText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAskToRefine = async () => {
    if (!currentDraft.trim()) return

    // Check for potentially toxic content
    const toxicWords = ['stupid', 'idiot', 'hate', 'terrible', 'awful']
    const hasToxicContent = toxicWords.some(word =>
      currentDraft.toLowerCase().includes(word)
    )

    if (hasToxicContent) {
      setShowToxicityWarning(true)
      return
    }

    setShowToxicityWarning(false)
    setIsGenerating(true)

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentDraft,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    try {
      // Call the coach API
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draft: currentDraft.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI suggestion')
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.suggestion,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
      setHasAiSuggestion(true)
      setCurrentDraft('')
    } catch (error) {
      console.error('Failed to generate AI suggestion:', error)
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I had trouble generating a suggestion. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGreenLight = async () => {
    if (!hasAiSuggestion) return

    setIsSubmitting(true)

    try {
      // Get the latest AI message
      const latestAiMessage = messages.filter(m => m.type === 'ai').pop()

      if (!latestAiMessage) return

      // Call the approve API
      const response = await fetch('/api/qualities/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundNumber: round,
          approvedText: latestAiMessage.content
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve quality')
      }

      setApprovedText(latestAiMessage.content)

      // Check if needs invite (A's Round 1)
      if (data.needsInvite) {
        // Show invite modal instead of redirecting
        setShowInviteModal(true)
      } else {
        // For other rounds, redirect back to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to approve quality:', error)
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I had trouble saving your approval. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteModalClose = () => {
    setShowInviteModal(false)
    // After invite modal is closed, redirect to dashboard
    router.push('/dashboard')
  }

  const dismissToxicityWarning = () => {
    setShowToxicityWarning(false)
  }

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Scorecard
          </Link>
        </div>

        {/* Top strip */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-slate-700">Round {round}</span>
            <span className="text-sm text-slate-500">•</span>
            <span className="text-sm text-slate-500">Your turn</span>
          </div>
          <p className="text-sm text-slate-600">
            Draft the good quality. We&apos;ll help you phrase it so it lands well.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main chat area */}
          <div className="lg:col-span-3">
            <Card className="h-[500px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        message.type === 'system'
                          ? 'bg-gray-100 text-slate-600 text-sm'
                          : message.type === 'user'
                          ? 'bg-safetalk-green text-white'
                          : 'bg-gray-100 text-slate-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.type === 'ai' && (
                        <p className="text-xs text-slate-500 mt-2 italic">
                          If this sounds right, Green-Light it. Otherwise, tell me what to tweak.
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-slate-800 px-4 py-3 rounded-2xl">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
                        <span className="text-sm">Crafting suggestion...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Toxicity Warning */}
              {showToxicityWarning && (
                <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Let&apos;s rephrase so it&apos;s easier to receive
                        </p>
                        <p className="text-sm text-amber-700">
                          Try focusing on the positive behavior or impact.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={dismissToxicityWarning}
                      className="text-amber-500 hover:text-amber-700"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Composer */}
              <div className="border-t border-gray-200 p-4">
                <Textarea
                  value={currentDraft}
                  onChange={(e) => setCurrentDraft(e.target.value)}
                  placeholder="Write how you see their good quality..."
                  autoResize
                  className="mb-4"
                  rows={3}
                />

                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleAskToRefine}
                    disabled={!currentDraft.trim() || isGenerating}
                    loading={isGenerating}
                  >
                    Ask to refine
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleGreenLight}
                    disabled={!hasAiSuggestion || isSubmitting}
                    loading={isSubmitting}
                  >
                    Green-Light
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right meta panel */}
          <div className="lg:col-span-1">
            <Card>
              <h3 className="font-semibold text-slate-900 mb-3">Guidance</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-safetalk-green mt-2 flex-shrink-0"></div>
                  <p>We&apos;ll guide tone away from blame</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-safetalk-green mt-2 flex-shrink-0"></div>
                  <p>Focus on specific behaviors or impacts</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-safetalk-green mt-2 flex-shrink-0"></div>
                  <p>Keep it warm and genuine</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteCoparentModal
        isOpen={showInviteModal}
        onClose={handleInviteModalClose}
        approvedMessage={approvedText}
        connectionCode="ABC123"
      />
    </AppShell>
    </ProtectedRoute>
  )
}