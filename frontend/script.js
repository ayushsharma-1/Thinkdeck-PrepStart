class InterviewApp {
    constructor() {
        this.sessionId = null;
        this.currentQuestionIndex = 0;
        this.totalQuestions = 10;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.socket = null;
        this.currentResponse = '';
        
        this.init();
    }

    init() {
        // Initialize Socket.IO connection
        this.socket = io('http://localhost:3000');
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('transcription_result', (data) => {
            this.handleTranscriptionResult(data);
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError('Connection error occurred');
        });
    }

    async startInterview() {
        this.showLoading(true);
        
        try {
            const response = await fetch('http://localhost:3000/api/start-interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            this.totalQuestions = data.totalQuestions;
            
            // Join socket room
            this.socket.emit('join_session', this.sessionId);
            
            // Show first question
            this.showQuestion(data.firstQuestion, 0);
            this.showScreen('interviewScreen');
            
            // Speak the first question
            this.speakText(data.firstQuestion);
            
        } catch (error) {
            console.error('Error starting interview:', error);
            this.showError('Failed to start interview');
        } finally {
            this.showLoading(false);
        }
    }

    showQuestion(question, index) {
        this.currentQuestionIndex = index;
        document.getElementById('currentQuestion').textContent = question;
        document.getElementById('currentQuestionNum').textContent = index + 1;
        document.getElementById('totalQuestions').textContent = this.totalQuestions;
        
        const progress = ((index + 1) / this.totalQuestions) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                this.processAudio();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showError('Could not access microphone');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }

    async processAudio() {
        if (this.audioChunks.length === 0) return;
        
        this.showLoading(true);
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.wav');

            const response = await fetch('http://localhost:3000/api/speech-to-text', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            
            if (result.status === 'success' && result.text) {
                this.currentResponse = result.text;
                document.getElementById('transcribedText').textContent = result.text;
                document.getElementById('textResponse').value = result.text;
            } else {
                this.showError('Could not transcribe audio');
            }
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showError('Failed to process audio');
        } finally {
            this.showLoading(false);
        }
    }

    handleTranscriptionResult(data) {
        if (data.transcribed_text) {
            this.currentResponse = data.transcribed_text;
            document.getElementById('transcribedText').textContent = data.transcribed_text;
            document.getElementById('textResponse').value = data.transcribed_text;
        }
    }

    async submitResponse() {
        const textResponse = document.getElementById('textResponse').value.trim();
        const response = textResponse || this.currentResponse;
        
        if (!response) {
            this.showError('Please provide a response before continuing');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const result = await fetch('http://localhost:3000/api/submit-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    response: response
                }),
            });
            
            const data = await result.json();
            
            if (data.isComplete) {
                this.showScreen('completionScreen');
            } else {
                this.showQuestion(data.nextQuestion, data.currentIndex);
                this.clearResponse();
                
                // Speak the next question
                setTimeout(() => {
                    this.speakText(data.nextQuestion);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error submitting response:', error);
            this.showError('Failed to submit response');
        } finally {
            this.showLoading(false);
        }
    }

    clearResponse() {
        this.currentResponse = '';
        document.getElementById('transcribedText').innerHTML = '<i>Your speech will appear here... or type in the text box above</i>';
        document.getElementById('textResponse').value = '';
    }

    speakQuestion() {
        const question = document.getElementById('currentQuestion').textContent;
        this.speakText(question);
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            // Stop any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            // Add visual feedback
            const avatar = document.getElementById('aiAvatar');
            utterance.onstart = () => avatar.classList.add('speaking');
            utterance.onend = () => avatar.classList.remove('speaking');
            
            speechSynthesis.speak(utterance);
        } else {
            console.warn('Speech synthesis not supported');
        }
    }

    showScreen(screenId) {
        const screens = ['welcomeScreen', 'interviewScreen', 'completionScreen'];
        screens.forEach(screen => {
            document.getElementById(screen).classList.add('d-none');
        });
        document.getElementById(screenId).classList.remove('d-none');
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('d-none');
            overlay.classList.add('d-flex');
        } else {
            overlay.classList.add('d-none');
            overlay.classList.remove('d-flex');
        }
    }

    showError(message) {
        alert(message); // In production, use a proper modal or toast notification
    }

    startNewInterview() {
        this.sessionId = null;
        this.currentQuestionIndex = 0;
        this.clearResponse();
        this.showScreen('welcomeScreen');
    }
}

// Global functions for HTML onclick events
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new InterviewApp();
});

function startInterview() {
    app.startInterview();
}

function toggleRecording() {
    app.toggleRecording();
}

function submitResponse() {
    app.submitResponse();
}

function clearResponse() {
    app.clearResponse();
}

function speakQuestion() {
    app.speakQuestion();
}

function startNewInterview() {
    app.startNewInterview();
}

// Handle text input changes
document.addEventListener('DOMContentLoaded', () => {
    const textResponse = document.getElementById('textResponse');
    if (textResponse) {
        textResponse.addEventListener('input', (e) => {
            const transcribedText = document.getElementById('transcribedText');
            if (e.target.value.trim()) {
                transcribedText.textContent = e.target.value;
                app.currentResponse = e.target.value;
            } else {
                transcribedText.innerHTML = '<i>Your speech will appear here... or type in the text box above</i>';
                app.currentResponse = '';
            }
        });
    }
});
