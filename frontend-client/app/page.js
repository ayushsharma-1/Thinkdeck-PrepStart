'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import PreStartPage from '../components/PreStartPage.jsx';
import RulesPage from '../components/RulesPage.jsx';
import SetupPage from '../components/SetupPage.jsx';
import InterviewPage from '../components/InterviewPage.jsx';
import ResultsPage from '../components/ResultsPage.jsx';

const APP_STAGES = {
  PRE_START: 'pre-start',
  RULES: 'rules', 
  SETUP: 'setup',
  INTERVIEW: 'interview',
  RESULTS: 'results'
};

export default function Home() {
  const [currentStage, setCurrentStage] = useState(APP_STAGES.PRE_START);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    screen: false
  });
  const [sessionData, setSessionData] = useState({
    sessionId: null,
    userDetails: null,
    messages: [],
    currentQuestion: null,
    isRecording: false,
    micStatus: 'inactive'
  });

  useEffect(() => {
    // Check if there's an existing session in localStorage
    const savedSessionId = localStorage.getItem('prepstart_session_id');
    const savedSessionData = localStorage.getItem('prepstart_session_data');
    
    if (savedSessionId && savedSessionData) {
      try {
        const parsedData = JSON.parse(savedSessionData);
        setSessionData(prev => ({
          ...prev,
          sessionId: savedSessionId,
          ...parsedData
        }));
        setCurrentStage(APP_STAGES.INTERVIEW);
      } catch (error) {
        console.error('Error parsing saved session data:', error);
        // Clear corrupted data
        localStorage.removeItem('prepstart_session_id');
        localStorage.removeItem('prepstart_session_data');
      }
    }
  }, []);

  const handleStageChange = (newStage, data = {}) => {
    setCurrentStage(newStage);
    
    if (data.sessionId) {
      setSessionData(prev => ({ ...prev, ...data }));
      localStorage.setItem('prepstart_session_id', data.sessionId);
      localStorage.setItem('prepstart_session_data', JSON.stringify({
        userDetails: data.userDetails,
        messages: data.messages || [],
        currentQuestion: data.currentQuestion
      }));
    }
  };

  const handlePermissionsUpdate = (newPermissions) => {
    setPermissions(prev => ({ ...prev, ...newPermissions }));
  };

  const updateSessionData = (newData) => {
    setSessionData(prev => ({ ...prev, ...newData }));
  };

  const renderCurrentStage = () => {
    switch(currentStage) {
      case APP_STAGES.PRE_START:
        return (
          <PreStartPage
            permissions={permissions}
            onPermissionsUpdate={handlePermissionsUpdate}
            onNext={() => handleStageChange(APP_STAGES.RULES)}
          />
        );
      
      case APP_STAGES.RULES:
        return (
          <RulesPage
            onNext={() => handleStageChange(APP_STAGES.SETUP)}
            onBack={() => handleStageChange(APP_STAGES.PRE_START)}
          />
        );
      
      case APP_STAGES.SETUP:
        return (
          <SetupPage
            sessionData={sessionData}
            onSessionDataUpdate={updateSessionData}
            onNext={() => handleStageChange(APP_STAGES.INTERVIEW)}
            onBack={() => handleStageChange(APP_STAGES.RULES)}
          />
        );
      
      case APP_STAGES.INTERVIEW:
        return (
          <InterviewPage
            sessionData={sessionData}
            onEndInterview={handleEndInterview}
          />
        );
      
      case APP_STAGES.RESULTS:
        return (
          <ResultsPage
            onRestart={handleRestart}
            onExit={handleExit}
          />
        );
      
      default:
        return (
          <PreStartPage
            permissions={permissions}
            onPermissionsUpdate={handlePermissionsUpdate}
            onNext={() => handleStageChange(APP_STAGES.RULES)}
          />
        );
    }
  };

  const handleEndInterview = () => {
    setCurrentStage(APP_STAGES.RESULTS);
  };

  const handleRestart = () => {
    // Clear all stored data
    localStorage.removeItem('interviewViolations');
    localStorage.removeItem('interviewResults');
    
    // Reset state
    setCurrentStage(APP_STAGES.PRE_START);
    setPermissions({
      camera: null,
      microphone: null, 
      screen: null
    });
    setSessionData({
      fullName: '',
      email: '',
      phone: '',
      jobTitle: '',
      company: '',
      jobDescription: '',
      resume: null
    });
  };

  const handleExit = () => {
    // Clear stored data and close/redirect
    localStorage.removeItem('interviewViolations');
    localStorage.removeItem('interviewResults');
    
    // In a real app, this might redirect to a landing page or close the app
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {renderCurrentStage()}
      <Toaster 
        position="top-right"
        richColors
        closeButton
      />
    </main>
  );
}
