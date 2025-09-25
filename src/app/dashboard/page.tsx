'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Banner from '@/components/ui/Banner'
import ProgressBar from '@/components/ui/ProgressBar'
import SlotCard from '@/components/ui/SlotCard'
import InviteCoparentModal from '@/components/ui/InviteCoparentModal'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { ScoreboardData, SlotState } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scoreboardData, setScoreboardData] = useState<ScoreboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const previousTurnDataRef = useRef<{turn: string, round: number} | null>(null)
  const scoreboardDataRef = useRef<ScoreboardData | null>(null)
  const { showSuccess } = useToast()
  const { user, loading: authLoading } = useAuth()

  // Handle invite acceptance from URL params (fallback)
  useEffect(() => {
    const inviteToken = searchParams.get('invite')
    if (inviteToken) {
      const acceptInvite = async () => {
        try {
          const response = await fetch('/api/connect/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ token: inviteToken })
          })

          if (response.ok) {
            console.log('Successfully accepted invite from dashboard')
            showSuccess('Successfully connected to your co-parent!')
            // Remove invite param from URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('invite')
            router.replace(newUrl.pathname)
          }
        } catch (error) {
          console.error('Error accepting invite from dashboard:', error)
        }
      }

      acceptInvite()
    }
  }, [searchParams, router, showSuccess])

  // Fetch scorecard data from API
  useEffect(() => {
    // Don't fetch if auth is still loading or user is not authenticated
    if (authLoading || !user) {
      return
    }

    const fetchScorecard = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/scorecard', {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch scorecard: ${response.status}`)
        }

        const data = await response.json()

        // Check if it's now the user's turn (for notification)
        if (scoreboardData && data.pair.current_turn === data.you.role) {
          const wasMyTurnBefore = previousTurnDataRef.current?.turn === data.you.role && previousTurnDataRef.current?.round === data.pair.current_round
          if (!wasMyTurnBefore) {
            showSuccess(`Round ${data.pair.current_round} is now available! It's your turn.`)
          }
        }

        // Update turn tracking
        previousTurnDataRef.current = {
          turn: data.pair.current_turn,
          round: data.pair.current_round
        }

        setScoreboardData(data)
      } catch (error) {
        console.error('Error fetching scorecard:', error)
        setScoreboardData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchScorecard()

    // Set up polling to check for updates every 5 seconds
    const pollInterval = setInterval(() => {
      if (!authLoading && user) {
        // Silent fetch without loading state for polling
        fetch('/api/scorecard', { credentials: 'include' })
          .then(response => {
            if (response.ok) {
              return response.json()
            }
            throw new Error('Polling failed')
          })
          .then(data => {
            // Check if it's now the user's turn (for notification) using current state
            const currentScoreboardData = scoreboardDataRef.current
            if (currentScoreboardData && data.pair.current_turn === data.you.role) {
              const wasMyTurnBefore = previousTurnDataRef.current?.turn === data.you.role && previousTurnDataRef.current?.round === data.pair.current_round
              if (!wasMyTurnBefore) {
                showSuccess(`Round ${data.pair.current_round} is now available! It's your turn.`)
              }
            }

            // Update turn tracking
            previousTurnDataRef.current = {
              turn: data.pair.current_turn,
              round: data.pair.current_round
            }

            setScoreboardData(data)
            scoreboardDataRef.current = data
          })
          .catch(error => console.error('Polling error:', error))
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [user, authLoading, showSuccess])

  const handleOpenSlot = (round: number) => {
    router.push(`/slot/${round}`)
  }

  const handleInviteCoparent = () => {
    setShowInviteModal(true)
  }

  const handleInviteModalClose = () => {
    setShowInviteModal(false)
  }

  const handleCopyConnectionCode = () => {
    const connectionCode = scoreboardData?.connectionCode || 'Loading...'
    navigator.clipboard.writeText(connectionCode)
    showSuccess('Connection code copied!')
  }

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-safetalk-green border-t-transparent"></div>
        </div>
      </AppShell>
    )
  }

  if (!scoreboardData) {
    return (
      <AppShell>
        <div className="container py-8">
          <div className="text-center">
            <p className="text-slate-600">Failed to load scorecard. Please try again.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const yourSlots = scoreboardData.slots.map(slot => ({
    ...slot,
    yourState: slot[scoreboardData.you.role],
    partnerState: slot[scoreboardData.you.role === 'A' ? 'B' : 'A']
  }))

  const getBannerMessage = () => {
    if (scoreboardData.pair.current_turn === scoreboardData.you.role) {
      return { type: 'success' as const, message: "It's your turn! Click the active slot to draft your good quality." }
    } else {
      return { type: 'info' as const, message: 'Waiting for your co-parent to respond' }
    }
  }

  const banner = getBannerMessage()

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="container py-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Your scorecard
          </h1>
          <ProgressBar current={scoreboardData.progress} max={10} />
        </div>

        {/* Banner */}
        <Banner variant={banner.type} className="mb-6">
          {banner.message}
        </Banner>

        {/* Top Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Connection Status */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Connection Status</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-safetalk-green"></div>
                <span className="text-sm text-slate-700">You (Parent {scoreboardData.you.role})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${scoreboardData.coParent?.connected ? 'bg-safetalk-green' : 'bg-gray-300'}`}></div>
                <span className={`text-sm ${scoreboardData.coParent?.connected ? 'text-slate-700' : 'text-slate-500'}`}>
                  {scoreboardData.coParent?.connected
                    ? `Co-parent (Parent ${scoreboardData.coParent.role})`
                    : 'Co-parent (Not connected)'
                  }
                </span>
              </div>
            </div>
          </Card>

          {/* Connection Code */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Connection Code</h3>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono">
                {scoreboardData?.connectionCode || 'Loading...'}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyConnectionCode}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Share this code with your co-parent
            </p>
          </Card>

          {/* Connection/Invite Section */}
          <Card>
            {scoreboardData.coParent?.connected ? (
              <>
                <h3 className="font-semibold text-slate-900 mb-3">Connected!</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Co-parent: {scoreboardData.coParent.email}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Role: Parent {scoreboardData.coParent.role}
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-safetalk-green"></div>
                  <span className="text-sm text-safetalk-green font-medium">Active Connection</span>
                </div>
              </>
            ) : scoreboardData.progress === 0 && !scoreboardData.invite ? (
              <>
                <h3 className="font-semibold text-slate-900 mb-3">Invite Co-parent</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Complete your first good quality to send an invitation.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInviteCoparent}
                  className="w-full"
                  disabled
                >
                  Complete Round 1 First
                </Button>
              </>
            ) : scoreboardData.invite ? (
              <>
                <h3 className="font-semibold text-slate-900 mb-3">Invitation Sent</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Sent to: {scoreboardData.invite.sentTo}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Status: {scoreboardData.invite.status}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Resend
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 mb-3">Ready to Invite</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Great! You completed Round 1. Now invite your co-parent.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleInviteCoparent}
                  className="w-full"
                >
                  Invite Co-parent
                </Button>
              </>
            )}
          </Card>
        </div>

        {/* Microcopy */}
        <p className="text-slate-600 mb-8 text-center">
          We'll go one at a time. Each message is polished with AI before it's shared.
        </p>

        {/* Main content - Full width slot cards */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {yourSlots.map((slot) => (
              <SlotCard
                key={slot.round}
                round={slot.round}
                state={slot.yourState.state}
                text={slot.yourState.text}
                onOpenDraft={() => handleOpenSlot(slot.round)}
                className="w-full"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteCoparentModal
        isOpen={showInviteModal}
        onClose={handleInviteModalClose}
        approvedMessage={scoreboardData?.slots?.find(s => s.round === 1)?.[scoreboardData.you.role]?.text || ""}
        connectionCode={scoreboardData?.connectionCode || ""}
      />
    </AppShell>
    </ProtectedRoute>
  )
}