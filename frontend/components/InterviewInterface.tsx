'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Camera, CameraOff, Mic, MicOff, Monitor, MonitorOff, 
  Settings, Send, Bot, User, AlertTriangle, Volume2, 
  VolumeX, MoreVertical, Play, Pause, SkipForward
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
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [warningsLeft, setWarningsLeft] = useState(1)
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30 * 60) // 30 minutes
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Initialize interview
  useEffect(() => {
    let mounted = true
    
    const initialize = async () => {
      if (!mounted) return
      
      await initializeMediaStream()
      const cleanup1 = startTabSwitchMonitoring()
      const cleanup2 = startTimer()
      
      // Only load first question once
      if (mounted && messages.length === 0) {
        await loadFirstQuestion()
      }
      
      return () => {
        cleanup1?.()
        cleanup2?.()
      }
    }
    
    initialize()
    
    return () => {
      mounted = false
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, []) // Empty dependency array

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (type: 'ai' | 'user', message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
    
    // Save to Redis
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        ...newMessage
      })
    }).catch(console.error)
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window && audioEnabled && text.trim()) {
      setIsSpeaking(true)
      
      // Cancel any existing speech
      speechSynthesis.cancel()
      
      // Wait a bit for the cancel to take effect
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 0.8
        
        utterance.onstart = () => {
          console.log('Speech started:', text.substring(0, 50) + '...')
        }
        
        utterance.onend = () => {
          setIsSpeaking(false)
          console.log('Speech ended')
        }
        
        utterance.onerror = (event) => {
          setIsSpeaking(false)
          console.error('Speech error:', event.error)
        }
        
        speechSynthesis.speak(utterance)
      }, 100)
    } else {
      console.log('Speech synthesis not available or disabled')
    }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const loadFirstQuestion = async () => {
    try {
      setIsProcessing(true)
      
      // Add initial AI greeting
      addMessage('ai', "Hello! I'm PrepStart AI, your interview assistant. Let me get your first question ready...")
      
      // Get session data from Redis
      const sessionResponse = await fetch(`/api/session?sessionId=${sessionId}`)
      const sessionData = await sessionResponse.json()
      
      if (sessionData.sessionData?.currentQuestion) {
        const question = sessionData.sessionData.currentQuestion
        setCurrentQuestion(question)
        setQuestionNumber(sessionData.sessionData.questionNumber || 1)
        
        // Add question to chat
        addMessage('ai', question)
        
        // Speak the question after a short delay
        setTimeout(() => {
          speakText(question)
        }, 1000)
      } else {
        // If no question in session, generate first one
        addMessage('ai', "Let me generate your first question based on your background...")
        setTimeout(() => {
          generateFirstQuestion()
        }, 1000)
      }
    } catch (error) {
      console.error('Error loading first question:', error)
      addMessage('ai', "I'm having trouble loading your question. Let me try to generate one for you...")
      setTimeout(() => {
        generateFirstQuestion()
      }, 2000)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateNextQuestion = async () => {
    try {
      setIsProcessing(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionNumber: questionNumber + 1,
          previousResponses: messages.filter(m => m.type === 'user').map(m => m.message)
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.question) {
        setCurrentQuestion(data.question)
        setQuestionNumber(prev => prev + 1)
        
        // Save to Redis
        await fetch('/api/session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            currentQuestion: data.question,
            questionNumber: questionNumber + 1
          })
        })
        
        // Add to chat and speak
        addMessage('ai', data.question)
        
        setTimeout(() => {
          speakText(data.question)
        }, 500)
      } else {
        // Use fallback questions
        const fallbackQuestions = [
          "What motivates you in your work?",
          "Describe a challenge you've overcome recently.",
          "Where do you see yourself in the next few years?",
          "What skills would you like to develop further?",
          "Thank you for your responses. Is there anything else you'd like to share?"
        ]
        
        const fallbackQuestion = fallbackQuestions[Math.min(questionNumber, fallbackQuestions.length - 1)]
        setCurrentQuestion(fallbackQuestion)
        setQuestionNumber(prev => prev + 1)
        
        addMessage('ai', fallbackQuestion)
        addMessage('ai', "(Using fallback question due to technical issues)")
        
        setTimeout(() => {
          speakText(fallbackQuestion)
        }, 500)
      }
    } catch (error) {
      console.error('Error generating next question:', error)
      
      // End interview if we can't generate questions
      addMessage('ai', "I'm having technical difficulties generating questions. Let's conclude the interview here.")
      setTimeout(() => onSessionEnd('completed'), 2000)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateFirstQuestion = async () => {
    try {
      setIsProcessing(true)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionNumber: 1,
          previousResponses: []
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.question) {
        setCurrentQuestion(data.question)
        setQuestionNumber(1)
        
        // Save to Redis
        await fetch('/api/session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            currentQuestion: data.question,
            questionNumber: 1
          })
        })
        
        // Add to chat and speak
        addMessage('ai', data.question)
        
        // Speak after a short delay
        setTimeout(() => {
          speakText(data.question)
        }, 500)
      } else {
        throw new Error(data.error || 'Failed to generate question')
      }
    } catch (error) {
      console.error('Error generating first question:', error)
      
      // Use fallback question
      const fallbackQuestion = "Can you tell me about yourself and what interests you about this role?"
      setCurrentQuestion(fallbackQuestion)
      setQuestionNumber(1)
      
      addMessage('ai', fallbackQuestion)
      addMessage('ai', "(Using fallback question due to technical issues)")
      
      // Speak the fallback question
      setTimeout(() => {
        speakText(fallbackQuestion)
      }, 500)
      
      // Still try to save to Redis
      try {
        await fetch('/api/session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            currentQuestion: fallbackQuestion,
            questionNumber: 1,
            fallback: true
          })
        })
      } catch (saveError) {
        console.error('Failed to save fallback question:', saveError)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const initializeMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: cameraEnabled, 
        audio: micEnabled 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      mediaStreamRef.current = stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      addMessage('ai', "I couldn't access your camera or microphone. Please check your permissions.")
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

  const startTabSwitchMonitoring = () => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation()
      }
    }

    const handleViolation = () => {
      if (warningsLeft > 0) {
        setWarningsLeft(prev => prev - 1)
        setShowWarning(true)
        addMessage('ai', `⚠️ Warning: Tab switching detected. This is your only warning - next violation will end the interview.`)
        setTimeout(() => setShowWarning(false), 5000)
      } else {
        addMessage('ai', "❌ Interview terminated due to violation of rules.")
        setTimeout(() => onSessionEnd('violation'), 2000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      // Start recording with automatic stop after silence
      mediaRecorderRef.current.start(1000) // Record in 1-second chunks
      setIsRecording(true)
      
      // Automatically stop recording after 10 seconds of silence detection
      let silenceTimeout: NodeJS.Timeout
      
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)
      
      analyser.fftSize = 256
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const checkAudioLevel = () => {
        if (!isRecording) return
        
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        
        if (average > 5) { // Audio detected
          clearTimeout(silenceTimeout)
        } else { // Silence detected
          silenceTimeout = setTimeout(() => {
            stopRecording()
          }, 2000) // Auto-stop after 2 seconds of silence
        }
        
        if (isRecording) {
          requestAnimationFrame(checkAudioLevel)
        }
      }
      
      checkAudioLevel()
      
    } catch (error) {
      console.error('Recording error:', error)
      addMessage('ai', "I couldn't access your microphone. Please check permissions and try again.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log('Recording stopped manually')
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    console.log('Processing audio blob:', audioBlob.size, 'bytes')
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.wav')
      formData.append('sessionId', sessionId)

      console.log('Sending audio to transcription service...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/transcribe-audio`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('Transcription result:', result)
      
      if (result.text && result.text.trim()) {
        // Add user message to chat immediately
        addMessage('user', result.text)
        
        // Set the response and auto-submit
        setCurrentResponse(result.text)
        
        // Auto-submit the transcribed response
        setTimeout(async () => {
          if (result.text.trim()) {
            console.log('Auto-submitting transcribed response:', result.text)
            
            try {
              // Process the response through the Node.js backend
              const submitResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: result.text.trim(),
                  sessionId: sessionId,
                  context: {
                    currentQuestion,
                    questionNumber,
                    action: 'submit_response'
                  }
                })
              })

              if (!submitResponse.ok) {
                throw new Error(`Chat API failed: ${submitResponse.status}`)
              }

              const submitData = await submitResponse.json()
              console.log('Auto-submit response:', submitData)

              if (submitData.is_complete || submitData.completed) {
                addMessage('ai', "Thank you for completing the interview! Let me prepare your results.")
                setTimeout(() => onSessionEnd('completed'), 3000)
              } else if (submitData.next_question || submitData.question) {
                const nextQuestion = submitData.next_question || submitData.question
                
                setCurrentQuestion(nextQuestion)
                setQuestionNumber(prev => prev + 1)
                setCurrentResponse('')
                
                // Save to Redis
                await fetch('/api/session', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId,
                    currentQuestion: nextQuestion,
                    questionNumber: questionNumber + 1,
                    lastResponse: result.text
                  })
                })
                
                // Add next question to chat and speak
                setTimeout(() => {
                  addMessage('ai', nextQuestion)
                  speakText(nextQuestion)
                }, 1500)
              } else {
                // Generate next question if none provided
                setTimeout(() => {
                  generateNextQuestion()
                }, 1000)
              }
            } catch (submitError) {
              console.error('Auto-submit error:', submitError)
              addMessage('ai', "I processed your response but had trouble generating the next question. Let me try again...")
              setTimeout(() => {
                generateNextQuestion()
              }, 2000)
            }
          }
        }, 1000)
      } else {
        addMessage('ai', "I couldn't understand your audio. Please try speaking again.")
      }
    } catch (error) {
      console.error('Speech processing error:', error)
      addMessage('ai', "There was an error processing your speech. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const submitResponse = async () => {
    if (!currentResponse.trim()) {
      addMessage('ai', "I didn't receive your response. Please provide an answer before continuing.")
      return
    }

    setIsProcessing(true)

    try {
      console.log('Submitting response:', currentResponse)
      
      // Process the response through the Node.js backend (which connects to FastAPI)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentResponse.trim(),
          sessionId: sessionId,
          context: {
            currentQuestion,
            questionNumber,
            action: 'submit_response'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('Submit response:', data)

      // Add user response to chat
      addMessage('user', currentResponse)

      if (data.is_complete || data.completed) {
        addMessage('ai', "Thank you for completing the interview! Let me prepare your results.")
        setTimeout(() => onSessionEnd('completed'), 3000)
      } else if (data.next_question || data.question) {
        const nextQuestion = data.next_question || data.question
        
        setCurrentQuestion(nextQuestion)
        setQuestionNumber(prev => prev + 1)
        setCurrentResponse('')
        
        // Save to Redis
        await fetch('/api/session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            currentQuestion: nextQuestion,
            questionNumber: questionNumber + 1,
            lastResponse: currentResponse
          })
        })
        
        // Add to chat and speak after a delay
        setTimeout(() => {
          addMessage('ai', nextQuestion)
          speakText(nextQuestion)
        }, 1000)
      } else {
        // If no next question, try to generate one
        setTimeout(() => {
          generateNextQuestion()
        }, 1000)
      }
    } catch (error) {
      console.error('Submit error:', error)
      addMessage('ai', "There was an error submitting your response. Please try again.")
      
      // Fallback: still add user message and try to continue
      addMessage('user', currentResponse)
      setTimeout(() => {
        generateNextQuestion()
      }, 2000)
    } finally {
      setIsProcessing(false)
    }
  }

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    stopSpeaking()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-red-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-red-600 text-white p-6 rounded-2xl shadow-xl max-w-md text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Rule Violation Detected!</h3>
            <p className="mb-4">Tab switching is not allowed during the interview.</p>
            <p className="text-sm opacity-90">Warnings remaining: {warningsLeft}</p>
          </div>
        </div>
      )}

      {/* Main Content - 75% */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-blue-600" />
              <span className="font-semibold">PrepStart AI Interview</span>
            </div>
            <div className="text-sm text-gray-600">
              Question {questionNumber} • {formatTime(timeRemaining)} remaining
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded-full ${audioEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2 rounded-full bg-orange-100 text-orange-600"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* AI Interviewer */}
            <div className="bg-gray-900 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-80" />
                  <p className="text-lg font-medium">PrepStart AI</p>
                  <p className="text-sm opacity-70">Your AI Interviewer</p>
                  {isSpeaking && (
                    <div className="mt-4">
                      <div className="flex justify-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <p className="text-xs mt-2 opacity-60">Speaking...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Video */}
            <div className="bg-gray-900 rounded-2xl relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 flex space-x-2">
                <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">You</span>
              </div>
            </div>
          </div>

          {/* Current Question Display */}
          {currentQuestion && (
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <Bot className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">Current Question:</h3>
                  <p className="text-gray-700 leading-relaxed">{currentQuestion}</p>
                  <div className="mt-4 flex items-center space-x-4">
                    <button
                      onClick={() => speakText(currentQuestion)}
                      disabled={isSpeaking}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Repeat Question</span>
                    </button>
                    {isSpeaking && (
                      <button
                        onClick={stopSpeaking}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Stop</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Bar */}
        <div className="bg-white border-t p-4">
          <div className="flex justify-center items-center space-x-6">
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`p-3 rounded-full ${cameraEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
            >
              {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>
            
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={() => {
                  if (isRecording) {
                    stopRecording()
                  } else if (micEnabled) {
                    startRecording()
                  } else {
                    setMicEnabled(true)
                  }
                }}
                className={`p-3 rounded-full ${
                  isRecording 
                    ? 'bg-red-100 text-red-600 animate-pulse' 
                    : micEnabled 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                }`}
                title={
                  isRecording 
                    ? 'Stop recording' 
                    : micEnabled 
                      ? 'Start recording your response' 
                      : 'Enable microphone'
                }
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              
              {/* Status text */}
              <span className="text-xs text-gray-500 text-center">
                {isRecording 
                  ? 'Recording...' 
                  : isProcessing 
                    ? 'Processing...'
                    : micEnabled 
                      ? 'Tap to record' 
                      : 'Disabled'
                }
              </span>
            </div>
            <button
              onClick={() => setScreenSharing(!screenSharing)}
              className={`p-3 rounded-full ${screenSharing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              {screenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
            </button>
            <button className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar - 25% */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Interview Chat</h3>
          <p className="text-sm text-gray-600">Follow along with the conversation</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  {message.type === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  <span className="text-xs opacity-70">
                    {message.type === 'ai' ? 'AI' : 'You'}
                  </span>
                </div>
                <p className="text-sm">{message.message}</p>
              </div>
            </div>
          ))}
          
          {/* Processing indicator */}
          {(isProcessing || isRecording) && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-100 text-gray-900">
                <div className="flex items-center space-x-2 mb-1">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs opacity-70">AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm">
                    {isRecording ? 'Listening...' : 'Processing your response...'}
                  </span>
                </div>
              </div>
            </div>
          )}
                  
                  <div ref={chatEndRef} />
        </div>
        
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && currentMessage.trim()) {
                  addMessage('user', currentMessage)
                  setCurrentMessage('')
                }
              }}
            />
            <button
              onClick={() => {
                if (currentMessage.trim()) {
                  addMessage('user', currentMessage)
                  setCurrentMessage('')
                }
              }}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
