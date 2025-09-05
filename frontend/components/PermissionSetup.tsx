'use client'

import { useState, useEffect } from 'react'
import { Camera, Mic, Monitor, AlertTriangle, CheckCircle, User } from 'lucide-react'

interface PermissionSetupProps {
  onPermissionsGranted: (permissions: MediaPermissions) => void
}

interface MediaPermissions {
  camera: boolean
  microphone: boolean
  screenShare: boolean
}

export default function PermissionSetup({ onPermissionsGranted }: PermissionSetupProps) {
  const [permissions, setPermissions] = useState<MediaPermissions>({
    camera: false,
    microphone: false,
    screenShare: false
  })
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string>('')

  const checkPermissions = async () => {
    setIsChecking(true)
    setError('')

    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      setPermissions(prev => ({
        ...prev,
        camera: true,
        microphone: true
      }))

      // Test screen share capability
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        setPermissions(prev => ({
          ...prev,
          screenShare: true
        }))
        
        // Stop the test streams immediately
        screenStream.getTracks().forEach(track => track.stop())
      } catch (screenError) {
        console.warn('Screen share not available:', screenError)
      }

      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())

    } catch (err: any) {
      setError(err.message || 'Failed to access media devices')
      console.error('Permission error:', err)
    } finally {
      setIsChecking(false)
    }
  }

  const handleContinue = () => {
    if (permissions.camera && permissions.microphone) {
      onPermissionsGranted(permissions)
    }
  }

  const allRequiredPermissionsGranted = permissions.camera && permissions.microphone

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Your Interview</h1>
          <p className="text-gray-600">We need access to your camera and microphone for the best interview experience</p>
        </div>

        {/* Permission Cards */}
        <div className="space-y-4 mb-8">
          {/* Camera Permission */}
          <div className={`p-6 rounded-xl border-2 transition-all ${
            permissions.camera 
              ? 'border-green-200 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  permissions.camera 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Camera Access</h3>
                  <p className="text-sm text-gray-600">Required for video interview</p>
                </div>
              </div>
              {permissions.camera && (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>

          {/* Microphone Permission */}
          <div className={`p-6 rounded-xl border-2 transition-all ${
            permissions.microphone 
              ? 'border-green-200 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  permissions.microphone 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Microphone Access</h3>
                  <p className="text-sm text-gray-600">Required for voice responses</p>
                </div>
              </div>
              {permissions.microphone && (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>

          {/* Screen Share Permission */}
          <div className={`p-6 rounded-xl border-2 transition-all ${
            permissions.screenShare 
              ? 'border-green-200 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  permissions.screenShare 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Screen Share</h3>
                  <p className="text-sm text-gray-600">Optional for presentations</p>
                </div>
              </div>
              {permissions.screenShare && (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Permission Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!allRequiredPermissionsGranted ? (
            <button
              onClick={checkPermissions}
              disabled={isChecking}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isChecking ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Checking Permissions...</span>
                </>
              ) : (
                <span>Grant Permissions</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all flex items-center justify-center space-x-2"
            >
              <span>Continue to Interview Rules</span>
            </button>
          )}
        </div>

        {/* Requirements Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> Camera and microphone access are required for the interview. 
            Screen sharing is optional but may be requested for technical demonstrations.
          </p>
        </div>
      </div>
    </div>
  )
}
