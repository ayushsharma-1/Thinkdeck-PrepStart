from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import pika
import json
import asyncio
import assemblyai as aai
import os
from dotenv import load_dotenv
import base64
import tempfile
from typing import Dict, Optional
import uuid
import PyPDF2
import docx
import google.generativeai as genai
from groq import Groq
from pydantic import BaseModel

load_dotenv()

# AI API Keys configuration  
groq_api_key = os.getenv("GROQ_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")

# Initialize Google Gemini
if google_api_key and google_api_key != "your_google_gemini_api_key_here":
    genai.configure(api_key=google_api_key)

app = FastAPI(title="PrepStart AI Interview - FastAPI Backend")

# Pydantic models
class InterviewSetup(BaseModel):
    name: str
    email: str
    phone: str
    experience: str
    job_description: str
    role_name: str

class QuestionRequest(BaseModel):
    session_id: str
    previous_responses: list
    resume_text: str
    job_description: str
    role_name: str
    question_number: int

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AssemblyAI configuration
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

# AI Question Generator with Groq Primary, Gemini Fallback
class AIQuestionGenerator:
    def __init__(self):
        self.groq_client = None
        
        # Initialize Groq as primary
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and groq_key != "your_groq_api_key_here":
            self.groq_client = Groq(api_key=groq_key)
    
    def extract_text_from_pdf(self, pdf_file):
        """Extract text from PDF file and send to AI"""
        try:
            reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
    
    def extract_text_from_docx(self, docx_file):
        """Extract text from Word document and send to AI"""
        try:
            doc = docx.Document(docx_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            print(f"Error extracting DOCX: {e}")
            return ""
    
    def _try_groq(self, prompt):
        """Try generating question with Groq (Primary)"""
        try:
            if not self.groq_client:
                return None
                
            response = self.groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",  # Updated model
                messages=[
                    {"role": "system", "content": "You are an expert technical interviewer. Generate relevant, engaging interview questions."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq error: {e}")
            return None
    
    def _try_gemini(self, prompt):
        """Try generating question with Google Gemini (Fallback)"""
        try:
            google_key = os.getenv("GOOGLE_API_KEY")
            if not google_key or google_key == "your_google_gemini_api_key_here":
                return None
                
            model = genai.GenerativeModel('gemini-1.5-flash')  # Updated model
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini error: {e}")
            return None
    
    def _get_contextual_fallback_question(self, question_number, role_name, resume_text, job_description, previous_responses):
        """Get contextual fallback questions when all AI services fail"""
        
        # Extract key skills from resume for better context
        resume_lower = resume_text.lower()
        skills_found = []
        common_skills = ['python', 'javascript', 'java', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes', 
                        'machine learning', 'ai', 'data science', 'frontend', 'backend', 'full stack']
        
        for skill in common_skills:
            if skill in resume_lower:
                skills_found.append(skill)
        
        # Context-aware questions based on question number and role
        if question_number == 1:
            return f"Thank you for joining us today! Please introduce yourself and tell me why you're interested in the {role_name} position."
        
        elif question_number == 2 and skills_found:
            return f"I see you have experience with {', '.join(skills_found[:2])}. Can you tell me about a recent project where you used these technologies?"
        
        elif question_number == 3 and 'experience' in resume_lower:
            return f"Based on your background in {role_name}, what's the most challenging problem you've solved recently?"
        
        # Role-specific questions
        elif 'engineer' in role_name.lower() or 'developer' in role_name.lower():
            engineering_questions = [
                f"How do you approach debugging complex issues in {role_name} work?",
                "Tell me about your experience with code reviews and collaboration.",
                "How do you stay updated with the latest technologies in your field?",
                "Describe a time when you had to optimize performance in a project."
            ]
            return engineering_questions[min(question_number - 4, len(engineering_questions) - 1)]
        
        elif 'manager' in role_name.lower() or 'lead' in role_name.lower():
            management_questions = [
                f"How do you handle conflicts within your team as a {role_name}?",
                "Tell me about a time you had to make a difficult decision with limited information.",
                "How do you motivate team members during challenging projects?",
                "Describe your approach to setting and achieving team goals."
            ]
            return management_questions[min(question_number - 4, len(management_questions) - 1)]
        
        # Generic professional questions
        generic_questions = [
            f"What interests you most about working as a {role_name}?",
            "How do you handle working under tight deadlines?",
            "Tell me about a time you had to learn something new quickly.",
            "What are your career goals for the next few years?",
            "How do you handle feedback and criticism in your work?",
            "Describe a situation where you had to work with a difficult colleague.",
            "What motivates you to do your best work?",
            "How do you prioritize tasks when everything seems urgent?",
            "Tell me about a mistake you made and how you handled it.",
            "Do you have any questions about this role or our company?"
        ]
        
        index = min(question_number - 1, len(generic_questions) - 1)
        return generic_questions[index]
    
    def generate_question(self, resume_text: str, job_description: str, role_name: str, 
                         previous_responses: list, question_number: int):
        """Generate dynamic interview question - Resume text is converted and sent to AI"""
        
        # Create context-aware prompt
        if question_number == 1:
            prompt = f"""
            You are conducting a professional job interview for a {role_name} position.
            
            Job Description: {job_description[:500]}...
            
            Generate a welcoming introduction question that:
            1. Thanks the candidate for their time
            2. Asks them to introduce themselves
            3. Relates to the {role_name} position
            
            Keep it professional and conversational. Return only the question.
            """
        else:
            # Send resume text and previous responses to AI for context
            recent_context = previous_responses[-2:] if len(previous_responses) > 2 else previous_responses
            previous_context = "\n".join([f"Q: {resp.get('question', '')} A: {resp.get('answer', '')}" for resp in recent_context])
            
            prompt = f"""
            You are conducting a {role_name} interview. Generate the next question based on:
            
            Candidate's Resume: {resume_text[:800]}...
            Job Requirements: {job_description[:400]}...
            Role: {role_name}
            
            Recent conversation:
            {previous_context}
            
            Generate a follow-up question that:
            1. Builds naturally on their previous responses
            2. Explores skills relevant to {role_name} 
            3. References their resume experience when appropriate
            4. Is engaging and professional
            
            Return only the question.
            """
        
        # Try Groq first (Primary AI)
        question = self._try_groq(prompt)
        if question:
            print("Question generated by Groq AI")
            return question
            
        # Try Google Gemini as fallback
        question = self._try_gemini(prompt)
        if question:
            print("Question generated by Gemini AI (fallback)")
            return question
        
        # All AI services failed - use contextual fallback
        print("All AI services failed, using contextual fallback question")
        return self._get_contextual_fallback_question(question_number, role_name, resume_text, job_description, previous_responses)

ai_generator = AIQuestionGenerator()

# RabbitMQ connection
def get_rabbitmq_connection():
    try:
        connection = pika.BlockingConnection(
            pika.URLParameters(os.getenv("RABBITMQ_URL"))
        )
        return connection
    except Exception as e:
        print(f"RabbitMQ connection failed: {e}")
        return None

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, message: str, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(message)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "PrepStart AI Interview FastAPI Backend"}

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Extract text from uploaded resume (PDF, DOCX, or TXT)"""
    try:
        content = await file.read()
        
        if file.filename.lower().endswith('.pdf'):
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            with open(temp_file_path, 'rb') as pdf_file:
                text = ai_generator.extract_text_from_pdf(pdf_file)
            os.unlink(temp_file_path)
            
        elif file.filename.lower().endswith('.docx'):
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            text = ai_generator.extract_text_from_docx(temp_file_path)
            os.unlink(temp_file_path)
            
        elif file.filename.lower().endswith('.txt'):
            text = content.decode('utf-8')
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")
        
        return {
            "text": text,
            "status": "success",
            "filename": file.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")

@app.post("/generate-question")
async def generate_question(request: QuestionRequest):
    """Generate next interview question based on context"""
    try:
        question = ai_generator.generate_question(
            resume_text=request.resume_text,
            job_description=request.job_description,
            role_name=request.role_name,
            previous_responses=request.previous_responses,
            question_number=request.question_number
        )
        
        return {
            "question": question,
            "question_number": request.question_number,
            "session_id": request.session_id,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate question: {str(e)}")

@app.post("/setup-interview")
async def setup_interview(setup: InterviewSetup):
    """Initialize interview with candidate details"""
    try:
        session_id = str(uuid.uuid4())
        
        # Store interview setup (in production, save to database)
        setup_data = {
            "session_id": session_id,
            "candidate": setup.dict(),
            "created_at": asyncio.get_event_loop().time(),
            "status": "initialized"
        }
        
        return {
            "session_id": session_id,
            "status": "success",
            "message": "Interview setup completed"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(e)}")

@app.post("/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)):
    """Convert uploaded audio to text using AssemblyAI"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(await audio.read())
            temp_file_path = temp_file.name

        # Transcribe using AssemblyAI
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(temp_file_path)
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        if transcript.status == aai.TranscriptStatus.error:
            raise HTTPException(status_code=400, detail=transcript.error)
            
        return {
            "text": transcript.text,
            "confidence": getattr(transcript, 'confidence', 0.0),
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time speech-to-text"""
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive audio data from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "audio_chunk":
                # Process audio chunk (in real implementation, you'd stream to AssemblyAI)
                # For now, we'll just echo back
                await manager.send_message(json.dumps({
                    "type": "transcription",
                    "text": "Processing audio...",
                    "session_id": session_id
                }), session_id)
                
            elif message["type"] == "start_transcription":
                await manager.send_message(json.dumps({
                    "type": "status",
                    "message": "Transcription started",
                    "session_id": session_id
                }), session_id)
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)

def consume_from_rabbitmq():
    """Consumer function to process messages from RabbitMQ"""
    connection = get_rabbitmq_connection()
    if not connection:
        return
        
    channel = connection.channel()
    
    # Declare queues
    channel.queue_declare(queue='speech_to_text_requests', durable=True)
    channel.queue_declare(queue='interview_responses', durable=True)
    
    def callback(ch, method, properties, body):
        try:
            message = json.loads(body)
            print(f"Received message: {message}")
            
            # Process the message (convert speech to text)
            if message.get("type") == "speech_to_text":
                # In real implementation, process the audio data
                response = {
                    "session_id": message.get("session_id"),
                    "transcribed_text": "Sample transcribed text",
                    "status": "completed"
                }
                
                # Send response back to Node.js backend
                channel.basic_publish(
                    exchange='',
                    routing_key='interview_responses',
                    body=json.dumps(response),
                    properties=pika.BasicProperties(delivery_mode=2)
                )
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except Exception as e:
            print(f"Error processing message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    
    channel.basic_consume(queue='speech_to_text_requests', on_message_callback=callback)
    print('Waiting for messages from RabbitMQ...')
    channel.start_consuming()

@app.on_event("startup")
async def startup_event():
    # Start RabbitMQ consumer in background
    import threading
    consumer_thread = threading.Thread(target=consume_from_rabbitmq)
    consumer_thread.daemon = True
    consumer_thread.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
