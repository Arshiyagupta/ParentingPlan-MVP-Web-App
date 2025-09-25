'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'

interface CompletedQuality {
  round: number
  author: 'A' | 'B'
  text: string
  authorName?: string
}

export default function CompletionPage() {
  const [qualities, setQualities] = useState<CompletedQuality[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [conflictText, setConflictText] = useState('')
  const [showConflictInput, setShowConflictInput] = useState(false)

  useEffect(() => {
    const fetchCompletionData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/completion')

        if (!response.ok) {
          throw new Error('Failed to fetch completion data')
        }

        const data = await response.json()

        // Transform the data to match our component structure
        const transformedQualities: CompletedQuality[] = data.statements.map((statement: any) => ({
          round: statement.round,
          author: statement.author,
          text: statement.text,
          authorName: statement.authorEmail
        }))

        setQualities(transformedQualities)
      } catch (error) {
        console.error('Error fetching completion data:', error)
        setQualities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompletionData()
  }, [])

  const handleConflictSubmit = () => {
    if (conflictText.trim()) {
      // TODO: Save conflict text to database
      console.log('Conflict text saved:', conflictText)
      setConflictText('')
      setShowConflictInput(false)
      // TODO: Show success message
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-safetalk-green border-t-transparent"></div>
        </div>
      </AppShell>
    )
  }

  return (
    <ProtectedRoute>
      <AppShell>
      <div className="container py-8">
        {/* Header with celebration */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-success rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
            10 Good Qualities Completed
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Congratulations! You&apos;ve both shared positive qualities about each other. This is a meaningful step toward building stronger co-parenting communication.
          </p>
        </div>

        {/* Qualities Grid/List */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid gap-6 md:grid-cols-2">
            {qualities.map((quality, index) => (
              <Card key={index} className="relative">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-safetalk-green flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-white">
                      {quality.author}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {quality.authorName || `Parent ${quality.author}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        Round {quality.round}
                      </span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">
                      &quot;{quality.text}&quot;
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Optional Conflict Section */}
        <div className="max-w-2xl mx-auto mb-8">
          {!showConflictInput ? (
            <Card className="text-center bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-3">
                Ready for the next step?
              </h3>
              <p className="text-slate-600 mb-6">
                Now that you&apos;ve shared positive qualities, you might want to identify one area to work on together.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowConflictInput(true)}
              >
                Name one conflict to work on later
              </Button>
              <p className="text-xs text-slate-500 mt-3">
                Optional - this is just for your reference
              </p>
            </Card>
          ) : (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">
                What&apos;s one area you&apos;d both like to work on?
              </h3>
              <Textarea
                value={conflictText}
                onChange={(e) => setConflictText(e.target.value)}
                placeholder="For example: 'Better communication about schedule changes' or 'Consistency with bedtime routines'"
                rows={3}
                className="mb-4"
              />
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowConflictInput(false)
                    setConflictText('')
                  }}
                >
                  Skip for now
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConflictSubmit}
                  disabled={!conflictText.trim()}
                >
                  Save for later
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="text-center">
          <Link href="/dashboard">
            <Button variant="primary" size="lg">
              Back to scorecard
            </Button>
          </Link>
        </div>

        {/* Footer message */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-slate-600">
            Thank you for taking this step toward better co-parenting communication.
          </p>
        </div>
      </div>
    </AppShell>
    </ProtectedRoute>
  )
}