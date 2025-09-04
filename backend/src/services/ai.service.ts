import OpenAI from 'openai';
import { logger } from './logger.service';
import { createError } from '@/middleware/error.middleware';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class AIService {
  // Generate interview questions based on resume and job description
  async generateInterviewQuestions(resumeText: string, jobDescription: string, company?: string): Promise<string[]> {
    try {
      const prompt = `
Based on the following resume and job description, generate 8-10 relevant interview questions that would be appropriate for this candidate and role. Start with "Tell me about yourself" as the first question.

Resume:
${resumeText}

Job Description:
${jobDescription}

${company ? `Company: ${company}` : ''}

Please generate questions that:
1. Start with "Tell me about yourself"
2. Test technical skills relevant to the role
3. Assess experience and background
4. Evaluate problem-solving abilities
5. Check cultural fit
6. Include behavioral questions
7. Are appropriate for the seniority level indicated in the resume

Return only the questions as a JSON array of strings.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer. Generate relevant, insightful interview questions based on the candidate\'s background and the job requirements. Return only a valid JSON array of question strings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        const questions = JSON.parse(content);
        if (!Array.isArray(questions)) {
          throw new Error('Response is not an array');
        }
        return questions;
      } catch (parseError) {
        logger.error('Failed to parse AI response as JSON:', parseError);
        // Fallback: extract questions manually
        return this.extractQuestionsFromText(content);
      }

    } catch (error) {
      logger.error('Error generating interview questions:', error);
      throw createError('Failed to generate interview questions', 500);
    }
  }

  // Evaluate interview answer
  async evaluateAnswer(question: string, answer: string, resumeText?: string, jobDescription?: string): Promise<{
    score: number;
    feedback: string;
    keywords: string[];
  }> {
    try {
      const prompt = `
Evaluate the following interview answer on a scale of 0-10:

Question: ${question}
Answer: ${answer}

${resumeText ? `Candidate Resume Context: ${resumeText.slice(0, 500)}` : ''}
${jobDescription ? `Job Requirements Context: ${jobDescription.slice(0, 500)}` : ''}

Please evaluate based on:
1. Relevance to the question (25%)
2. Technical accuracy (25%)
3. Communication clarity (25%)
4. Depth of knowledge (25%)

Provide a JSON response with:
- score (0-10)
- feedback (constructive feedback, max 150 words)
- keywords (array of key terms/skills mentioned)

Be constructive and specific in your feedback.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer and evaluator. Provide fair, constructive feedback on interview answers. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const evaluation = JSON.parse(content);
      return {
        score: Math.max(0, Math.min(10, evaluation.score || 0)),
        feedback: evaluation.feedback || 'No feedback available',
        keywords: evaluation.keywords || []
      };

    } catch (error) {
      logger.error('Error evaluating answer:', error);
      // Return default evaluation instead of throwing
      return {
        score: 5,
        feedback: 'Unable to evaluate answer at this time. Please try again.',
        keywords: []
      };
    }
  }

  // Generate final interview evaluation
  async generateFinalEvaluation(
    questions: string[],
    answers: string[],
    resumeText?: string,
    jobDescription?: string
  ): Promise<{
    overallScore: number;
    categoryScores: {
      communication: number;
      technical: number;
      confidence: number;
      relevance: number;
    };
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
  }> {
    try {
      const qaContext = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n');

      const prompt = `
Based on the following interview session, provide a comprehensive evaluation:

${qaContext}

${resumeText ? `Candidate Background: ${resumeText.slice(0, 800)}` : ''}
${jobDescription ? `Role Requirements: ${jobDescription.slice(0, 800)}` : ''}

Evaluate the candidate across these dimensions (0-10 scale):
1. Communication: Clarity, articulation, structure
2. Technical: Knowledge depth, problem-solving, technical accuracy
3. Confidence: Self-assurance, handling questions, presence
4. Relevance: Alignment with role requirements, experience fit

Provide a JSON response with:
- overallScore (0-10, weighted average)
- categoryScores (communication, technical, confidence, relevance - each 0-10)
- strengths (array of 2-4 key strengths)
- improvements (array of 2-4 areas for improvement)
- detailedFeedback (comprehensive summary, 200-300 words)

Be constructive, specific, and actionable in your feedback.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a senior technical interviewer providing comprehensive candidate evaluations. Be thorough, fair, and constructive. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const evaluation = JSON.parse(content);
      
      return {
        overallScore: Math.max(0, Math.min(10, evaluation.overallScore || 5)),
        categoryScores: {
          communication: Math.max(0, Math.min(10, evaluation.categoryScores?.communication || 5)),
          technical: Math.max(0, Math.min(10, evaluation.categoryScores?.technical || 5)),
          confidence: Math.max(0, Math.min(10, evaluation.categoryScores?.confidence || 5)),
          relevance: Math.max(0, Math.min(10, evaluation.categoryScores?.relevance || 5))
        },
        strengths: evaluation.strengths || ['Participated in the interview'],
        improvements: evaluation.improvements || ['Practice articulating thoughts clearly'],
        detailedFeedback: evaluation.detailedFeedback || 'Interview completed successfully.'
      };

    } catch (error) {
      logger.error('Error generating final evaluation:', error);
      // Return default evaluation
      return {
        overallScore: 5,
        categoryScores: {
          communication: 5,
          technical: 5,
          confidence: 5,
          relevance: 5
        },
        strengths: ['Participated in the interview process'],
        improvements: ['Practice articulating thoughts more clearly', 'Prepare more specific examples'],
        detailedFeedback: 'The interview was completed. For a detailed evaluation, please ensure all questions are answered clearly and completely.'
      };
    }
  }

  // Helper method to extract questions from unstructured text
  private extractQuestionsFromText(text: string): string[] {
    const questions: string[] = [];
    
    // First, add the standard opening question
    questions.push('Tell me about yourself');
    
    // Try to extract questions using various patterns
    const patterns = [
      /(\d+\.?\s*["\']?([^"'\n]+\?)["\']?)/g,
      /([A-Z][^.!?]*\?)/g,
      /(["\'][^"'\n]+\?["\'])/g
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/^\d+\.?\s*["\']?/, '').replace(/["\']$/, '').trim();
          if (cleaned.length > 10 && cleaned.endsWith('?') && !questions.includes(cleaned)) {
            questions.push(cleaned);
          }
        });
      }
    }

    // If we still don't have enough questions, add some defaults
    const defaultQuestions = [
      'What interests you about this role?',
      'Describe a challenging project you worked on.',
      'How do you handle working under pressure?',
      'Where do you see yourself in 5 years?',
      'Do you have any questions for us?'
    ];

    defaultQuestions.forEach(q => {
      if (questions.length < 8 && !questions.includes(q)) {
        questions.push(q);
      }
    });

    return questions.slice(0, 10); // Limit to 10 questions
  }
}

export const aiService = new AIService();
