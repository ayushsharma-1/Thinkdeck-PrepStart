# API Endpoints Documentation

Base URL: `http://localhost:8000/api`

## 🔧 System & Health

### GET /health
System health check and service status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2025-09-04T10:00:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "ai": "configured",
      "speech": "configured",
      "docker": "available"
    }
  }
}
```

### GET /health/stats
Get detailed system statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": 1250,
    "activeSessions": 25,
    "totalQuestions": 2500,
    "totalCompanies": 50,
    "averageInterviewDuration": 1800,
    "systemLoad": {
      "cpu": 45.2,
      "memory": 68.5,
      "disk": 23.1
    }
  }
}
```

## 🏢 Companies

### GET /companies
Get all supported companies with question counts.

**Query Parameters:**
- `active` (boolean): Filter by active status (default: true)

**Response:**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Google",
      "slug": "google",
      "logo": "https://logo.clearbit.com/google.com",
      "description": "Multinational technology company...",
      "website": "https://google.com",
      "questionCount": 145,
      "isActive": true
    }
  ]
}
```

### GET /companies/:slug
Get specific company by slug.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Google",
      "logo": "/images/google-logo.png"
    }
  ]
}
```

## Mock Interview

### POST /interview/sessions
Create a new interview session.

**Request:**
```json
{
  "resume": "Resume content or file path",
  "jobDescription": "Job description text",
  "company": "google"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "questions": ["Tell me about yourself..."],
    "duration": 1800,
    "status": "active"
  }
}
```

### POST /interview/sessions/{sessionId}/transcribe
Submit audio for speech-to-text processing.

**Request:** FormData with audio file

**Response:**
```json
{
  "success": true,
  "data": {
    "transcription": "Hello, my name is...",
    "confidence": 0.95
  }
}
```

### POST /interview/sessions/{sessionId}/evaluate
Get AI evaluation of current answer.

**Request:**
```json
{
  "transcription": "User's answer text",
  "questionIndex": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 8.5,
    "feedback": "Good technical explanation...",
    "nextQuestion": "Can you explain how you would..."
  }
}
```

### POST /interview/sessions/{sessionId}/complete
Complete interview and get final results.

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 7.2,
    "categoryScores": {
      "communication": 8.1,
      "technical": 7.5,
      "confidence": 6.8,
      "relevance": 6.4
    },
    "feedback": "Great job overall...",
    "improvementAreas": ["Explain data structures more clearly"]
  }
}
```

## Coding Challenges

### GET /coding/problems
Get coding problems with filtering.

**Query Parameters:**
- company: Filter by company (optional)
- difficulty: easy|medium|hard (optional)
- category: Filter by category (optional)
- limit: Number of results (default: 20)
- offset: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Two Sum",
      "difficulty": "Easy",
      "description": "Given an array of integers...",
      "examples": [...],
      "constraints": [...],
      "companies": ["Amazon", "Google"],
      "timeLimit": 45,
      "memoryLimit": "256 MB",
      "category": "Array"
    }
  ],
  "pagination": {
    "total": 500,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /coding/problems/{id}
Get specific coding problem details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Two Sum",
    "difficulty": "Easy",
    "description": "Given an array of integers...",
    "examples": [...],
    "constraints": [...],
    "testCases": [...],
    "starterCode": {
      "python": "def two_sum(nums, target):\n    pass",
      "javascript": "function twoSum(nums, target) {\n    \n}",
      "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "c": "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}"
    }
  }
}
```

### POST /coding/execute
Execute code with test cases.

**Request:**
```json
{
  "problemId": 1,
  "language": "python",
  "code": "def two_sum(nums, target):\n    return [0, 1]",
  "runTests": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "testCase": 1,
        "input": "[2,7,11,15], 9",
        "expected": "[0,1]",
        "actual": "[0,1]",
        "passed": true,
        "runtime": "2ms",
        "memory": "14.2MB"
      }
    ],
    "summary": {
      "totalTests": 3,
      "passedTests": 3,
      "runtime": "2ms",
      "memory": "14.2MB"
    }
  }
}
```

### POST /coding/submit
Submit final solution.

**Request:**
```json
{
  "problemId": 1,
  "language": "python",
  "code": "def two_sum(nums, target):\n    return [0, 1]"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "accepted",
    "score": 100,
    "runtime": "2ms",
    "memory": "14.2MB",
    "rank": "Better than 95% of submissions"
  }
}
```

## MCQ Tests

### GET /mcq/categories
Get available MCQ categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "data_structures",
      "name": "Data Structures",
      "questionCount": 150,
      "difficulty": "Mixed"
    }
  ]
}
```

### POST /mcq/sessions
Start new MCQ test session.

**Request:**
```json
{
  "categories": ["data_structures", "algorithms"],
  "difficulty": "medium",
  "company": "google",
  "questionCount": 20,
  "timeLimit": 1200
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "questions": [
      {
        "id": 1,
        "type": "single",
        "category": "Data Structures",
        "difficulty": "Medium",
        "question": "What is the time complexity...",
        "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        "company": "Google"
      }
    ],
    "timeLimit": 1200
  }
}
```

### POST /mcq/sessions/{sessionId}/submit
Submit MCQ test answers.

**Request:**
```json
{
  "answers": {
    "1": [1],
    "2": [0, 2, 3]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": {
      "correct": 18,
      "total": 20,
      "percentage": 90
    },
    "categoryBreakdown": {
      "data_structures": { "correct": 8, "total": 10 },
      "algorithms": { "correct": 10, "total": 10 }
    },
    "detailedResults": [
      {
        "questionId": 1,
        "correct": true,
        "userAnswer": [1],
        "correctAnswer": [1],
        "explanation": "In a balanced BST..."
      }
    ]
  }
}
```

## File Upload

### POST /upload
Upload resume or job description files.

**Request:** FormData with file

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "filename": "resume.pdf",
    "extractedText": "John Doe\nSoftware Engineer...",
    "fileType": "pdf",
    "size": 156789
  }
}
```

## Health Check

### GET /health
Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "services": {
      "database": "connected",
      "ai_services": "operational",
      "code_execution": "ready"
    }
  }
}
```

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "resume",
      "reason": "Field is required"
    }
  }
}
```

## Rate Limiting

- 100 requests per minute per IP for general endpoints
- 10 requests per minute for code execution endpoints
- 5 requests per minute for AI evaluation endpoints