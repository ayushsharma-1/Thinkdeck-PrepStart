import { NextRequest, NextResponse } from 'next/server'
import { InterviewSession } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, candidateData, jobData, resumeText } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = new InterviewSession(sessionId)
    
    const sessionData = {
      candidateData,
      jobData,
      resumeText,
      createdAt: Date.now(),
      status: 'active',
      warningsLeft: 1
    }

    await session.setSessionData(sessionData)
    
    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    const session = new InterviewSession(sessionId)
    const sessionData = await session.getSessionData()
    const isValid = await session.isValidSession()
    
    return NextResponse.json({ 
      sessionData, 
      isValid,
      sessionId 
    })
  } catch (error) {
    console.error('Failed to get session:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    const session = new InterviewSession(sessionId)
    await session.endSession()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to end session:', error)
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}
