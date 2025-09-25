'use client'

import { useState } from 'react'
import Card from './Card'
import Button from './Button'
import Badge from './Badge'
import { SlotState } from '@/types'

interface SlotCardProps {
  round: number
  state: SlotState
  text?: string
  onOpenDraft?: () => void
  className?: string
}

export default function SlotCard({ round, state, text, onOpenDraft, className = '' }: SlotCardProps) {
  const [showFullText, setShowFullText] = useState(false)

  const getStateIcon = () => {
    switch (state) {
      case 'active':
        return (
          <div className="w-6 h-6 rounded-full border-2 border-safetalk-green flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-safetalk-green"></div>
          </div>
        )
      case 'locked':
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getCardStyles = () => {
    const baseStyles = 'transition-all duration-200 cursor-pointer'

    switch (state) {
      case 'active':
        return `${baseStyles} border-safetalk-green ring-2 ring-safetalk-green ring-opacity-20 hover:ring-opacity-40`
      case 'locked':
        return `${baseStyles} bg-gray-50 border-gray-200 cursor-not-allowed`
      case 'completed':
        return `${baseStyles} border-gray-200 hover:border-gray-300`
      default:
        return baseStyles
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleCardClick = () => {
    if (state === 'active' && onOpenDraft) {
      onOpenDraft()
    }
  }

  return (
    <Card className={`${getCardStyles()} ${className}`} padding="lg">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {getStateIcon()}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Round {round}</h3>
            {state === 'active' && (
              <Badge variant="active">Your turn</Badge>
            )}
            {state === 'locked' && (
              <Badge variant="locked">Locked</Badge>
            )}
            {state === 'completed' && (
              <Badge variant="completed">Completed</Badge>
            )}
          </div>
        </div>
      </div>

      {state === 'active' && (
        <div onClick={handleCardClick} className="flex justify-center">
          <Button variant="primary" size="lg" className="px-12 py-4">
            Open to draft
          </Button>
        </div>
      )}

      {state === 'locked' && (
        <p className="text-slate-500 text-center py-4">
          Unlocks after your co-parent responds
        </p>
      )}

      {state === 'completed' && text && (
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <div className="text-slate-700 leading-relaxed">
            {showFullText ? text : truncateText(text, 150)}
          </div>
          {text.length > 150 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowFullText(!showFullText)
              }}
              className="text-sm font-medium text-safetalk-green hover:text-safetalk-green-hover mt-3 inline-block"
            >
              {showFullText ? 'Show less' : 'See more'}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}