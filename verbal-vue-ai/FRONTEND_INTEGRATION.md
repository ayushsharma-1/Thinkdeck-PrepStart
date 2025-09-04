# 🔌 Frontend Integration Guide

This guide provides detailed instructions for integrating the existing React frontend with the comprehensive backend API.

## 📋 Prerequisites

- Node.js 18+ installed
- React frontend already set up (existing in the workspace)
- Backend API running on `http://localhost:8000`

## 🚀 Quick Setup

### 1. Install Additional Dependencies

```bash
# In the root directory (frontend)
npm install axios react-query @types/file-saver file-saver
```

### 2. Environment Configuration

Create or update `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WEBSOCKET_URL=ws://localhost:8000

# Upload Configuration
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.txt

# Feature Flags
VITE_ENABLE_MOCK_INTERVIEWS=true
VITE_ENABLE_CODE_EXECUTION=true
VITE_ENABLE_MCQ_TESTS=true

# Development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

## 🔧 API Service Implementation

### Update src/services/api.ts

```typescript
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
}

interface Company {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  questionCount: number;
  isActive: boolean;
}

interface InterviewSession {
  sessionId: string;
  questions: string[];
  duration: number;
  status: 'active' | 'completed';
}

interface CodingProblem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: any[];
  constraints: string[];
  companies: string[];
  timeLimit: number;
  memoryLimit: string;
  category: string;
  starterCode?: Record<string, string>;
}

interface MCQQuestion {
  id: number;
  type: 'single' | 'multiple';
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  company: string;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // For session cookies
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (import.meta.env.VITE_DEBUG_MODE === 'true') {
          console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
        }
        
        return config;
      },
      (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        if (import.meta.env.VITE_DEBUG_MODE === 'true') {
          console.log('API Response:', response.status, response.config.url, response.data);
        }
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.status, error.response?.data);
        
        // Handle specific error cases
        if (error.response?.status === 429) {
          throw new Error('Too many requests. Please slow down.');
        }
        
        if (error.response?.status === 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw error;
      }
    );
  }

  // Health Check
  async checkHealth() {
    const response = await this.api.get<ApiResponse>('/health');
    return response.data;
  }

  // Companies
  async getCompanies(activeOnly = true): Promise<Company[]> {
    const response = await this.api.get<ApiResponse<Company[]>>('/companies', {
      params: { active: activeOnly }
    });
    return response.data.data;
  }

  async getCompany(slug: string): Promise<Company> {
    const response = await this.api.get<ApiResponse<Company>>(`/companies/${slug}`);
    return response.data.data;
  }

  // Mock Interview
  async createInterviewSession(data: {
    resume: string;
    jobDescription: string;
    company: string;
  }): Promise<InterviewSession> {
    const response = await this.api.post<ApiResponse<InterviewSession>>('/interview/sessions', data);
    return response.data.data;
  }

  async transcribeAudio(sessionId: string, audioFile: File): Promise<{ transcription: string; confidence: number }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    const response = await this.api.post<ApiResponse<{ transcription: string; confidence: number }>>(
      `/interview/sessions/${sessionId}/transcribe`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // Increased timeout for audio processing
      }
    );
    return response.data.data;
  }

  async evaluateAnswer(sessionId: string, data: {
    transcription: string;
    questionIndex: number;
  }) {
    const response = await this.api.post<ApiResponse>(
      `/interview/sessions/${sessionId}/evaluate`,
      data
    );
    return response.data.data;
  }

  async completeInterview(sessionId: string) {
    const response = await this.api.post<ApiResponse>(
      `/interview/sessions/${sessionId}/complete`
    );
    return response.data.data;
  }

  // Coding Problems
  async getCodingProblems(params: {
    company?: string;
    difficulty?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: CodingProblem[]; pagination: any }> {
    const response = await this.api.get<ApiResponse<{ data: CodingProblem[]; pagination: any }>>('/coding/problems', { params });
    return response.data.data;
  }

  async getCodingProblem(id: number): Promise<CodingProblem> {
    const response = await this.api.get<ApiResponse<CodingProblem>>(`/coding/problems/${id}`);
    return response.data.data;
  }

  async executeCode(data: {
    problemId: number;
    language: string;
    code: string;
    runTests?: boolean;
  }) {
    const response = await this.api.post<ApiResponse>('/coding/execute', data, {
      timeout: 60000, // Increased timeout for code execution
    });
    return response.data.data;
  }

  async submitSolution(data: {
    problemId: number;
    language: string;
    code: string;
  }) {
    const response = await this.api.post<ApiResponse>('/coding/submit', data);
    return response.data.data;
  }

  // MCQ Tests
  async getMCQCategories() {
    const response = await this.api.get<ApiResponse>('/mcq/categories');
    return response.data.data;
  }

  async createMCQSession(data: {
    categories: string[];
    difficulty?: string;
    company?: string;
    questionCount?: number;
    timeLimit?: number;
  }) {
    const response = await this.api.post<ApiResponse>('/mcq/sessions', data);
    return response.data.data;
  }

  async submitMCQAnswers(sessionId: string, answers: Record<string, number[]>) {
    const response = await this.api.post<ApiResponse>(`/mcq/sessions/${sessionId}/submit`, {
      answers
    });
    return response.data.data;
  }

  // File Upload
  async uploadFile(file: File): Promise<{
    fileId: string;
    filename: string;
    extractedText: string;
    fileType: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post<ApiResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }
}

export const apiService = new ApiService();
export type { Company, InterviewSession, CodingProblem, MCQQuestion };
```

## 🎯 Component Integration Examples

### 1. Update MockInterview.tsx

```typescript
import React, { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '../hooks/use-toast';

export const MockInterview: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();

  const startInterview = useCallback(async (resumeText: string, jobDescription: string, company: string) => {
    try {
      const sessionData = await apiService.createInterviewSession({
        resume: resumeText,
        jobDescription,
        company
      });
      setSession(sessionData);
      toast({
        title: "Interview Started",
        description: "Your mock interview session has begun!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start interview session.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'answer.wav', { type: 'audio/wav' });
        
        try {
          const transcription = await apiService.transcribeAudio(session.sessionId, audioFile);
          const evaluation = await apiService.evaluateAnswer(session.sessionId, {
            transcription: transcription.transcription,
            questionIndex: currentQuestion
          });
          
          // Handle evaluation results
          console.log('Evaluation:', evaluation);
          setCurrentQuestion(prev => prev + 1);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to process your answer.",
            variant: "destructive",
          });
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access microphone.",
        variant: "destructive",
      });
    }
  }, [session, currentQuestion, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder, isRecording]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Mock Interview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {session && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Question {currentQuestion + 1}</h3>
              <p>{session.questions[currentQuestion]}</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 2. Update CodeEditor.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';

interface CodeEditorProps {
  problemId?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ problemId }) => {
  const [problem, setProblem] = useState<any>(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
  ];

  useEffect(() => {
    if (problemId) {
      loadProblem(problemId);
    }
  }, [problemId]);

  useEffect(() => {
    if (problem && problem.starterCode && problem.starterCode[language]) {
      setCode(problem.starterCode[language]);
    }
  }, [language, problem]);

  const loadProblem = async (id: number) => {
    try {
      const problemData = await apiService.getCodingProblem(id);
      setProblem(problemData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load problem.",
        variant: "destructive",
      });
    }
  };

  const runCode = async () => {
    if (!problem) return;
    
    setIsExecuting(true);
    try {
      const result = await apiService.executeCode({
        problemId: problem.id,
        language,
        code,
        runTests: true
      });
      setResults(result);
      
      toast({
        title: "Code Executed",
        description: `${result.summary.passedTests}/${result.summary.totalTests} test cases passed`,
      });
    } catch (error) {
      toast({
        title: "Execution Error",
        description: "Failed to execute code.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const submitSolution = async () => {
    if (!problem) return;
    
    try {
      const result = await apiService.submitSolution({
        problemId: problem.id,
        language,
        code
      });
      
      toast({
        title: "Solution Submitted",
        description: `Status: ${result.status}`,
      });
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit solution.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {problem ? problem.title : 'Code Editor'}
          <div className="flex gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {problem && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Problem Description</h3>
              <div dangerouslySetInnerHTML={{ __html: problem.description }} />
            </div>
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 font-mono text-sm p-4 border rounded-lg"
              placeholder="Write your solution here..."
            />
            
            <div className="flex gap-2">
              <Button onClick={runCode} disabled={isExecuting || !code.trim()}>
                {isExecuting ? 'Running...' : 'Run Code'}
              </Button>
              <Button onClick={submitSolution} variant="outline" disabled={!code.trim()}>
                Submit Solution
              </Button>
            </div>
            
            {results && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Results</h3>
                <div className="space-y-2">
                  <p>Passed: {results.summary.passedTests}/{results.summary.totalTests}</p>
                  <p>Runtime: {results.summary.runtime}</p>
                  <p>Memory: {results.summary.memory}</p>
                  {results.results.map((result: any, index: number) => (
                    <div key={index} className={`p-2 rounded ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                      <p>Test {result.testCase}: {result.passed ? '✅' : '❌'}</p>
                      {!result.passed && (
                        <div>
                          <p>Expected: {result.expected}</p>
                          <p>Got: {result.actual}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 3. Update MCQTest.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';

export const MCQTest: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (session && session.timeLimit) {
      setTimeRemaining(session.timeLimit);
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session]);

  const startTest = async (config: {
    categories: string[];
    difficulty?: string;
    company?: string;
    questionCount?: number;
    timeLimit?: number;
  }) => {
    try {
      const sessionData = await apiService.createMCQSession(config);
      setSession(sessionData);
      setAnswers({});
      setCurrentQuestion(0);
      toast({
        title: "Test Started",
        description: "MCQ test session has begun!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start MCQ test.",
        variant: "destructive",
      });
    }
  };

  const handleAnswer = (questionId: string, selectedOptions: number[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedOptions
    }));
  };

  const submitTest = async () => {
    if (!session) return;
    
    try {
      const result = await apiService.submitMCQAnswers(session.sessionId, answers);
      setResults(result);
      
      toast({
        title: "Test Submitted",
        description: `Score: ${result.score.percentage}%`,
      });
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit test.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          MCQ Test
          {session && (
            <div className="text-sm font-normal">
              Time: {formatTime(timeRemaining)}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {session && !results && (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestion + 1} of {session.questions.length}</span>
              <span>Category: {session.questions[currentQuestion].category}</span>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {session.questions[currentQuestion].question}
              </h3>
              
              <div className="space-y-2">
                {session.questions[currentQuestion].type === 'single' ? (
                  <RadioGroup
                    value={answers[session.questions[currentQuestion].id]?.[0]?.toString() || ''}
                    onValueChange={(value) => 
                      handleAnswer(session.questions[currentQuestion].id, [parseInt(value)])
                    }
                  >
                    {session.questions[currentQuestion].options.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {session.questions[currentQuestion].options.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`option-${index}`}
                          checked={answers[session.questions[currentQuestion].id]?.includes(index) || false}
                          onCheckedChange={(checked) => {
                            const currentAnswers = answers[session.questions[currentQuestion].id] || [];
                            if (checked) {
                              handleAnswer(session.questions[currentQuestion].id, [...currentAnswers, index]);
                            } else {
                              handleAnswer(session.questions[currentQuestion].id, currentAnswers.filter(a => a !== index));
                            }
                          }}
                        />
                        <Label htmlFor={`option-${index}`}>{option}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              
              {currentQuestion < session.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button onClick={submitTest}>
                  Submit Test
                </Button>
              )}
            </div>
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Test Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.score.percentage}%
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {results.score.correct}/{results.score.total}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Category Breakdown:</h4>
              {Object.entries(results.categoryBreakdown).map(([category, scores]: [string, any]) => (
                <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <span>{scores.correct}/{scores.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

## 🔌 WebSocket Integration

### Create src/services/websocket.ts

```typescript
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
      transports: ['websocket'],
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Custom events
    this.socket.on('interview:question', (data) => {
      this.emit('interviewQuestion', data);
    });

    this.socket.on('code:execution:result', (data) => {
      this.emit('codeExecutionResult', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Interview-specific methods
  joinInterviewSession(sessionId: string) {
    this.emit('interview:join', { sessionId });
  }

  leaveInterviewSession(sessionId: string) {
    this.emit('interview:leave', { sessionId });
  }

  // Code execution methods
  joinCodeSession(problemId: number) {
    this.emit('code:join', { problemId });
  }

  leaveCodeSession(problemId: number) {
    this.emit('code:leave', { problemId });
  }
}

export const websocketService = new WebSocketService();
```

## 🎨 UI Components Updates

### Update src/components/AssessmentCard.tsx

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Users, Star } from 'lucide-react';

interface AssessmentCardProps {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number;
  participants: number;
  rating: number;
  onStart: () => void;
  isLoading?: boolean;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  title,
  description,
  difficulty,
  duration,
  participants,
  rating,
  onStart,
  isLoading = false
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-sm hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge className={getDifficultyColor(difficulty)}>
            {difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-3">
          {description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{participants}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{rating}</span>
          </div>
        </div>
        
        <Button 
          onClick={onStart} 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? 'Starting...' : 'Start Assessment'}
        </Button>
      </CardContent>
    </Card>
  );
};
```

## 🧪 Testing Integration

### Create src/__tests__/api.test.ts

```typescript
import { apiService } from '../services/api';

// Mock axios for testing
jest.mock('axios');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should check health status', async () => {
      // Test health check functionality
    });
  });

  describe('Companies', () => {
    it('should fetch companies list', async () => {
      // Test companies fetch
    });

    it('should fetch specific company', async () => {
      // Test single company fetch
    });
  });

  describe('Mock Interview', () => {
    it('should create interview session', async () => {
      // Test interview session creation
    });

    it('should transcribe audio', async () => {
      // Test audio transcription
    });
  });

  describe('Code Execution', () => {
    it('should execute code successfully', async () => {
      // Test code execution
    });

    it('should handle execution errors', async () => {
      // Test error handling
    });
  });
});
```

## 🚀 Next Steps

1. **Install Dependencies**: Run `npm install` to add the required packages
2. **Environment Setup**: Configure the `.env` file with your backend URL
3. **Component Integration**: Update your existing components with the new API calls
4. **Testing**: Run tests to ensure everything works correctly
5. **WebSocket**: Implement real-time features using the WebSocket service
6. **Error Handling**: Add comprehensive error handling and loading states
7. **Performance**: Implement caching and optimization strategies

## 🔍 Debugging Tips

- Enable debug mode with `VITE_DEBUG_MODE=true` to see API logs
- Check browser network tab for API requests
- Use React DevTools for component state debugging
- Monitor WebSocket connections in browser developer tools

This integration guide provides a complete foundation for connecting your React frontend with the comprehensive backend API. The implementation includes proper error handling, loading states, and real-time features for an excellent user experience.
