'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Camera, CameraOff, Mic, MicOff, Monitor, MonitorOff, 
  Settings, Send, Bot, User, AlertTriangle, Volume2, 
  VolumeX, MoreVertical
} from 'lucide-react'

interface InterviewInterfaceProps {
  sessionId: string
  onSessionEnd: (reason: 'completed' | 'violation' | 'timeout') => void
}

interface ChatMessage {
  id: string
  type: 'ai' | 'user'
  message: string
  timestamp: number
}

export default function InterviewInterface({ sessionId, onSessionEnd }: InterviewInterfaceProps) {
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [warningsLeft, setWarningsLeft] = useState(1)
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30 * 60) // 30 minutes
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  
  // Initialize video stream
  useEffect(() => {
    initializeMediaStream()
    startTabSwitchMonitoring()
    startTimer()
    
    return () => {
      cleanup()
    }
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      mediaStreamRef.current = stream
    } catch (error) {
      console.error('Failed to initialize media stream:', error)
      handleViolation('Media access denied')
    }
  }

  const startTabSwitchMonitoring = () => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Tab switching detected')
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave the interview?'
      return 'Are you sure you want to leave the interview?'
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval)
          onSessionEnd('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }

  const handleViolation = (reason: string) => {
    if (warningsLeft > 0) {
      setWarningsLeft(prev => prev - 1)
      setShowWarning(true)
      
      // Add warning message to chat
      const warningMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        message: `⚠️ WARNING: ${reason}. You have ${warningsLeft - 1} warning(s) left. Next violation will end the interview.`,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, warningMessage])
      
      setTimeout(() => setShowWarning(false), 5000)
    } else {
      onSessionEnd('violation')
    }
  }

  const toggleCamera = () => {
    if (!cameraEnabled && mediaStreamRef.current) {
      // Re-enable camera
      navigator.mediaDevices.getUserMedia({ video: true, audio: micEnabled })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
          mediaStreamRef.current = stream
          setCameraEnabled(true)
        })
        .catch(() => handleViolation('Camera access denied'))
    } else if (mediaStreamRef.current) {
      // Disable camera
      mediaStreamRef.current.getVideoTracks().forEach(track => track.stop())
      setCameraEnabled(false)
      handleViolation('Camera disabled')
    }
  }

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled
      })
      setMicEnabled(!micEnabled)
      
      if (micEnabled) {
        handleViolation('Microphone disabled')
      }
    }
  }

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        setScreenSharing(true)
        
        // Stop screen sharing when stream ends
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setScreenSharing(false)
        })
      } catch (error) {
        console.error('Screen share failed:', error)
      }
    } else {
      setScreenSharing(false)
    }
  }

  const sendMessage = () => {
    if (currentMessage.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        message: currentMessage.trim(),
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, userMessage])
      setCurrentMessage('')
      
      // Simulate AI response (in real implementation, this would call your AI API)
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          message: "Thank you for your response. Let me ask you another question based on your background...",
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, aiResponse])
      }, 2000)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              Warning! {warningsLeft} warning(s) remaining before session termination.
            </span>
          </div>
        </div>
      )}

      {/* Main Interview Area (75% width) */}
      <div className="flex-1 flex flex-col p-6 space-y-6">
        {/* Timer */}
        <div className="flex justify-center">
          <div className="bg-white rounded-full px-6 py-2 shadow-lg">
            <div className="flex items-center space-x-2 text-gray-800">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-2 gap-6">
          {/* AI Participant */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <Bot className="w-16 h-16 text-white" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2">
                  <h3 className="font-semibold text-gray-800">PrepStart AI</h3>
                </div>
              </div>
            </div>
            {/* AI Status Indicator */}
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Active</span>
            </div>
          </div>

          {/* User Participant */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative">
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <CameraOff className="w-16 h-16 mx-auto mb-2" />
                  <p>Camera Off</p>
                </div>
              </div>
            )}
            {/* User Name Badge */}
            <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
              You
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center space-x-4">
            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                cameraEnabled 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>

            {/* Microphone Toggle */}
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                micEnabled 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Screen Share Toggle */}
            <button
              onClick={toggleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                screenSharing 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {screenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                audioEnabled 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Settings */}
            <button className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all">
              <Settings className="w-5 h-5" />
            </button>

            {/* More Options */}
            <button className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar (25% width) */}
      <div className="w-1/4 bg-white flex flex-col shadow-2xl">
        {/* Chat Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Interview Chat</h2>
          <p className="text-sm text-gray-600 mt-1">Real-time conversation</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md'
                  : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md'
              } px-4 py-3`}>
                <div className="flex items-start space-x-2">
                  {message.type === 'ai' && (
                    <Bot className="w-4 h-4 mt-1 text-blue-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <User className="w-4 h-4 mt-1 text-blue-200" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your response..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
