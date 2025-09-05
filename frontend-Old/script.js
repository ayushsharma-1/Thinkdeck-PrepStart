class InterviewApp {
    constructor() {
        this.sessionId = null;
        this.currentQuestionIndex = 0;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.socket = null;
        this.currentResponse = '';
        this.resumeText = '';
        this.interviewStartTime = null;
        this.timerInterval = null;
        this.candidateData = {};
        this.jobData = {};
        this.interviewResponses = []; // Store responses locally for AI context
        this.currentQuestion = '';
        
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

        // Setup file upload handler
        document.getElementById('resumeFile').addEventListener('change', this.handleResumeUpload.bind(this));
    }

    showWelcomeScreen() {
        this.showScreen('welcomeScreen');
    }

    showSetupScreen() {
        this.showScreen('setupScreen');
    }

    async handleResumeUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById('resumeStatus');
        statusDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div>Processing resume...';
        
        try {
            const formData = new FormData();
            formData.append('resume', file);

            const response = await fetch('http://localhost:3000/api/upload-resume', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.resumeText = result.resumeText;
                statusDiv.innerHTML = '<div class="text-success"><i class="fas fa-check me-1"></i>Resume processed successfully!</div>';
            } else {
                throw new Error(result.error || 'Failed to process resume');
            }
        } catch (error) {
            console.error('Resume upload error:', error);
            statusDiv.innerHTML = '<div class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Failed to process resume</div>';
        }
    }

    async setupInterview() {
        // Validate required fields
        const name = document.getElementById('candidateName').value.trim();
        const email = document.getElementById('candidateEmail').value.trim();
        const role = document.getElementById('roleName').value.trim();
        
        if (!name || !email || !role || !this.resumeText) {
            this.showError('Please fill in all required fields and upload your resume.');
            return;
        }

        this.showLoading(true);

        try {
            this.candidateData = {
                name,
                email,
                phone: document.getElementById('candidatePhone').value.trim(),
                experience: document.getElementById('candidateExperience').value.trim()
            };

            this.jobData = {
                role_name: role,
                job_description: document.getElementById('jobDescription').value.trim() || `Position: ${role}`
            };

            const response = await fetch('http://localhost:3000/api/setup-interview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...this.candidateData,
                    ...this.jobData,
                    resumeText: this.resumeText
                }),
            });
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            
            // Join socket room
            this.socket.emit('join_session', this.sessionId);
            
            // Show first question
            this.showQuestion(data.firstQuestion, 0);
            this.showScreen('interviewScreen');
            this.startTimer();
            
            // Speak the first question
            this.speakText(data.firstQuestion);
            
        } catch (error) {
            console.error('Error setting up interview:', error);
            this.showError('Failed to setup interview');
        } finally {
            this.showLoading(false);
        }
    }

    startTimer() {
        this.interviewStartTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.interviewStartTime;
            const totalSeconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const remaining = Math.max(0, 30 * 60 - totalSeconds);
            const remainingMinutes = Math.floor(remaining / 60);
            const remainingSeconds = remaining % 60;

            document.getElementById('interviewDuration').textContent = `${minutes} min`;
            document.getElementById('timeRemaining').textContent = 
                `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

            // Update progress bar based on time
            const progress = (totalSeconds / (30 * 60)) * 100;
            document.getElementById('progressBar').style.width = `${Math.min(progress, 100)}%`;

            if (remaining <= 0) {
                this.endInterview();
            }
        }, 1000);
    }

    endInterview() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        // Interview will end naturally through the backend's 30-minute check
    }

    showQuestion(question, index) {
        this.currentQuestionIndex = index;
        this.currentQuestion = question;
        document.getElementById('currentQuestion').textContent = question;
        document.getElementById('currentQuestionNum').textContent = index + 1;
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
        
        // Store response locally for AI context (not in database)
        this.interviewResponses.push({
            question: this.currentQuestion,
            answer: response
        });
        
        this.showLoading(true);
        
        try {
            const result = await fetch('http://localhost:3000/api/submit-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    response: response,
                    currentQuestion: this.currentQuestion,
                    responses: this.interviewResponses // Send live responses for AI context
                }),
            });
            
            const data = await result.json();
            
            if (data.isComplete) {
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                }
                
                document.getElementById('finalDuration').textContent = `${data.duration || 30} minutes`;
                document.getElementById('totalAnswered').textContent = this.interviewResponses.length;
                
                this.showScreen('completionScreen');
            } else {
                this.showQuestion(data.nextQuestion, data.currentIndex);
                this.clearResponse();
                
                // Update time remaining display
                if (data.remainingTime !== undefined) {
                    const minutes = Math.floor(data.remainingTime);
                    const seconds = Math.floor((data.remainingTime - minutes) * 60);
                    document.getElementById('timeRemaining').textContent = 
                        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
                
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
        const screens = ['welcomeScreen', 'setupScreen', 'interviewScreen', 'completionScreen'];
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
        this.resumeText = '';
        this.candidateData = {};
        this.jobData = {};
        this.interviewResponses = []; // Clear local responses
        this.currentQuestion = '';
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.clearResponse();
        
        // Reset form
        document.getElementById('candidateName').value = '';
        document.getElementById('candidateEmail').value = '';
        document.getElementById('candidatePhone').value = '';
        document.getElementById('candidateExperience').value = '';
        document.getElementById('roleName').value = '';
        document.getElementById('jobDescription').value = '';
        document.getElementById('resumeFile').value = '';
        document.getElementById('resumeStatus').innerHTML = '';
        
        this.showScreen('welcomeScreen');
    }

    downloadSummary() {
        // Create interview summary with responses
        const summary = {
            candidate: this.candidateData.name,
            role: this.jobData.role_name,
            date: new Date().toLocaleDateString(),
            duration: document.getElementById('finalDuration').textContent,
            questionsAnswered: this.interviewResponses.length,
            responses: this.interviewResponses
        };
        
        let summaryText = `
Interview Summary
================
Candidate: ${summary.candidate}
Role: ${summary.role}
Date: ${summary.date}
Duration: ${summary.duration}
Questions Answered: ${summary.questionsAnswered}

Interview Q&A:
=============
`;
        
        summary.responses.forEach((qa, index) => {
            summaryText += `\nQ${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}\n`;
        });
        
        summaryText += `\nThis was an AI-powered interview session.\nResume and responses were processed in real-time for dynamic question generation.`;
        
        const blob = new Blob([summaryText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-summary-${summary.candidate.replace(/\s+/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Global functions for HTML onclick events
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new InterviewApp();
});

function showWelcomeScreen() {
    app.showWelcomeScreen();
}

function showSetupScreen() {
    app.showSetupScreen();
}

function setupInterview() {
    app.setupInterview();
}

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

function downloadSummary() {
    app.downloadSummary();
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
