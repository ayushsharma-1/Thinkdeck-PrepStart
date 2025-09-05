'use client'

import { useState } from 'react'
import { AlertTriangle, Shield, Eye, Mic, Monitor, Clock, CheckCircle } from 'lucide-react'

interface InterviewRulesProps {
  onAccept: () => void
  onBack: () => void
}

export default function InterviewRules({ onAccept, onBack }: InterviewRulesProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  const rules = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Camera Must Stay On",
      description: "Your camera must remain enabled throughout the entire interview session."
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Microphone Required",
      description: "Keep your microphone enabled for clear communication with the AI interviewer."
    },
    {
      icon: <Monitor className="w-6 h-6" />,
      title: "No Tab Switching",
      description: "Switching tabs or minimizing the window will trigger a warning and may end the session."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Screen Share Monitoring",
      description: "Screen sharing permissions are monitored to ensure interview integrity."
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "30-minute Time Limit",
      description: "The interview session will automatically end after 30 minutes."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Rules & Guidelines</h1>
          <p className="text-gray-600">Please read and acknowledge these important rules before starting your interview</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 mr-3" />
            <div>
              <h3 className="text-yellow-800 font-semibold mb-2">Important Warning</h3>
              <p className="text-yellow-700 text-sm leading-relaxed">
                You will receive <strong>ONE WARNING</strong> for any rule violation. 
                After the warning, any additional violation will <strong>immediately terminate</strong> your interview session.
                This includes switching tabs, disabling camera/microphone, or revoking permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {rules.map((rule, index) => (
            <div key={index} className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                  {rule.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{rule.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{rule.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Session Details */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">What to Expect</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">During the Interview:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• AI will ask personalized questions based on your resume</li>
                <li>• You can respond via voice or text</li>
                <li>• Real-time chat panel will show conversation history</li>
                <li>• Session data is stored temporarily (30 minutes only)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Technical Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Stable internet connection required</li>
                <li>• Modern browser with WebRTC support</li>
                <li>• Quiet environment recommended</li>
                <li>• Desktop or tablet for best experience</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Acknowledgment Checkbox */}
        <div className="mb-8">
          <label className="flex items-start space-x-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center transition-all ${
                acknowledged 
                  ? 'bg-green-600 border-green-600' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                {acknowledged && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium">
                I acknowledge that I have read and understood all the interview rules and guidelines.
              </p>
              <p className="text-gray-600 text-sm mt-1">
                I understand that violations may result in immediate session termination.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Back to Setup
          </button>
          <button
            onClick={onAccept}
            disabled={!acknowledged}
            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Interview
          </button>
        </div>
      </div>
    </div>
  )
}
