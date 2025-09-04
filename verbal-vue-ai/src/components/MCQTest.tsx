import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  ArrowLeft as PrevArrow,
  Flag,
  BookOpen,
  Brain
} from "lucide-react";

interface MCQTestProps {
  onBack: () => void;
}

type QuestionType = 'single' | 'multiple';

interface Question {
  id: number;
  type: QuestionType;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
  company: string;
}

export const MCQTest = ({ onBack }: MCQTestProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number[] }>({});
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes
  const [isComplete, setIsComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const questions: Question[] = [
    {
      id: 1,
      type: 'single',
      category: 'Data Structures',
      difficulty: 'Medium',
      question: 'What is the time complexity of searching an element in a balanced binary search tree?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctAnswers: [1],
      explanation: 'In a balanced BST, the height is log n, so searching takes O(log n) time.',
      company: 'Google'
    },
    {
      id: 2,
      type: 'multiple',
      category: 'Algorithms',
      difficulty: 'Hard',
      question: 'Which of the following are characteristics of a good hash function? (Select all that apply)',
      options: [
        'Uniform distribution of hash values',
        'Fast computation',
        'Minimal collisions',
        'Always returns the same output for the same input'
      ],
      correctAnswers: [0, 1, 2, 3],
      explanation: 'All of these are important characteristics of a good hash function.',
      company: 'Amazon'
    },
    {
      id: 3,
      type: 'single',
      category: 'System Design',
      difficulty: 'Easy',
      question: 'What does REST stand for in web development?',
      options: [
        'Representational State Transfer',
        'Remote State Technology',
        'Relational System Transfer',
        'Resource State Transmission'
      ],
      correctAnswers: [0],
      explanation: 'REST stands for Representational State Transfer, an architectural style for web services.',
      company: 'Microsoft'
    },
    {
      id: 4,
      type: 'single',
      category: 'Programming',
      difficulty: 'Medium',
      question: 'In object-oriented programming, what is polymorphism?',
      options: [
        'The ability to create multiple constructors',
        'The ability to inherit from multiple classes',
        'The ability for objects to take multiple forms',
        'The ability to access private variables'
      ],
      correctAnswers: [2],
      explanation: 'Polymorphism is the ability for objects of different types to be treated as objects of a common base type.',
      company: 'Meta'
    },
    {
      id: 5,
      type: 'multiple',
      category: 'Database',
      difficulty: 'Medium',
      question: 'Which of the following are ACID properties in database transactions?',
      options: ['Atomicity', 'Consistency', 'Isolation', 'Durability', 'Accessibility'],
      correctAnswers: [0, 1, 2, 3],
      explanation: 'ACID properties are Atomicity, Consistency, Isolation, and Durability. Accessibility is not part of ACID.',
      company: 'Apple'
    }
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  useEffect(() => {
    if (!isComplete && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isComplete, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSingleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: [optionIndex]
    }));
  };

  const handleMultipleAnswer = (optionIndex: number, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = prev[currentQuestion.id] || [];
      if (checked) {
        return {
          ...prev,
          [currentQuestion.id]: [...currentAnswers, optionIndex].sort()
        };
      } else {
        return {
          ...prev,
          [currentQuestion.id]: currentAnswers.filter(ans => ans !== optionIndex)
        };
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsComplete(true);
    setShowResults(true);
  };

  const calculateResults = () => {
    let correct = 0;
    let total = questions.length;

    questions.forEach(question => {
      const userAnswer = answers[question.id] || [];
      const correctAnswer = question.correctAnswers;
      
      if (JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort())) {
        correct++;
      }
    });

    return { correct, total, percentage: (correct / total) * 100 };
  };

  const results = calculateResults();

  if (isComplete && showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-4">Test Complete!</h1>
          <p className="text-muted-foreground text-lg">
            Here's how you performed on the technical assessment
          </p>
        </div>

        <Card className="border-card-border mb-8">
          <CardHeader>
            <CardTitle className="text-center">Your Score</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-6xl font-bold gradient-text mb-4">
              {results.correct}/{results.total}
            </div>
            <div className="text-2xl text-muted-foreground mb-6">
              {results.percentage.toFixed(1)}% Correct
            </div>
            <Progress value={results.percentage} className="max-w-md mx-auto mb-6" />
            
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-success">{results.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-destructive">{results.total - results.correct}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-primary">{formatTime(1200 - timeRemaining)}</div>
                <div className="text-sm text-muted-foreground">Time Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Card className="border-card-border mb-8">
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => {
                const userAnswer = answers[question.id] || [];
                const isCorrect = JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correctAnswers.sort());
                
                return (
                  <div key={question.id} className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">Question {index + 1}</span>
                        <Badge variant="outline" className="text-xs">{question.category}</Badge>
                        <Badge variant="outline" className="text-xs">{question.company}</Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-2">{question.question}</p>
                    
                    <div className="text-sm text-muted-foreground">
                      <div>Your answer: {userAnswer.length > 0 ? userAnswer.map(i => question.options[i]).join(', ') : 'No answer'}</div>
                      <div>Correct answer: {question.correctAnswers.map(i => question.options[i]).join(', ')}</div>
                      <div className="mt-2 text-foreground">{question.explanation}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button onClick={onBack} variant="outline" size="lg">
            Back to Dashboard
          </Button>
          <Button onClick={() => window.location.reload()} size="lg" className="bg-primary hover:bg-primary-hover">
            Take Another Test
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete && !showResults) {
    setShowResults(true);
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Technical MCQ Test</h1>
            <p className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            {formatTime(timeRemaining)}
          </div>
          <Button
            onClick={handleFinish}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Flag className="w-4 h-4" />
            Finish Test
          </Button>
        </div>
      </div>

      <Progress value={progress} className="mb-8" />

      {/* Question Card */}
      <Card className="border-card-border mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <CardTitle className="text-xl">
                Question {currentQuestionIndex + 1}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {currentQuestion.category}
              </Badge>
              <Badge 
                variant={currentQuestion.difficulty === 'Easy' ? 'default' : 'destructive'}
                className={currentQuestion.difficulty === 'Easy' ? 'bg-success text-success-foreground text-xs' : 'text-xs'}
              >
                {currentQuestion.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {currentQuestion.company}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed mb-6">{currentQuestion.question}</p>

          {currentQuestion.type === 'single' ? (
            <RadioGroup
              value={answers[currentQuestion.id]?.[0]?.toString() || ""}
              onValueChange={(value) => handleSingleAnswer(parseInt(value))}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-secondary transition-colors">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Select all that apply:
              </p>
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-secondary transition-colors">
                  <Checkbox
                    id={`option-${index}`}
                    checked={answers[currentQuestion.id]?.includes(index) || false}
                    onCheckedChange={(checked) => handleMultipleAnswer(index, checked as boolean)}
                  />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          variant="outline"
          className="gap-2"
        >
          <PrevArrow className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button
              onClick={handleFinish}
              className="gap-2 bg-primary hover:bg-primary-hover"
            >
              <Flag className="w-4 h-4" />
              Finish Test
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="gap-2 bg-primary hover:bg-primary-hover"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card className="border-card-border mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className={`relative ${
                  answers[questions[index].id] && answers[questions[index].id].length > 0
                    ? 'bg-success/20 border-success'
                    : ''
                }`}
              >
                {index + 1}
                {answers[questions[index].id] && answers[questions[index].id].length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full"></div>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};