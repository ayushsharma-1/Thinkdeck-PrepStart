import os
import asyncio
import time
from typing import Optional, List, Dict, Any
from groq import Groq
import google.generativeai as genai
from utils.logger import setup_logger

logger = setup_logger(__name__)

class AIService:
    """Service for interacting with AI providers - Groq primary, Gemini fallback"""
    
    def __init__(self):
        # Initialize Groq client
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            self.groq_client = Groq(api_key=groq_api_key)
            self.groq_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            self.has_groq = True
            logger.info("AI Service initialized with Groq")
        else:
            self.groq_client = None
            self.has_groq = False
            logger.warning("Groq API key not provided")
        
        # Initialize Google AI client
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if google_api_key:
            genai.configure(api_key=google_api_key)
            self.google_model = genai.GenerativeModel(os.getenv("GOOGLE_MODEL", "gemini-1.5-flash"))
            self.has_google = True
            logger.info("AI Service initialized with Google AI as fallback")
        else:
            self.google_model = None
            self.has_google = False
            logger.warning("Google API key not provided")

    async def generate_question(
        self, 
        resume_text: str, 
        job_description: str, 
        role_name: str,
        question_number: int,
        previous_responses: Optional[List[Dict]] = None,
        covered_topics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate question using available AI provider"""
        
        # Try Groq first
        if self.has_groq:
            try:
                return await self._generate_question_groq(
                    resume_text, job_description, role_name, 
                    question_number, previous_responses, covered_topics
                )
            except Exception as e:
                logger.error(f"Groq generation failed: {str(e)}")
                
        # Fallback to Google AI
        if self.has_google:
            try:
                return await self._generate_question_google(
                    resume_text, job_description, role_name, 
                    question_number, previous_responses, covered_topics
                )
            except Exception as e:
                logger.error(f"Google AI generation failed: {str(e)}")
        
        # Fallback to mock response
        logger.warning("All AI providers failed, using mock response")
        return self._mock_question_response(role_name, question_number)

    async def _generate_question_groq(
        self, 
        resume_text: str, 
        job_description: str, 
        role_name: str,
        question_number: int,
        previous_responses: Optional[List[Dict]] = None,
        covered_topics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate question using Groq API"""
        
        prompt = self._build_question_prompt(
            resume_text, job_description, role_name, 
            question_number, previous_responses, covered_topics
        )
        
        completion = self.groq_client.chat.completions.create(
            model=self.groq_model,
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        response_text = completion.choices[0].message.content
        return self._parse_question_response(response_text, "groq")

    async def _generate_question_google(
        self, 
        resume_text: str, 
        job_description: str, 
        role_name: str,
        question_number: int,
        previous_responses: Optional[List[Dict]] = None,
        covered_topics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate question using Google AI"""
        
        prompt = self._build_question_prompt(
            resume_text, job_description, role_name, 
            question_number, previous_responses, covered_topics
        )
        
        response = await self.google_model.generate_content_async(prompt)
        return self._parse_question_response(response.text, "google")

    def _build_question_prompt(
        self, 
        resume_text: str, 
        job_description: str, 
        role_name: str,
        question_number: int,
        previous_responses: Optional[List[Dict]] = None,
        covered_topics: Optional[List[str]] = None
    ) -> str:
        """Build prompt for question generation"""
        
        # Handle first question as introduction
        if question_number == 1:
            prompt = f"""
You are conducting a REMOTE VIDEO interview for the {role_name} position.

STRICT REQUIREMENTS:
- This is a REMOTE interview, never mention "office", "in-person", or physical location
- Generate ONLY ONE concise introduction question
- Keep it professional but friendly for a video call
- Mention the specific role: {role_name}
- Ask candidate to introduce themselves and their interest in the role

FORBIDDEN WORDS: office, building, location, in-person, physical, venue, workplace, premises, facility

Generate exactly one question following this pattern:
"Hello! I'm excited to interview you today for the [role] position. Can you tell me about yourself and why you're interested in this role?"

IMPORTANT: Do not use any forbidden words. This is a REMOTE video interview.

Generate ONLY the question, no additional text.
"""
        else:
            # For subsequent questions, use resume + job description pattern
            previous_context = ""
            if previous_responses:
                previous_context = "\nPREVIOUS RESPONSES SUMMARY:\n"
                for resp in previous_responses[-2:]:  # Last 2 responses for context
                    previous_context += f"Q{resp.get('question_number', '')}: {resp.get('response', '')[:200]}...\n"
            
            prompt = f"""
You are an experienced technical interviewer. Based on the candidate's resume, job description, and their previous responses, generate the next interview question.

ROLE: {role_name}
QUESTION NUMBER: {question_number}

CANDIDATE'S RESUME:
{resume_text[:2000]}

JOB DESCRIPTION & REQUIREMENTS:
{job_description[:1500]}
{previous_context}

COVERED TOPICS: {', '.join(covered_topics) if covered_topics else "None yet"}

Generate a relevant interview question that:
1. Builds on their resume/experience mentioned
2. Tests skills required for this specific job
3. Is progressive in difficulty (early questions easier, later ones harder)
4. Avoids repeating covered topics
5. Sounds natural like a real interviewer would ask

IMPORTANT: 
- For questions 2-5: Focus on their background, experience, and basic technical concepts
- For questions 6-10: Dive deeper into technical skills and problem-solving
- For questions 11+: Advanced scenarios, system design, leadership questions

Format your response as just the question, naturally phrased as an interviewer would ask.
"""
        
        return prompt

    def _parse_question_response(self, response_text: str, provider: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        
        try:
            # Clean up the response
            question_text = response_text.strip()
            
            # Remove common AI response prefixes if present
            prefixes_to_remove = [
                "QUESTION:",
                "Question:",
                "Here's the question:",
                "Here's a question:",
                "The question is:",
                "Next question:"
            ]
            
            for prefix in prefixes_to_remove:
                if question_text.startswith(prefix):
                    question_text = question_text[len(prefix):].strip()
                    break
            
            # Determine category and difficulty based on content
            category = "General"
            difficulty = "medium"
            
            # Simple keyword-based categorization
            lower_text = question_text.lower()
            if any(keyword in lower_text for keyword in ['algorithm', 'data structure', 'complexity', 'coding', 'programming']):
                category = "Technical - Programming"
            elif any(keyword in lower_text for keyword in ['system', 'architecture', 'design', 'scale', 'database']):
                category = "Technical - System Design"
            elif any(keyword in lower_text for keyword in ['experience', 'project', 'work', 'tell me about']):
                category = "Experience & Background"
            elif any(keyword in lower_text for keyword in ['leadership', 'team', 'manage', 'conflict']):
                category = "Leadership & Soft Skills"
            
            result = {
                "provider": provider,
                "question": question_text,
                "category": category,
                "difficulty": difficulty,
                "expected_answer": "",
                "raw_response": response_text
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing question response: {str(e)}")
            return {
                "provider": provider,
                "question": response_text.strip() if response_text else "Tell me about your experience with this role.",
                "category": "General",
                "difficulty": "medium",
                "expected_answer": "",
                "raw_response": response_text
            }

    def _mock_question_response(self, role_name: str, question_number: int) -> Dict[str, Any]:
        """Generate mock question when AI providers fail"""
        
        # More contextual mock questions based on question number
        if question_number == 1:
            mock_question = f"Hello! I'm excited to interview you today for the {role_name} position. Let's start with a simple question: Can you tell me about yourself and why you're interested in this role?"
        elif question_number == 2:
            mock_question = f"That's great! Now, can you walk me through your relevant experience for this {role_name} position?"
        elif question_number == 3:
            mock_question = f"Excellent. What technical skills do you have that would be valuable for the {role_name} role?"
        elif question_number == 4:
            mock_question = f"Good to know. Can you describe a challenging project you've worked on and how you approached it?"
        elif question_number == 5:
            mock_question = f"Interesting. How do you stay updated with the latest technologies relevant to {role_name}?"
        else:
            mock_questions = [
                f"What interests you most about working as a {role_name}?",
                f"How would you approach learning new technologies required for this {role_name} position?",
                f"Can you describe your problem-solving process when facing technical challenges?",
                f"What do you think are the most important qualities for a successful {role_name}?",
                f"How do you handle working under pressure or tight deadlines?"
            ]
            question_idx = (question_number - 6) % len(mock_questions)
            mock_question = mock_questions[question_idx]
        
        return {
            "provider": "mock",
            "question": mock_question,
            "category": "General Technical",
            "difficulty": "medium",
            "expected_answer": "Candidate should provide specific examples from their experience",
            "raw_response": f"Mock question {question_number} for {role_name}"
        }

    async def evaluate_answer(
        self,
        question: str,
        answer: str,
        expected_answer: str = "",
        role_name: str = ""
    ) -> Dict[str, Any]:
        """Evaluate candidate answer"""
        
        # Try Groq first
        if self.has_groq:
            try:
                return await self._evaluate_answer_groq(question, answer, expected_answer, role_name)
            except Exception as e:
                logger.error(f"Groq evaluation failed: {str(e)}")
                
        # Fallback to Google AI
        if self.has_google:
            try:
                return await self._evaluate_answer_google(question, answer, expected_answer, role_name)
            except Exception as e:
                logger.error(f"Google AI evaluation failed: {str(e)}")
        
        # Mock evaluation
        return self._mock_evaluation(answer)

    async def _evaluate_answer_groq(
        self, 
        question: str, 
        answer: str, 
        expected_answer: str, 
        role_name: str
    ) -> Dict[str, Any]:
        """Evaluate answer using Groq"""
        
        prompt = f"""
Evaluate this interview answer:

ROLE: {role_name}
QUESTION: {question}
ANSWER: {answer}
EXPECTED: {expected_answer}

Provide evaluation with:
SCORE: [0-10]
STRENGTHS: [What was good]
WEAKNESSES: [What needs improvement]
FEEDBACK: [Constructive feedback]
"""
        
        completion = self.groq_client.chat.completions.create(
            model=self.groq_model,
            messages=[
                {"role": "system", "content": "You are an expert interviewer evaluating candidate responses."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=400
        )
        
        return self._parse_evaluation_response(completion.choices[0].message.content, "groq")

    async def _evaluate_answer_google(
        self, 
        question: str, 
        answer: str, 
        expected_answer: str, 
        role_name: str
    ) -> Dict[str, Any]:
        """Evaluate answer using Google AI"""
        
        prompt = f"""
Evaluate this interview answer:

ROLE: {role_name}
QUESTION: {question}
ANSWER: {answer}
EXPECTED: {expected_answer}

Provide evaluation with:
SCORE: [0-10]
STRENGTHS: [What was good]
WEAKNESSES: [What needs improvement] 
FEEDBACK: [Constructive feedback]
"""
        
        response = await self.google_model.generate_content_async(prompt)
        return self._parse_evaluation_response(response.text, "google")

    def _parse_evaluation_response(self, response_text: str, provider: str) -> Dict[str, Any]:
        """Parse evaluation response"""
        
        try:
            lines = response_text.strip().split('\n')
            result = {
                "provider": provider,
                "score": 5,
                "strengths": [],
                "weaknesses": [],
                "feedback": "",
                "raw_response": response_text
            }
            
            for line in lines:
                if line.startswith("SCORE:"):
                    try:
                        score_text = line.replace("SCORE:", "").strip()
                        result["score"] = int(score_text.split()[0])
                    except:
                        result["score"] = 5
                elif line.startswith("STRENGTHS:"):
                    result["strengths"] = [line.replace("STRENGTHS:", "").strip()]
                elif line.startswith("WEAKNESSES:"):
                    result["weaknesses"] = [line.replace("WEAKNESSES:", "").strip()]
                elif line.startswith("FEEDBACK:"):
                    result["feedback"] = line.replace("FEEDBACK:", "").strip()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse evaluation: {str(e)}")
            return self._mock_evaluation(response_text)

    def _mock_evaluation(self, answer: str) -> Dict[str, Any]:
        """Generate mock evaluation"""
        
        score = min(10, max(1, len(answer.split()) // 10))  # Simple word count scoring
        
        return {
            "provider": "mock",
            "score": score,
            "strengths": ["Answer provided"],
            "weaknesses": ["Could be more detailed"],
            "feedback": "Thank you for your response. Consider providing more specific examples.",
            "raw_response": f"Mock evaluation for {len(answer)} character answer"
        }

    async def evaluate_interview(
        self,
        session_id: str,
        candidate_name: str,
        role_name: str,
        resume_text: str,
        job_description: str,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Evaluate complete interview and provide comprehensive feedback"""
        
        logger.info(f"Starting interview evaluation for session: {session_id}")
        start_time = time.time()
        
        try:
            # Try Groq first
            if self.has_groq:
                try:
                    result = await self._evaluate_interview_groq(
                        candidate_name, role_name, resume_text, job_description, questions, responses
                    )
                    result["processing_time"] = time.time() - start_time
                    return result
                except Exception as e:
                    logger.error(f"Groq interview evaluation failed: {str(e)}")
                    
            # Fallback to Google AI
            if self.has_google:
                try:
                    result = await self._evaluate_interview_google(
                        candidate_name, role_name, resume_text, job_description, questions, responses
                    )
                    result["processing_time"] = time.time() - start_time
                    return result
                except Exception as e:
                    logger.error(f"Google AI interview evaluation failed: {str(e)}")
            
            # Mock evaluation fallback
            return self._mock_interview_evaluation(candidate_name, role_name, responses, start_time)
            
        except Exception as e:
            logger.error(f"Interview evaluation failed: {str(e)}")
            return self._mock_interview_evaluation(candidate_name, role_name, responses, start_time)

    async def _evaluate_interview_groq(
        self,
        candidate_name: str,
        role_name: str,
        resume_text: str,
        job_description: str,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Evaluate interview using Groq API"""
        
        prompt = self._build_evaluation_prompt(
            candidate_name, role_name, resume_text, job_description, questions, responses
        )
        
        completion = self.groq_client.chat.completions.create(
            model=self.groq_model,
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer and talent evaluator with extensive experience in assessing candidates across multiple dimensions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        response_text = completion.choices[0].message.content
        return self._parse_interview_evaluation(response_text, "groq")

    async def _evaluate_interview_google(
        self,
        candidate_name: str,
        role_name: str,
        resume_text: str,
        job_description: str,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Evaluate interview using Google AI"""
        
        prompt = self._build_evaluation_prompt(
            candidate_name, role_name, resume_text, job_description, questions, responses
        )
        
        response = await self.google_model.generate_content_async(prompt)
        response_text = response.text
        return self._parse_interview_evaluation(response_text, "google")

    def _build_evaluation_prompt(
        self,
        candidate_name: str,
        role_name: str,
        resume_text: str,
        job_description: str,
        questions: List[Dict[str, Any]],
        responses: List[Dict[str, Any]]
    ) -> str:
        """Build comprehensive evaluation prompt"""
        
        qa_pairs = []
        for i, (question, response) in enumerate(zip(questions, responses)):
            qa_pairs.append(f"Q{i+1}: {question.get('question', 'Question not available')}")
            qa_pairs.append(f"A{i+1}: {response.get('response', 'No response provided')}")
            qa_pairs.append("")
        
        qa_text = "\n".join(qa_pairs)
        
        prompt = f"""
You are evaluating a technical interview for the position of {role_name}. Please provide a comprehensive evaluation of the candidate.

CANDIDATE: {candidate_name}
POSITION: {role_name}

CANDIDATE'S RESUME:
{resume_text[:2000]}

JOB REQUIREMENTS:
{job_description[:1500]}

INTERVIEW Q&A:
{qa_text[:3000]}

Please evaluate the candidate across the following dimensions and provide scores (0-10):

1. TECHNICAL SKILLS: Knowledge of technologies, problem-solving approach, code quality
2. COMMUNICATION: Clarity of explanation, listening skills, asking relevant questions
3. PROBLEM SOLVING: Analytical thinking, debugging approach, handling complexity
4. CULTURAL FIT: Team collaboration, adaptability, learning mindset

Provide your evaluation in this format:

OVERALL_SCORE: [0-10]
TECHNICAL_SCORE: [0-10]
COMMUNICATION_SCORE: [0-10]
PROBLEM_SOLVING_SCORE: [0-10]
CULTURAL_FIT_SCORE: [0-10]

STRENGTHS:
- [Strength 1]
- [Strength 2]
- [Strength 3]

WEAKNESSES:
- [Weakness 1]
- [Weakness 2]

FEEDBACK:
[Detailed feedback paragraph]

RECOMMENDATIONS:
- [Recommendation 1]
- [Recommendation 2]
"""
        
        return prompt

    def _parse_interview_evaluation(self, response_text: str, provider: str) -> Dict[str, Any]:
        """Parse comprehensive interview evaluation response"""
        
        try:
            result = {
                "provider": provider,
                "overall_score": 5.0,
                "technical_score": 5.0,
                "communication_score": 5.0,
                "problem_solving_score": 5.0,
                "cultural_fit_score": 5.0,
                "strengths": [],
                "weaknesses": [],
                "feedback": "",
                "recommendations": [],
                "detailed_analysis": {},
                "raw_response": response_text
            }
            
            lines = response_text.strip().split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Parse scores
                if line.startswith("OVERALL_SCORE:"):
                    try:
                        result["overall_score"] = float(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        pass
                elif line.startswith("TECHNICAL_SCORE:"):
                    try:
                        result["technical_score"] = float(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        pass
                elif line.startswith("COMMUNICATION_SCORE:"):
                    try:
                        result["communication_score"] = float(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        pass
                elif line.startswith("PROBLEM_SOLVING_SCORE:"):
                    try:
                        result["problem_solving_score"] = float(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        pass
                elif line.startswith("CULTURAL_FIT_SCORE:"):
                    try:
                        result["cultural_fit_score"] = float(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        pass
                
                # Parse sections
                elif line.startswith("STRENGTHS:"):
                    current_section = "strengths"
                elif line.startswith("WEAKNESSES:"):
                    current_section = "weaknesses"
                elif line.startswith("FEEDBACK:"):
                    current_section = "feedback"
                    if ":" in line:
                        result["feedback"] = line.split(":", 1)[1].strip()
                elif line.startswith("RECOMMENDATIONS:"):
                    current_section = "recommendations"
                elif line.startswith("- ") and current_section in ["strengths", "weaknesses", "recommendations"]:
                    item = line[2:].strip()
                    result[current_section].append(item)
                elif current_section == "feedback" and not line.startswith(("STRENGTHS:", "WEAKNESSES:", "RECOMMENDATIONS:")):
                    result["feedback"] += " " + line
            
            # Clean up feedback
            result["feedback"] = result["feedback"].strip()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse interview evaluation: {str(e)}")
            return self._mock_interview_evaluation("Candidate", "Position", [], time.time())

    def _mock_interview_evaluation(self, candidate_name: str, role_name: str, responses: List[Dict], start_time: float) -> Dict[str, Any]:
        """Generate mock interview evaluation"""
        
        num_responses = len(responses)
        avg_response_length = sum(len(r.get('response', '')) for r in responses) / max(1, num_responses)
        
        # Simple scoring based on response count and length
        base_score = min(8.0, max(3.0, (num_responses * 0.8) + (avg_response_length / 100)))
        
        return {
            "provider": "mock",
            "overall_score": round(base_score, 1),
            "technical_score": round(base_score + 0.2, 1),
            "communication_score": round(base_score - 0.1, 1),
            "problem_solving_score": round(base_score + 0.1, 1),
            "cultural_fit_score": round(base_score - 0.2, 1),
            "strengths": [
                "Participated in the interview process",
                "Provided responses to questions",
                "Showed engagement"
            ],
            "weaknesses": [
                "Could provide more detailed technical examples",
                "Consider elaborating on problem-solving approaches"
            ],
            "feedback": f"Thank you {candidate_name} for participating in the {role_name} interview. You provided {num_responses} responses with good engagement. Focus on providing more detailed technical examples in future interviews.",
            "recommendations": [
                "Practice explaining technical concepts in detail",
                "Prepare specific examples from your experience",
                "Research the company and role thoroughly"
            ],
            "detailed_analysis": {
                "total_responses": num_responses,
                "average_response_length": round(avg_response_length, 1),
                "evaluation_method": "automated_mock"
            },
            "processing_time": time.time() - start_time,
            "raw_response": f"Mock evaluation generated for {candidate_name}"
        }
