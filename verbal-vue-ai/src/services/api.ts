const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Assessment Types
  async getAssessmentTypes() {
    return this.request('/assessments/types');
  }

  // Companies
  async getCompanies() {
    return this.request('/companies');
  }

  // Mock Interview
  async createInterviewSession(data: { resume: string; jobDescription: string; company?: string }) {
    return this.request('/interview/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async transcribeAudio(sessionId: string, audioFile: File) {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return this.request(`/interview/sessions/${sessionId}/transcribe`, {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  async evaluateAnswer(sessionId: string, data: { transcription: string; questionIndex: number }) {
    return this.request(`/interview/sessions/${sessionId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeInterview(sessionId: string) {
    return this.request(`/interview/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  }

  // Coding Challenges
  async getCodingProblems(params: {
    company?: string;
    difficulty?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined) as [string, string][]
    ).toString();
    
    return this.request(`/coding/problems?${queryString}`);
  }

  async getCodingProblem(id: number) {
    return this.request(`/coding/problems/${id}`);
  }

  async executeCode(data: {
    problemId: number;
    language: string;
    code: string;
    runTests?: boolean;
  }) {
    return this.request('/coding/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitCode(data: {
    problemId: number;
    language: string;
    code: string;
  }) {
    return this.request('/coding/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // MCQ Tests
  async getMCQCategories() {
    return this.request('/mcq/categories');
  }

  async createMCQSession(data: {
    categories: string[];
    difficulty?: string;
    company?: string;
    questionCount: number;
    timeLimit: number;
  }) {
    return this.request('/mcq/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitMCQAnswers(sessionId: string, answers: { [key: number]: number[] }) {
    return this.request(`/mcq/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  // File Upload
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  // Health Check
  async checkHealth() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();