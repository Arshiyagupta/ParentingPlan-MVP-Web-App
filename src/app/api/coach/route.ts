import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { sanitizeText, validateTextLength } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const CoachRequestSchema = z.object({
  draft: z.string().min(1).max(500)
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    await getUser(request)

    // Parse and validate request body
    const body = await request.json()
    const { draft } = CoachRequestSchema.parse(body)

    // Sanitize input
    const cleanDraft = sanitizeText(draft)

    if (!validateTextLength(cleanDraft, 500)) {
      return NextResponse.json(
        { error: 'Draft text is too long (max 500 characters)' },
        { status: 400 }
      )
    }

    // Call OpenAI for text refinement
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a co-parenting communication coach. Rewrite the following appreciation message to be warm, specific, and non-triggering. Keep it to 1-2 sentences. Focus on positive qualities and avoid any blame, conditions, or negative language. Make it sound genuine and heartfelt.'
        },
        {
          role: 'user',
          content: cleanDraft
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })

    const suggestion = completion.choices[0]?.message?.content?.trim()

    if (!suggestion) {
      throw new Error('No suggestion received from AI')
    }

    return NextResponse.json({
      suggestion: sanitizeText(suggestion)
    })

  } catch (error) {
    console.error('Coach API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get coaching suggestion' },
      { status: 500 }
    )
  }
}