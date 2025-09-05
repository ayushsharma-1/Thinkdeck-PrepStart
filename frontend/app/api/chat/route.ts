import { NextRequest, NextResponse } from 'next/server'
import { InterviewSession, ChatMessage } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  try {
    const session = new InterviewSession(sessionId)
    const messages = await session.getMessages()
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Failed to get messages:', error)
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, type } = await request.json()

    if (!sessionId || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const session = new InterviewSession(sessionId)
    
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    }

    await session.addMessage(chatMessage)
    await session.extendSession() // Extend session on activity
    
    return NextResponse.json({ success: true, message: chatMessage })
  } catch (error) {
    console.error('Failed to add message:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}
