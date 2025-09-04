import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading";
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Upload, 
  FileText, 
  Timer,
  MessageCircle,
  Play,
  Pause
} from "lucide-react";

interface MockInterviewProps {
  onBack: () => void;
}

type InterviewStage = 'setup' | 'active' | 'complete';

export const MockInterview = ({ onBack }: MockInterviewProps) => {
  const [stage, setStage] = useState<InterviewStage>('setup');
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [resume, setResume] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [transcribedText, setTranscribedText] = useState<string>('');

  const sampleQuestions = [
    "Tell me about yourself and your background in software development.",
    "Describe a challenging project you worked on and how you overcame the difficulties.",
    "How do you approach debugging complex issues in your code?",
    "Explain the concept of microservices and when you would use them.",
    "What's your experience with agile development methodologies?",
    "How do you ensure code quality in a team environment?",
    "Describe a time when you had to learn a new technology quickly.",
    "How do you handle technical debt in your projects?"
  ];

  const currentQuestion = sampleQuestions[currentQuestionIndex];

  useEffect(() => {
    if (stage === 'active' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setStage('complete');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [stage, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((1800 - timeRemaining) / 1800) * 100;

  const handleStartInterview = () => {
    if (!resume.trim() || !jobDescription.trim()) {
      alert('Please provide both resume and job description to continue.');
      return;
    }
    setStage('active');
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < sampleQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTranscribedText('');
    } else {
      setStage('complete');
    }
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold gradient-text">AI Mock Interview</h1>
          <p className="text-muted-foreground">Get personalized interview questions based on your profile</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resume Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your resume content or key highlights here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              className="min-h-32 resize-none"
            />
            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Resume (PDF/DOCX)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste the job description for the role you're applying to..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-32 resize-none"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-card-border">
        <CardHeader>
          <CardTitle>Camera & Microphone Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center text-muted-foreground">
            {isCameraOn ? (
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-2" />
                <p>Camera Preview Active</p>
              </div>
            ) : (
              <div className="text-center">
                <CameraOff className="w-12 h-12 mx-auto mb-2" />
                <p>Camera Off</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button
              variant={isCameraOn ? "default" : "outline"}
              onClick={() => setIsCameraOn(!isCameraOn)}
              className="gap-2"
            >
              {isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
              {isCameraOn ? 'Camera On' : 'Enable Camera'}
            </Button>
            
            <Button
              variant={isRecording ? "destructive" : "outline"}
              onClick={() => setIsRecording(!isRecording)}
              className="gap-2"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Mute Mic' : 'Test Microphone'}
            </Button>
          </div>

          <div className="text-center pt-4">
            <Button
              size="lg"
              onClick={handleStartInterview}
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-8"
              disabled={!resume.trim() || !jobDescription.trim()}
            >
              {!resume.trim() || !jobDescription.trim() ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Please fill all fields
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Interview (30 min)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderActive = () => (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="default" className="bg-success text-success-foreground">
            <div className="w-2 h-2 bg-success-foreground rounded-full mr-2 animate-pulse"></div>
            LIVE INTERVIEW
          </Badge>
          <div className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {sampleQuestions.length}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Timer className="w-4 h-4" />
            {formatTime(timeRemaining)}
          </div>
          <Button
            variant="destructive"
            onClick={() => setStage('complete')}
            size="sm"
          >
            End Interview
          </Button>
        </div>
      </div>

      <Progress value={progress} className="mb-8" />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Video and Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border">
            <CardContent className="p-6">
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-muted-foreground">
                  <Camera className="w-16 h-16 mx-auto mb-4" />
                  <p>Interview Camera View</p>
                  <p className="text-sm">You look great! Keep eye contact</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={() => setIsRecording(!isRecording)}
                  size="lg"
                  className="gap-2"
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  {isRecording ? 'Mute' : 'Speak'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Question */}
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-xl">Current Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed mb-6">{currentQuestion}</p>
              
              <div className="flex gap-4">
                <Button
                  onClick={handleNextQuestion}
                  className="bg-primary hover:bg-primary-hover"
                >
                  Next Question
                </Button>
                <Button variant="outline">
                  Need a Hint?
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Sidebar */}
        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Live Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-code-bg border border-code-border rounded-lg p-4 min-h-32 max-h-64 overflow-y-auto">
                {transcribedText || (
                  <p className="text-muted-foreground text-sm">
                    Start speaking to see live transcription...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Interview Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Take your time to think before answering
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Use specific examples from your experience
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Maintain eye contact with the camera
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  Speak clearly and at a moderate pace
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-4xl mx-auto p-6 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Interview Complete!</h1>
        <p className="text-muted-foreground text-lg">
          Great job! Your AI-powered interview analysis is ready.
        </p>
      </div>

      <Card className="border-card-border mb-8">
        <CardHeader>
          <CardTitle>Interview Performance Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-6xl font-bold gradient-text mb-4">7.2/10</div>
          <p className="text-muted-foreground mb-6">
            Above average performance with room for improvement
          </p>
          
          <div className="grid md:grid-cols-4 gap-4 text-center">
            {[
              { category: 'Communication', score: 8.1 },
              { category: 'Technical Knowledge', score: 7.5 },
              { category: 'Confidence', score: 6.8 },
              { category: 'Relevance', score: 6.4 }
            ].map((item) => (
              <div key={item.category} className="p-4 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-primary">{item.score}</div>
                <div className="text-sm text-muted-foreground">{item.category}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button onClick={onBack} variant="outline" size="lg">
          Back to Dashboard
        </Button>
        <Button onClick={() => setStage('setup')} size="lg" className="bg-primary hover:bg-primary-hover">
          Take Another Interview
        </Button>
      </div>
    </div>
  );

  switch (stage) {
    case 'setup':
      return renderSetup();
    case 'active':
      return renderActive();
    case 'complete':
      return renderComplete();
    default:
      return renderSetup();
  }
};