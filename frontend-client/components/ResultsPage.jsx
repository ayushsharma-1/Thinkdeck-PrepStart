'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Star, 
  Clock, 
  User, 
  Briefcase,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Download,
  Share2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const ResultsPage = ({ onRestart, onExit }) => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [violations, setViolations] = useState({ tabSwitch: 0, permissionDenied: 0 });

  useEffect(() => {
    loadResults();
    loadViolations();
  }, []);

  const loadResults = () => {
    try {
      const storedResults = localStorage.getItem('interviewResults');
      if (storedResults) {
        setResults(JSON.parse(storedResults));
      } else {
        // Fallback mock results
        setResults({
          overallScore: 7.5,
          skillScores: {
            technical: 8,
            communication: 7,
            problemSolving: 8,
            culturalFit: 7
          },
          strengths: [
            'Strong technical knowledge',
            'Clear communication',
            'Good problem-solving approach'
          ],
          improvements: [
            'Could elaborate more on past experiences',
            'Consider asking more questions about the role'
          ],
          feedback: 'Great interview performance! You demonstrated solid technical skills and communicated your thoughts clearly. With some minor improvements in storytelling and engagement, you\'ll be even stronger in future interviews.',
          interviewDuration: '28 minutes 45 seconds',
          questionsAnswered: 8,
          responseQuality: 'Good'
        });
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load interview results');
    } finally {
      setIsLoading(false);
    }
  };

  const loadViolations = () => {
    try {
      const storedViolations = localStorage.getItem('interviewViolations');
      if (storedViolations) {
        setViolations(JSON.parse(storedViolations));
      }
    } catch (error) {
      console.error('Error loading violations:', error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const getOverallRating = (score) => {
    if (score >= 9) return { label: 'Excellent', icon: Award, color: 'text-green-600' };
    if (score >= 8) return { label: 'Very Good', icon: TrendingUp, color: 'text-green-600' };
    if (score >= 7) return { label: 'Good', icon: CheckCircle, color: 'text-blue-600' };
    if (score >= 6) return { label: 'Fair', icon: TrendingDown, color: 'text-yellow-600' };
    return { label: 'Needs Improvement', icon: XCircle, color: 'text-red-600' };
  };

  const downloadResults = () => {
    try {
      const resultsData = {
        ...results,
        violations,
        generatedAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(resultsData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `interview-results-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Results downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download results');
    }
  };

  const shareResults = () => {
    try {
      const shareText = `Interview Results: ${results.overallScore}/10 overall score. Areas of strength: ${results.strengths.join(', ')}. Completed via PrepStart AI.`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Interview Results - PrepStart AI',
          text: shareText,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success('Results copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share results');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Generating your interview results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-gray-600 mb-4">Interview results could not be loaded.</p>
            <Button onClick={onRestart}>Start New Interview</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rating = getOverallRating(results.overallScore);
  const RatingIcon = rating.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <RatingIcon className={`w-16 h-16 ${rating.color}`} />
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Interview Complete!
            </CardTitle>
            <CardDescription className="text-xl text-gray-600 mt-2">
              Here's your detailed performance analysis
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="text-center">
              <div className="text-6xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {results.overallScore}/10
              </div>
              <Badge variant={getScoreBadgeVariant(results.overallScore)} className="text-lg px-4 py-2">
                {rating.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Skill Breakdown */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
                Skill Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(results.skillScores).map(([skill, score]) => (
                <div key={skill} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant={getScoreBadgeVariant(score)}>
                      {score}/10
                    </Badge>
                  </div>
                  <Progress value={score * 10} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Interview Stats */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Clock className="w-6 h-6 mr-2 text-green-600" />
                Interview Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.interviewDuration}</div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.questionsAnswered}</div>
                  <div className="text-sm text-gray-600">Questions Answered</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{results.responseQuality}</div>
                  <div className="text-sm text-gray-600">Response Quality</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${violations.tabSwitch + violations.permissionDenied === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {violations.tabSwitch + violations.permissionDenied}
                  </div>
                  <div className="text-sm text-gray-600">Violations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Strengths */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-green-600">
                <CheckCircle className="w-6 h-6 mr-2" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-orange-600">
                <TrendingUp className="w-6 h-6 mr-2" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Feedback */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <User className="w-6 h-6 mr-2 text-blue-600" />
              Detailed Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed text-lg">
                {results.feedback}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Violation Summary */}
        {(violations.tabSwitch > 0 || violations.permissionDenied > 0) && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-red-700">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Interview Violations Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {violations.tabSwitch > 0 && (
                  <p className="text-red-600">• Tab switching detected: {violations.tabSwitch} time(s)</p>
                )}
                {violations.permissionDenied > 0 && (
                  <p className="text-red-600">• Permission violations: {violations.permissionDenied} time(s)</p>
                )}
                <p className="text-red-700 text-sm mt-3">
                  Note: Violations may affect your overall assessment in actual interviews.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={downloadResults}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Results
          </Button>
          
          <Button
            onClick={shareResults}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Results
          </Button>
          
          <Button
            onClick={onRestart}
            size="lg"
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            New Interview
          </Button>
          
          <Button
            onClick={onExit}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
