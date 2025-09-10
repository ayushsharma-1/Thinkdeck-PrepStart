'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone,
  MessageSquare,
  Send,
  Clock,
  AlertCircle,
  User,
  Bot,
  Volume2,
  VolumeX,
  Settings,
  MoreVertical,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import io from 'socket.io-client';

const InterviewPage = ({ sessionData, onEndInterview }) => {
  // UI State
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Interview State
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationStep, setInitializationStep] = useState('');
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  
  // Violation Tracking
  const [violations, setViolations] = useState({ tabSwitch: 0, permissionDenied: 0 });
  const [hasWarned, setHasWarned] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for media handling
  const userVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const speechSynthRef = useRef(null);
  
  // Constants
  const SILENCE_THRESHOLD = 5000; // 5 seconds
  const AUDIO_THRESHOLD = 0.01; // Audio level threshold for silence detection
  const MAX_RECORDING_TIME = 120000; // 2 minutes max recording
  const API_BASE_URL = 'http://localhost:5000';
  const FASTAPI_BASE_URL = 'http://localhost:8000';

  // Initialize socket connection and interview session
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      initializeSocket();
      initializeInterview();
      setupViolationDetection();
    }
    
    return () => {
      cleanupInterview();
    };
  }, [isInitialized]);

  // Timer management
  useEffect(() => {
    let timer;
    if (isInterviewActive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleInterviewTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isInterviewActive, timeRemaining]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Audio level monitoring for silence detection - DISABLED for manual recording
  /*
  useEffect(() => {
    if (isRecording && audioLevel < AUDIO_THRESHOLD) {
      if (!silenceTimeoutRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          if (isRecording) {
            handleSilenceDetected();
          }
        }, SILENCE_THRESHOLD);
      }
    } else {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
    
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [isRecording, audioLevel]);
  */

  const initializeSocket = () => {
    try {
      socketRef.current = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });
      
      socketRef.current.on('connect', () => {
        setConnectionStatus('connected');
        toast.success('Connected to interview server');
      });
      
      socketRef.current.on('disconnect', () => {
        setConnectionStatus('disconnected');
        toast.error('Connection lost. Attempting to reconnect...');
      });
      
      socketRef.current.on('newQuestion', (data) => {
        handleNewQuestion(data.question, data.questionNumber);
      });
      
      socketRef.current.on('interviewEnded', () => {
        handleInterviewEnd();
      });
      
      socketRef.current.on('connect_error', (error) => {
        setConnectionStatus('error');
        toast.error('Connection error. Please check your internet connection.');
      });
    } catch (error) {
      console.error('Socket initialization failed:', error);
      setConnectionStatus('error');
    }
  };

  const initializeInterview = async () => {
    if (isInitialized) {
      console.log('Interview already initialized, skipping...');
      return;
    }
    
    try {
      setInitializationStep('Setting up camera and microphone...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give user time to read
      
      // Initialize video stream
      await initializeUserVideo();
      
      setInitializationStep('Configuring audio settings...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Initialize audio context for always-on microphone
      await initializeAudioContext();
      
      setInitializationStep('Connecting to interview service...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load first question from backend
      await loadFirstQuestion();
      
      setInitializationStep('Ready to start!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsInitializing(false);
      setIsInterviewActive(true);
    } catch (error) {
      console.error('Interview initialization failed:', error);
      setIsInitializing(false);
      toast.error('Failed to initialize interview. Please refresh and try again.');
    }
  };

  const initializeUserVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        
        // Wait for the video to be ready
        await new Promise((resolve) => {
          userVideoRef.current.onloadedmetadata = resolve;
        });
      }
      
      // Store audio stream for recording
      audioStreamRef.current = stream;
      
      // Verify audio tracks are active
      const audioTracks = stream.getAudioTracks();
      console.log('Audio tracks initialized:', audioTracks.length, audioTracks.map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })));
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      handleViolation('permissionDenied');
      toast.error('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const initializeAudioContext = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      if (audioStreamRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(audioStreamRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        source.connect(analyserRef.current);
        
        // Start monitoring audio levels
        monitorAudioLevels();
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
      toast.error('Audio processing initialization failed');
    }
  };

  const monitorAudioLevels = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += (dataArray[i] / 255) ** 2;
      }
      const rms = Math.sqrt(sum / bufferLength);
      
      setAudioLevel(rms);
      
      if (isInterviewActive) {
        requestAnimationFrame(checkAudioLevel);
      }
    };
    
    checkAudioLevel();
  };

  const loadFirstQuestion = async () => {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/api/get-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userData: sessionData,
          action: 'start'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setCurrentQuestion(data.firstQuestion);
        setQuestionNumber(1);
        
        // Add question to chat and speak it
        addAIMessage(data.firstQuestion, false);
        speakQuestion(data.firstQuestion);
      } else {
        throw new Error(data.message || 'Failed to load first question');
      }
    } catch (error) {
      console.error('Error loading first question:', error);
      toast.error('Failed to load interview questions. Please try again.');
      
      // Fallback question
      const fallbackQuestion = "Hello! I'm excited to interview you today. Let's start with a simple question: Can you tell me about yourself and why you're interested in this position?";
      setCurrentQuestion(fallbackQuestion);
      setQuestionNumber(1);
      addAIMessage(fallbackQuestion, false);
      speakQuestion(fallbackQuestion);
    }
  };

  const setupViolationDetection = () => {
    // Tab visibility detection
    const handleVisibilityChange = () => {
      if (document.hidden && isInterviewActive) {
        handleViolation('tabSwitch');
      }
    };
    
    // Media track monitoring
    const monitorMediaTracks = () => {
      if (audioStreamRef.current) {
        const audioTrack = audioStreamRef.current.getAudioTracks()[0];
        const videoTrack = audioStreamRef.current.getVideoTracks()[0];
        
        if (audioTrack && !audioTrack.enabled && isAudioOn) {
          handleViolation('permissionDenied');
        }
        
        if (videoTrack && !videoTrack.enabled && isVideoOn) {
          handleViolation('permissionDenied');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const mediaMonitor = setInterval(monitorMediaTracks, 2000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(mediaMonitor);
    };
  };

  // Advanced workflow handlers
  const handleViolation = (type) => {
    const newViolations = { ...violations };
    newViolations[type]++;
    setViolations(newViolations);
    
    // Store in localStorage
    localStorage.setItem('interviewViolations', JSON.stringify(newViolations));
    
    if (!hasWarned) {
      setHasWarned(true);
      toast.error(`Warning: ${type === 'tabSwitch' ? 'Tab switching' : 'Permission denied'} detected. Further violations will end the interview.`);
    } else {
      toast.error('Multiple violations detected. Ending interview.');
      handleInterviewEnd();
    }
  };

  const handleInterviewTimeout = () => {
    toast.info('Interview time completed. Asking final question...');
    const finalQuestion = "Thank you for your time today. Do you have any feedback for me or any questions about the role?";
    setCurrentQuestion(finalQuestion);
    addAIMessage(finalQuestion, false);
    speakQuestion(finalQuestion);
    
    // End interview after 5 minutes (buffer time)
    setTimeout(() => {
      handleInterviewEnd();
    }, 300000); // 5 minutes
  };

  const handleInterviewEnd = () => {
    setIsInterviewActive(false);
    cleanupInterview();
    generateFinalResults();
  };

  const speakQuestion = (question) => {
    if (!isSpeakerOn || isAISpeaking) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(question);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        setIsAISpeaking(true);
      };
      
      utterance.onend = () => {
        setIsAISpeaking(false);
        // AI finished speaking - user can now manually start recording
      };
      
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsAISpeaking(false);
        toast.error('Audio playback failed. You can still type your response.');
      };
      
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      setIsAISpeaking(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || !audioStreamRef.current || isAISpeaking) return;
    
    try {
      console.log('=== Starting Recording Debug ===');
      
      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }
      
      // Get fresh audio stream to ensure it's active
      const audioTracks = audioStreamRef.current.getAudioTracks();
      console.log('Audio tracks:', audioTracks.map(t => ({
        id: t.id,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));
      
      if (audioTracks.length === 0 || audioTracks[0].readyState !== 'live') {
        throw new Error('Audio track is not live. Please refresh and allow microphone access.');
      }
      
      // Test different mime types in order of compatibility
      const mimeTypes = [
        '',  // Let browser choose default
        'audio/webm',
        'audio/ogg',
        'audio/wav',
        'audio/mp4'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('Selected MIME type:', selectedMimeType || 'browser default');
          break;
        }
      }
      
      // Create a new MediaStream with only audio
      const audioOnlyStream = new MediaStream();
      audioStreamRef.current.getAudioTracks().forEach(track => {
        console.log('Adding audio track:', track.label, track.readyState);
        audioOnlyStream.addTrack(track.clone());
      });
      
      // Create MediaRecorder with minimal options
      const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
      console.log('Creating MediaRecorder with options:', options);
      
      const mediaRecorder = new MediaRecorder(audioOnlyStream, options);
      const audioChunks = [];
      
      // Set up event handlers before starting
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, chunks:', audioChunks.length);
        setIsRecording(false);
        
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { 
            type: selectedMimeType || 'audio/webm'
          });
          console.log('Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
          
          if (audioBlob.size > 0) {
            await processAudioWithAssemblyAI(audioBlob);
          } else {
            toast.error('No audio data captured. Please try again.');
          }
        } else {
          toast.error('No audio recorded. Please try again.');
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error event:', event);
        toast.error('Recording error occurred. Please try again.');
        setIsRecording(false);
      };
      
      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
        setIsRecording(true);
        toast.success('🎤 Recording started - speak clearly!');
      };
      
      // Store reference before starting
      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording - try with timeslice first, then without if it fails
      try {
        console.log('Attempting to start with timeslice...');
        mediaRecorder.start(1000);
      } catch (timesliceError) {
        console.log('Timeslice failed, trying without:', timesliceError);
        mediaRecorder.start();
      }
      
    } catch (error) {
      console.error('=== Recording Error ===');
      console.error('Error details:', error);
      console.error('MediaRecorder supported:', !!window.MediaRecorder);
      console.error('Audio stream:', audioStreamRef.current);
      console.error('Audio tracks:', audioStreamRef.current?.getAudioTracks()?.length);
      
      setIsRecording(false);
      toast.error(`Recording failed: ${error.message}. Try using the text input instead.`);
    }
  };

  const handleSilenceDetected = () => {
    if (isRecording) {
      stopRecording();
      toast.info('Silence detected. Processing your response...');
    }
  };

  const processAudioWithAssemblyAI = async (audioBlob) => {
    if (!audioBlob || audioBlob.size === 0) {
      toast.error('No audio recorded. Please try again.');
      return;
    }

    setIsProcessingAudio(true);
    toast.info('Processing your response...');

    try {
      // Create FormData for the audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('session_id', sessionId);

      // Send to FastAPI backend for AssemblyAI processing
      const response = await fetchWithRetry(`http://localhost:8000/api/speech-to-text/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.transcript) {
        const transcript = result.transcript.trim();
        
        if (transcript.length < 10) {
          toast.error('Response too short. Please provide a more detailed answer.');
          return;
        }

        // Add user message to chat
        addUserMessage(transcript, true);

        // Submit the response
        await submitResponse(transcript);
        
        toast.success('Response processed successfully!');
      } else {
        throw new Error(result.error || 'Failed to transcribe audio');
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      toast.error('Failed to process audio. Please try typing your response.');
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info('Recording stopped. Processing...');
    }
  };

  const submitResponse = async (response) => {
    try {
      // Submit response and get next question
      const submitData = {
        sessionId,
        responseText: response,
        questionNumber,
        timestamp: new Date().toISOString(),
      };
      
      const result = await fetchWithRetry(`${API_BASE_URL}/api/generate-next-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      const data = await result.json();
      
      if (data.success) {
        if (data.interview_completed) {
          toast.success('Interview completed! Thank you for your time.');
          handleInterviewEnd();
        } else {
          // Set next question
          setCurrentQuestion(data.question);
          setQuestionNumber(data.question_number);
          
          // Add new question to chat and speak it
          addAIMessage(data.question, false);
          speakQuestion(data.question);
          
          toast.success('Response submitted successfully');
        }
        
        // Notify socket for real-time updates
        if (socketRef.current) {
          socketRef.current.emit('responseSubmitted', submitData);
        }
      } else {
        throw new Error(data.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response. Please try again.');
    }
  };

  const handleNewQuestion = (question, questionNum) => {
    setCurrentQuestion(question);
    setQuestionNumber(questionNum);
    addAIMessage(question, false);
    speakQuestion(question);
  };

  const addUserMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      sender: 'user',
      message,
      timestamp: new Date(),
      type: 'response'
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const addAIMessage = (message, isTyping = false) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      sender: 'ai',
      message,
      timestamp: new Date(),
      type: 'question'
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const generateFinalResults = async () => {
    try {
      toast.info('Generating your interview results...');
      
      const response = await fetchWithRetry(`${API_BASE_URL}/api/complete-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store results for results page
        const resultsData = {
          sessionId: data.sessionId,
          evaluation: data.evaluation,
          userData: sessionData,
          completedAt: new Date().toISOString(),
          violations: violations
        };
        
        localStorage.setItem('interviewResults', JSON.stringify(resultsData));
        toast.success('Interview completed successfully!');
        onEndInterview();
      } else {
        throw new Error(data.message || 'Failed to complete interview');
      }
    } catch (error) {
      console.error('Error completing interview:', error);
      toast.error('Failed to complete interview evaluation');
      
      // Store basic results as fallback
      const fallbackResults = {
        sessionId,
        evaluation: {
          success: false,
          error: 'Evaluation temporarily unavailable',
          overall_score: 7.0,
          feedback: 'Thank you for completing the interview. Your responses have been recorded.'
        },
        userData: sessionData,
        completedAt: new Date().toISOString(),
        violations: violations
      };
      
      localStorage.setItem('interviewResults', JSON.stringify(fallbackResults));
      onEndInterview();
    }
  };

  const fetchWithRetry = async (url, options = {}, config = {}) => {
    const { timeout = 30000, retries = 3 } = config; // Increased timeout for audio uploads
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      let controller;
      let timeoutId;
      
      try {
        controller = new AbortController();
        
        // Only set timeout for non-audio uploads
        const isAudioUpload = options.body instanceof FormData;
        if (!isAudioUpload) {
          timeoutId = setTimeout(() => {
            if (controller) {
              controller.abort();
            }
          }, timeout);
        }
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        lastError = error;
        
        // Don't retry on AbortError unless it's a timeout
        if (error.name === 'AbortError' && !isAudioUpload) {
          console.warn(`Request aborted on attempt ${i + 1}:`, error);
        }
        
        if (i < retries - 1 && error.name !== 'AbortError') {
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000;
          console.log(`Retrying request in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (error.name === 'AbortError') {
          // Don't retry AbortErrors
          break;
        }
      }
    }
    
    throw lastError;
  };

  const cleanupInterview = () => {
    // Stop recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop speech synthesis
    if (speechSynthRef.current) {
      window.speechSynthesis.cancel();
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    // Stop all media streams
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (userVideoRef.current?.srcObject) {
      const tracks = userVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    
    if (screenShareRef.current?.srcObject) {
      const tracks = screenShareRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    
    // Clear timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const toggleVideo = async () => {
    try {
      if (audioStreamRef.current) {
        const videoTrack = audioStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          setIsVideoOn(videoTrack.enabled);
          toast.success(`Camera ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
          
          if (!videoTrack.enabled) {
            handleViolation('permissionDenied');
          }
        }
      }
    } catch (error) {
      console.error('Error toggling video:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const toggleAudio = async () => {
    try {
      if (audioStreamRef.current) {
        const audioTrack = audioStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setIsAudioOn(audioTrack.enabled);
          toast.success(`Microphone ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
          
          if (!audioTrack.enabled) {
            handleViolation('permissionDenied');
          }
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenShareRef.current?.srcObject) {
          const tracks = screenShareRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          screenShareRef.current.srcObject = null;
        }
        setIsScreenSharing(false);
        toast.success('Screen sharing stopped');
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false 
        });
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        toast.success('Screen sharing started');

        // Listen for screen share end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          toast.info('Screen sharing ended');
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen sharing');
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim()) {
      const message = newMessage.trim();
      addUserMessage(message);
      setNewMessage('');
      
      // Submit manual text response
      await submitResponse(message);
    }
  };

  const handleManualRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const renderConnectionStatus = () => {
    const statusConfig = {
      connecting: { icon: Wifi, color: 'text-yellow-500', text: 'Connecting...' },
      connected: { icon: Wifi, color: 'text-green-500', text: 'Connected' },
      disconnected: { icon: WifiOff, color: 'text-red-500', text: 'Disconnected' },
      error: { icon: WifiOff, color: 'text-red-500', text: 'Connection Error' }
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.error;
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center space-x-2 ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{config.text}</span>
      </div>
    );
  };

  const renderAudioLevel = () => {
    const level = Math.min(audioLevel * 100, 100);
    return (
      <div className="w-16 h-2 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-100 ${
            level > 50 ? 'bg-green-500' : level > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${level}%` }}
        />
      </div>
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canProceed = connectionStatus === 'connected' && isInterviewActive;

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Setting up your interview</h2>
            <p className="text-gray-400">{initializationStep}</p>
          </div>
          <div className="w-64 mx-auto bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
          <p className="text-sm text-gray-500">Please wait while we prepare everything for your interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800/90 backdrop-blur-sm text-white p-4 flex items-center justify-between border-b border-gray-700/50 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              PrepStart AI Interview
            </h1>
          </div>
          <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30 backdrop-blur-sm">
            {sessionData.jobTitle} at {sessionData.company}
          </Badge>
          {renderConnectionStatus()}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-orange-400">
            <Clock className="w-5 h-5" />
            <span className="font-mono text-lg font-semibold">
              {formatTime(timeRemaining)}
            </span>
            {timeRemaining < 300 && (
              <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
            )}
          </div>
          
          {/* Audio Level Indicator */}
          {isRecording && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-400 font-medium animate-pulse">Recording</span>
              {renderAudioLevel()}
            </div>
          )}
          
          {isProcessingAudio && (
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30 animate-pulse backdrop-blur-sm">
              Processing Audio...
            </Badge>
          )}
          
          <Button
            onClick={handleInterviewEnd}
            variant="destructive"
            size="sm"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg transition-all duration-200"
            disabled={!canProceed}
          >
            <Phone className="w-4 h-4 mr-2" />
            End Interview
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area (75%) */}
        <div className="flex-1 bg-gray-800/50 backdrop-blur-sm p-4 relative">
          <div className="flex flex-col h-full gap-4">
            {/* AI Interviewer Section - Top Half */}
            <div className="flex-1 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-white relative overflow-hidden shadow-2xl min-h-0">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10"></div>
              
              {/* AI Label */}
              <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border border-blue-400/50 flex items-center">
                <Bot className="w-3 h-3 mr-1.5" />
                AI INTERVIEWER
              </div>
              
              <div className="relative z-10 text-center p-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-xl">
                  <Bot className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
                <h3 className="text-xl font-bold mb-2 drop-shadow-lg">PrepStart AI</h3>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1 text-xs">
                  {isAISpeaking ? '🎤 Speaking' : '✨ Active'}
                </Badge>
              </div>
              
              {/* AI Status Indicator */}
              {isAISpeaking && (
                <div className="absolute bottom-6 left-6 bg-black/60 text-white px-4 py-2 rounded-full text-sm flex items-center backdrop-blur-sm border border-white/20">
                  <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                  AI Speaking...
                </div>
              )}
              
              {!isAISpeaking && currentQuestion && (
                <div className="absolute bottom-6 right-6 bg-blue-600/80 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm border border-blue-400/30">
                  Question {questionNumber}
                </div>
              )}
            </div>

            {/* User Video Section - Bottom Half */}
            <div className="flex-1 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl relative overflow-hidden shadow-xl border border-gray-600/50 min-h-0">
              {/* User Label */}
              <div className="absolute top-3 left-3 bg-gray-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border border-gray-400/50 flex items-center z-10">
                <User className="w-3 h-3 mr-1.5" />
                CANDIDATE
              </div>
              
              <video
                ref={userVideoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              
              {!isVideoOn && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <div className="text-center text-white">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-60 drop-shadow-lg" />
                    <p className="text-lg font-medium">Camera Off</p>
                  </div>
                </div>
              )}
              
              {/* User Info Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm border border-white/20">
                {sessionData.fullName || sessionData.name || 'Candidate'}
              </div>
              
              {/* Audio Indicator */}
              {!isAudioOn && (
                <div className="absolute top-4 right-4 bg-red-600/90 text-white p-2 rounded-full shadow-lg backdrop-blur-sm border border-red-400/50">
                  <MicOff className="w-4 h-4" />
                </div>
              )}
              
              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1 rounded-full text-sm animate-pulse backdrop-blur-sm border border-red-400/50 flex items-center">
                  <div className="w-2 h-2 bg-red-300 rounded-full mr-2 animate-ping"></div>
                  Recording
                </div>
              )}
            </div>

            {/* Screen Share Area (if active) */}
            {isScreenSharing && (
              <div className="absolute inset-4 bg-black rounded-lg border-2 border-blue-500 z-20">
                <video
                  ref={screenShareRef}
                  autoPlay
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  Screen Sharing
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-700/80 backdrop-blur-sm rounded-full p-3 flex items-center space-x-3 shadow-2xl border border-gray-600/50">
            <Button
              onClick={toggleAudio}
              size="sm"
              variant={isAudioOn ? "secondary" : "destructive"}
              className={`rounded-full w-12 h-12 p-0 transition-all duration-200 shadow-lg ${
                isAudioOn ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={!canProceed}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={toggleVideo}
              size="sm"
              variant={isVideoOn ? "secondary" : "destructive"}
              className={`rounded-full w-12 h-12 p-0 transition-all duration-200 shadow-lg ${
                isVideoOn ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={!canProceed}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={handleManualRecord}
              size="sm"
              variant={isRecording ? "destructive" : "default"}
              className={`rounded-full w-12 h-12 p-0 transition-all duration-200 shadow-lg ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              disabled={isAISpeaking || isProcessingAudio}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
            
            <Button
              onClick={toggleScreenShare}
              size="sm"
              variant={isScreenSharing ? "default" : "secondary"}
              className="rounded-full w-12 h-12 p-0"
              disabled={!canProceed}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              size="sm"
              variant="secondary"
              className="rounded-full w-12 h-12 p-0"
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Chat Sidebar (25%) */}
        <div className="w-1/4 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200/80 flex flex-col shadow-xl backdrop-blur-sm">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200/80 bg-gradient-to-r from-gray-50 to-gray-100/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                Interview Chat
              </h3>
              <Button size="sm" variant="ghost" className="p-1 hover:bg-gray-200/80 rounded-lg">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Chat Active</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-gray-50/30">{/* Enhanced message styling will be applied here */}
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[85%] relative ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-md'
                  } rounded-xl p-4 backdrop-blur-sm border ${
                  message.sender === 'user' ? 'border-blue-400/30' : 'border-gray-300/50'
                }`}>
                  <div className="flex items-start space-x-3">
                    {message.sender === 'ai' && (
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {message.sender === 'user' && (
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                        {message.type === 'response' && (
                          <span className="ml-2 px-2 py-1 bg-blue-200/80 text-blue-800 rounded-full text-xs font-medium backdrop-blur-sm">
                            ✓ Response
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isAITyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-600">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200/80 bg-gradient-to-r from-gray-50 to-gray-100/80 backdrop-blur-sm">
            <div className="flex space-x-3">
              <Input
                type="text"
                placeholder={isAISpeaking ? "🤖 AI is speaking..." : isRecording ? "🎙️ Recording..." : "💬 Type a message or speak your response..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 border-gray-300/50 focus:border-blue-500 focus:ring-blue-500/20 bg-white/80 backdrop-blur-sm"
                disabled={isAISpeaking || isRecording || isProcessingAudio}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isAISpeaking || isRecording || isProcessingAudio}
                size="sm"
                className="px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all duration-200"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600 flex items-center">
                {isAISpeaking ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                    <span>AI is speaking. Recording will start automatically when finished.</span>
                  </>
                ) : isRecording ? (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    <span>Recording... Stop talking for 5 seconds to auto-submit.</span>
                  </>
                ) : isProcessingAudio ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-spin"></div>
                    <span>Processing your audio response...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span>Voice responses are automatically recorded or type manually</span>
                  </>
                )}
              </div>
              
              {violations.tabSwitch > 0 || violations.permissionDenied > 0 ? (
                <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300 animate-pulse">
                  ⚠️ Violations: {violations.tabSwitch + violations.permissionDenied}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
