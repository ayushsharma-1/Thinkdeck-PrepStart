'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import PermissionSetup from '@/components/PermissionSetup'
import InterviewRules from '@/components/InterviewRules'
import InterviewInterface from '@/components/InterviewInterface'
import SessionResults from '@/components/SessionResults'
import { Upload, User, Briefcase, FileText } from 'lucide-react'

type Screen = 'welcome' | 'setup' | 'permissions' | 'rules' | 'interview' | 'results'
type EndReason = 'completed' | 'violation' | 'timeout'

interface CandidateData {
  name: string
  email: string
  phone: string
  experience: string
}

interface JobData {
  role_name: string
  job_description: string
}

interface MediaPermissions {
  camera: boolean
  microphone: boolean
  screenShare: boolean
}

export default function InterviewPage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome')
  const [candidateData, setCandidateData] = useState<CandidateData>({
    name: '',
    email: '',
    phone: '',
    experience: ''
  })
  const [jobData, setJobData] = useState<JobData>({
    role_name: '',
    job_description: ''
  })
  const [resumeText, setResumeText] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [permissions, setPermissions] = useState<MediaPermissions>({
    camera: false,
    microphone: false,
    screenShare: false
  })
  const [sessionId, setSessionId] = useState('')
  const [endReason, setEndReason] = useState<EndReason>('completed')
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setResumeFile(file)
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('resume', file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/upload-resume`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (result.status === 'success') {
        setResumeText(result.resumeText)
      } else {
        alert('Failed to process resume')
      }
    } catch (error) {
      console.error('Resume upload error:', error)
      alert('Failed to process resume')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePermissionsGranted = (grantedPermissions: MediaPermissions) => {
    setPermissions(grantedPermissions)
    setCurrentScreen('rules')
  }

  const handleRulesAccepted = () => {
    setCurrentScreen('interview')
    startInterviewSession()
  }

  const startInterviewSession = async () => {
    const newSessionId = uuidv4()
    setSessionId(newSessionId)

    try {
      // Create session in Redis
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          candidateData,
          jobData,
          resumeText
        })
      })

      // Setup with backend and get first question
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/setup-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...candidateData,
          ...jobData,
          resumeText,
          sessionId: newSessionId
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup interview')
      }

      // Store the first question in session
      if (data.firstQuestion) {
        await fetch('/api/session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: newSessionId,
            currentQuestion: data.firstQuestion,
            questionNumber: 1
          })
        })
      }

      console.log('Interview setup successful:', data)
    } catch (error) {
      console.error('Failed to start interview session:', error)
      alert('Failed to start interview. Please try again.')
    }
  }

  const handleSessionEnd = (reason: EndReason) => {
    setEndReason(reason)
    setCurrentScreen('results')
    
    // Clean up session
    if (sessionId) {
      fetch(`/api/session?sessionId=${sessionId}`, { method: 'DELETE' })
        .catch(console.error)
    }
  }

  const resetInterview = () => {
    setCurrentScreen('welcome')
    setCandidateData({ name: '', email: '', phone: '', experience: '' })
    setJobData({ role_name: '', job_description: '' })
    setResumeText('')
    setResumeFile(null)
    setPermissions({ camera: false, microphone: false, screenShare: false })
    setSessionId('')
    setEndReason('completed')
  }

  const canProceed = candidateData.name && candidateData.email && jobData.role_name && resumeText

  // Welcome Screen
  if (currentScreen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">PrepStart AI Interview</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Experience a cutting-edge AI interview platform with Google Meet-inspired interface, 
              real-time chat, and intelligent question generation.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            {/* Candidate Information */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Personal Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    value={candidateData.name}
                    onChange={(e) => setCandidateData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Email Address *</label>
                  <input
                    type="email"
                    value={candidateData.email}
                    onChange={(e) => setCandidateData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={candidateData.phone}
                    onChange={(e) => setCandidateData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Years of Experience</label>
                  <input
                    type="text"
                    value={candidateData.experience}
                    onChange={(e) => setCandidateData(prev => ({ ...prev, experience: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., 5 years"
                  />
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <Briefcase className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Position Details</h2>
              </div>
              <div className="grid md:grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Role/Position *</label>
                  <input
                    type="text"
                    value={jobData.role_name}
                    onChange={(e) => setJobData(prev => ({ ...prev, role_name: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="e.g., Senior Software Engineer, Product Manager, Data Scientist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Job Description</label>
                  <textarea
                    value={jobData.job_description}
                    onChange={(e) => setJobData(prev => ({ ...prev, job_description: e.target.value }))}
                    rows={4}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Paste the job description or describe the role requirements..."
                  />
                </div>
              </div>
            </div>

            {/* Resume Upload */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <FileText className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold text-gray-900">Resume Upload</h2>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isProcessing}
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2 text-gray-900">
                    {resumeFile ? resumeFile.name : 'Click to upload your resume'}
                  </p>
                  <p className="text-gray-600">Supports PDF, DOCX, TXT (Max 5MB)</p>
                </button>
                
                {isProcessing && (
                  <div className="mt-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-blue-600 font-medium">Processing resume...</p>
                  </div>
                )}
                
                {resumeText && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <FileText className="w-5 h-5" />
                      <p className="font-medium">Resume processed successfully!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={() => setCurrentScreen('permissions')}
                disabled={!canProceed}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white px-12 py-4 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                Continue to Setup
              </button>
              {!canProceed && (
                <p className="text-gray-500 text-sm mt-3">
                  Please fill in all required fields and upload your resume to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentScreen === 'permissions') {
    return <PermissionSetup onPermissionsGranted={handlePermissionsGranted} />
  }

  if (currentScreen === 'rules') {
    return (
      <InterviewRules 
        onAccept={handleRulesAccepted} 
        onBack={() => setCurrentScreen('permissions')}
      />
    )
  }

  if (currentScreen === 'interview') {
    return (
      <InterviewInterface 
        sessionId={sessionId}
        onSessionEnd={handleSessionEnd}
      />
    )
  }

  if (currentScreen === 'results') {
    return (
      <SessionResults 
        sessionId={sessionId}
        endReason={endReason}
        onRestart={resetInterview}
      />
    )
  }

  return null
}
