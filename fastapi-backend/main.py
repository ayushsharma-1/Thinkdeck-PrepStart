from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pika
import json
import asyncio
import assemblyai as aai
import os
from dotenv import load_dotenv
import base64
import tempfile
from typing import Dict
import uuid

load_dotenv()

app = FastAPI(title="PrepStart AI Interview - FastAPI Backend")

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
