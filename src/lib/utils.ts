import { v4 as uuidv4 } from 'uuid'

export function generateConnectionCode(): string {
  // Generate a 6-8 character uppercase code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function sanitizeText(text: string): string {
  // Strip HTML tags and trim whitespace
  return text.replace(/<[^>]*>/g, '').trim()
}

export function validateTextLength(text: string, maxLength: number = 500): boolean {
  return text.length <= maxLength
}