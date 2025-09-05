// Redis utility for session management
import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL
    
    if (redisUrl) {
      redis = new Redis(redisUrl)
    } else {
      redis = new Redis({
        host: process.env.NEXT_PUBLIC_REDIS_HOST || 'localhost',
        port: parseInt(process.env.NEXT_PUBLIC_REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      })
    }
  }
  
  return redis
}

export interface ChatMessage {
  id: string
  type: 'ai' | 'user'
  message: string
  timestamp: number
}

export class InterviewSession {
  private redis: Redis
  private sessionId: string
  private readonly SESSION_TTL = 30 * 60 // 30 minutes in seconds

  constructor(sessionId: string) {
    this.redis = getRedisClient()
    this.sessionId = sessionId
  }

  // Store chat message with expiry
  async addMessage(message: ChatMessage): Promise<void> {
    const key = `interview:${this.sessionId}:messages`
    await this.redis.lpush(key, JSON.stringify(message))
    await this.redis.expire(key, this.SESSION_TTL)
  }

  // Get all messages for session
  async getMessages(): Promise<ChatMessage[]> {
    const key = `interview:${this.sessionId}:messages`
    const messages = await this.redis.lrange(key, 0, -1)
    return messages.map(msg => JSON.parse(msg)).reverse()
  }

  // Store session metadata
  async setSessionData(data: any): Promise<void> {
    const key = `interview:${this.sessionId}:session`
    await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(data))
  }

  // Get session metadata
  async getSessionData(): Promise<any> {
    const key = `interview:${this.sessionId}:session`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data) : null
  }

  // Check if session exists and is valid
  async isValidSession(): Promise<boolean> {
    const key = `interview:${this.sessionId}:session`
    const exists = await this.redis.exists(key)
    return exists === 1
  }

  // End session (delete all keys)
  async endSession(): Promise<void> {
    const keys = await this.redis.keys(`interview:${this.sessionId}:*`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  // Extend session TTL
  async extendSession(): Promise<void> {
    const keys = await this.redis.keys(`interview:${this.sessionId}:*`)
    for (const key of keys) {
      await this.redis.expire(key, this.SESSION_TTL)
    }
  }
}

export default InterviewSession
