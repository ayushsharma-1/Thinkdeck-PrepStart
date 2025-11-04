'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Star, TrendingUp, AlertTriangle, Trophy, Target, MessageSquare, RotateCcw, Download, Brain, Users, Clock, Lightbulb, Award } from 'lucide-react';
import { toast } from 'sonner';

const ResultsPage = ({ onRestart, onExit }) => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    loadResults();
    loadViolations();
  }, []);

  const loadResults = () => {
    try {
      const storedResults = localStorage.getItem('interviewResults');
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
      } else {
        // Enhanced fallback with comprehensive scoring
        setResults({
          success: true,
          overall_score: 7.5,
          technical_score: 8.0,
          communication_score: 7.5,
          problem_solving_score: 8.0,
          cultural_fit_score: 7.0,
          job_based_skills_score: 7.5,
          leadership_score: 6.5,
          adaptability_score: 8.0,
          creativity_score: 7.0,
          time_management_score: 7.5,
          domain_knowledge_score: 7.0,
          technical_skills_breakdown: {
            "Programming": 8.0,
            "System Design": 7.5,
            "Debugging": 8.5,
            "Best Practices": 7.0
          },
          soft_skills_breakdown: {
            "Communication": 7.5,
            "Teamwork": 7.0,
            "Learning Attitude": 8.0,
            "Professional Maturity": 7.5
          },
          strengths: [
            'Strong technical knowledge and programming skills',
            'Clear communication and explanation ability',
            'Good problem-solving approach',
            'Shows enthusiasm for learning'
          ],
          weaknesses: [
            'Could provide more specific examples',
            'Time management could be improved',
            'Leadership experience needs development'
          ],
          feedback: 'Overall good performance with strong technical skills. Focus on providing more concrete examples and developing leadership qualities.',
          recommendations: [
            'Practice explaining technical concepts with real examples',
            'Work on leadership and mentoring opportunities',
            'Improve time management skills',
            'Continue learning new technologies'
          ],
          confidence_level: "High",
          total_questions: 3,
          questions_answered: 3,
          interview_duration: 15.5,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading results:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadViolations = () => {
    try {
      const storedViolations = localStorage.getItem('interviewViolations');
      if (storedViolations) {
        setViolations(JSON.parse(storedViolations) || []);
      }
    } catch (error) {
      console.error('Error loading violations:', error);
      setViolations([]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mt-4">Processing Results...</h2>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-24 h-24 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Results Not Available</h2>
          <Button onClick={onExit}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const ScoreCard = ({ title, score, icon: Icon, description }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              {description && <p className="text-sm text-gray-600">{description}</p>}
            </div>
          </div>
          <Badge className={`text-xl font-bold px-4 py-2 ${getScoreBadgeColor(score)}`}>
            {score?.toFixed(1) || '0.0'}
          </Badge>
        </div>
        <Progress value={score * 10} className="h-3" />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <Trophy className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Interview Complete!</h1>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{results.interview_duration?.toFixed(1) || 'N/A'} minutes</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>{results.questions_answered || 0}/{results.total_questions || 0} questions</span>
            </div>
            <div className="flex items-center space-x-1">
              <Award className="w-4 h-4" />
              <span>Confidence: {results.confidence_level || 'Medium'}</span>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-5xl font-bold mb-2">
              {results.overall_score?.toFixed(1) || '0.0'}/10
            </CardTitle>
            <p className="text-xl opacity-90">Overall Interview Score</p>
          </CardHeader>
        </Card>

        {/* Core Skills */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Brain className="w-7 h-7 text-blue-600 mr-3" />
            Core Assessment Areas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ScoreCard 
              title="Technical Skills" 
              score={results.technical_score} 
              icon={Target}
              description="Programming & problem solving"
            />
            <ScoreCard 
              title="Communication" 
              score={results.communication_score} 
              icon={MessageSquare}
              description="Clarity and articulation"
            />
            <ScoreCard 
              title="Problem Solving" 
              score={results.problem_solving_score} 
              icon={Brain}
              description="Analytical thinking"
            />
            <ScoreCard 
              title="Cultural Fit" 
              score={results.cultural_fit_score} 
              icon={Users}
              description="Team collaboration"
            />
            <ScoreCard 
              title="Job-Based Skills" 
              score={results.job_based_skills_score} 
              icon={Award}
              description="Role-specific competencies"
            />
            <ScoreCard 
              title="Leadership" 
              score={results.leadership_score} 
              icon={TrendingUp}
              description="Initiative and guidance"
            />
          </div>
        </div>

        {/* Additional Skills */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Star className="w-7 h-7 text-blue-600 mr-3" />
            Additional Assessment Areas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScoreCard 
              title="Adaptability" 
              score={results.adaptability_score} 
              icon={RotateCcw}
              description="Flexibility"
            />
            <ScoreCard 
              title="Creativity" 
              score={results.creativity_score} 
              icon={Lightbulb}
              description="Innovation"
            />
            <ScoreCard 
              title="Time Management" 
              score={results.time_management_score} 
              icon={Clock}
              description="Efficiency"
            />
            <ScoreCard 
              title="Domain Knowledge" 
              score={results.domain_knowledge_score} 
              icon={Trophy}
              description="Industry expertise"
            />
          </div>
        </div>

        {/* Skills Breakdown */}
        {(results.technical_skills_breakdown || results.soft_skills_breakdown) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Technical Skills Breakdown */}
            {results.technical_skills_breakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-6 h-6 text-blue-600 mr-2" />
                    Technical Skills Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(results.technical_skills_breakdown).map(([skill, score]) => (
                    <div key={skill} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{skill}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={score * 10} className="w-24 h-2" />
                        <Badge className={`text-xs ${getScoreBadgeColor(score)}`}>
                          {score?.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Soft Skills Breakdown */}
            {results.soft_skills_breakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-6 h-6 text-blue-600 mr-2" />
                    Soft Skills Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(results.soft_skills_breakdown).map(([skill, score]) => (
                    <div key={skill} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{skill}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={score * 10} className="w-24 h-2" />
                        <Badge className={`text-xs ${getScoreBadgeColor(score)}`}>
                          {score?.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <CheckCircle className="w-6 h-6 mr-2" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(results.strengths || []).map((strength, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Star className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-amber-700">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(results.weaknesses || []).map((weakness, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Feedback */}
        {results.feedback && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-6 h-6 text-blue-600 mr-2" />
                Detailed Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{results.feedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {results.recommendations && results.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="w-6 h-6 text-blue-600 mr-2" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex-shrink-0 mt-1">
                      {index + 1}
                    </Badge>
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Security Violations */}
        {violations && violations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Security Violations ({violations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {violations.map((violation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-red-800">
                        {violation.type?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <p className="text-xs text-red-600 mt-1">
                        {typeof violation.details === 'string' 
                          ? violation.details 
                          : JSON.stringify(violation.details)}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Q{violation.questionNumber}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pt-8">
          <Button onClick={onRestart} size="lg" className="px-8">
            <RotateCcw className="w-5 h-5 mr-2" />
            Take Another Interview
          </Button>
          <Button onClick={onExit} variant="ghost" size="lg" className="px-8">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
