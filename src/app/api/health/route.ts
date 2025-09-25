import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'SafeTalk Backend',
    version: '1.0.0'
  })
}