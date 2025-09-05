// API Configuration for PrepStart Frontend
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  FASTAPI_URL: process.env.NEXT_PUBLIC_FASTAPI_URL,
  
  // API Endpoints
  ENDPOINTS: {
    UPLOAD_RESUME: '/api/upload-resume',
    SETUP_INTERVIEW: '/api/setup-interview', 
    SPEECH_TO_TEXT: '/api/speech-to-text',
    SUBMIT_RESPONSE: '/api/submit-response',
    GET_SESSION: '/api/session',
  }
}

// Helper function to build full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

export default API_CONFIG
