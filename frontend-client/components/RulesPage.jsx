'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Eye, AlertTriangle, Clock, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const RulesPage = ({ onNext, onBack }) => {
  const [hasReadRules, setHasReadRules] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setTabSwitchCount(prev => prev + 1);
        
        if (tabSwitchCount >= 0) { // Show warning from first tab switch
          toast.error('Tab switching detected! This may be flagged during the actual interview.', {
            duration: 5000,
          });
        }
      } else {
        setIsTabActive(true);
      }
    };

    const handleFocus = () => {
      setIsTabActive(true);
    };

    const handleBlur = () => {
      setIsTabActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [tabSwitchCount]);

  const rules = [
    {
      icon: Eye,
      title: 'Stay Focused',
      description: 'Keep this tab active throughout the interview. Tab switching will be monitored.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: Volume2,
      title: 'Audio & Video',
      description: 'Ensure your microphone and camera remain enabled during the interview.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      icon: Shield,
      title: 'Fair Play',
      description: 'No external assistance, notes, or additional resources during the interview.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      icon: Clock,
      title: 'Time Management',
      description: 'Each question has a time limit. Manage your time effectively.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      icon: AlertTriangle,
      title: 'Technical Issues',
      description: 'If you experience technical difficulties, notify the system immediately.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  const handleContinue = () => {
    if (!hasReadRules) {
      toast.error('Please confirm that you have read and understood the rules.');
      return;
    }
    onNext();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Interview Rules & Guidelines
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Please read these important guidelines carefully before proceeding
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Tab Switch Warning */}
          {tabSwitchCount > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Tab Switch Detected</h4>
                <p className="text-sm text-red-700">
                  You have switched tabs {tabSwitchCount} time(s). This behavior is monitored during actual interviews.
                </p>
              </div>
            </div>
          )}

          {/* Current Tab Status */}
          <div className={`p-3 rounded-lg border flex items-center space-x-3 ${
            isTabActive 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isTabActive ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className={`font-medium ${
              isTabActive ? 'text-green-800' : 'text-red-800'
            }`}>
              Tab Status: {isTabActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Rules Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {rules.map((rule, index) => {
              const Icon = rule.icon;
              return (
                <div
                  key={index}
                  className={`p-6 border rounded-lg ${rule.bgColor} ${rule.borderColor} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-full bg-white ${rule.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-2">{rule.title}</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Important Notes */}
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Important Notes
            </h3>
            <ul className="text-sm text-amber-800 space-y-2">
              <li>• The AI interviewer will ask follow-up questions based on your responses</li>
              <li>• You can ask for clarification if you don't understand a question</li>
              <li>• Take your time to think before answering, but be mindful of time limits</li>
              <li>• Speak clearly and maintain eye contact with the camera</li>
              <li>• The interview session will be recorded for evaluation purposes</li>
            </ul>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <input
              type="checkbox"
              id="rules-agreement"
              checked={hasReadRules}
              onChange={(e) => setHasReadRules(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
            />
            <label htmlFor="rules-agreement" className="text-gray-700 cursor-pointer">
              <span className="font-medium">I acknowledge that I have read and understood all the rules and guidelines.</span>
              <br />
              <span className="text-sm text-gray-600">
                I agree to follow these guidelines during my interview session.
              </span>
            </label>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Back to Permissions
            </Button>
            
            <Button
              onClick={handleContinue}
              disabled={!hasReadRules}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {hasReadRules ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Continue to Setup
                </>
              ) : (
                'Please Accept Rules to Continue'
              )}
            </Button>
          </div>

          {/* Tab Switch Counter */}
          {tabSwitchCount > 0 && (
            <div className="text-center text-sm text-gray-500">
              Tab switches detected: {tabSwitchCount}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RulesPage;
