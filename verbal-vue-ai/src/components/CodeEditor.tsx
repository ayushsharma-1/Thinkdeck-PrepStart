import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading";
import { 
  ArrowLeft, 
  Play, 
  Save, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Star,
  Terminal,
  Code2,
  Lightbulb
} from "lucide-react";

interface CodeEditorProps {
  onBack: () => void;
}

export const CodeEditor = ({ onBack }: CodeEditorProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('# Write your solution here\n\n');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const problem = {
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6", 
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists."
    ],
    companies: ["Amazon", "Google", "Microsoft", "Apple"],
    timeLimit: 45,
    memoryLimit: "256 MB"
  };

  const languages = [
    { id: 'python', name: 'Python', template: '# Write your solution here\n\n' },
    { id: 'javascript', name: 'JavaScript', template: '// Write your solution here\n\n' },
    { id: 'java', name: 'Java', template: 'public class Solution {\n    // Write your solution here\n}\n' },
    { id: 'cpp', name: 'C++', template: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Write your solution here\n};\n' },
    { id: 'c', name: 'C', template: '#include <stdio.h>\n\n// Write your solution here\n\n' }
  ];

  const mockTestResults = [
    { id: 1, input: "[2,7,11,15], 9", expected: "[0,1]", actual: "[0,1]", passed: true, runtime: "2ms" },
    { id: 2, input: "[3,2,4], 6", expected: "[1,2]", actual: "[1,2]", passed: true, runtime: "3ms" },
    { id: 3, input: "[3,3], 6", expected: "[0,1]", actual: "[0,1]", passed: true, runtime: "1ms" }
  ];

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    const template = languages.find(lang => lang.id === language)?.template || '';
    setCode(template);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      // Simulate API call for code execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResults(mockTestResults);
    } catch (error) {
      console.error('Code execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsRunning(true);
    try {
      // Simulate API call for code submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResults(mockTestResults);
      setHasSubmitted(true);
    } catch (error) {
      console.error('Code submission failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const passedTests = testResults.filter(test => test.passed).length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">{problem.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={problem.difficulty === 'Easy' ? 'default' : 'destructive'}
                className={problem.difficulty === 'Easy' ? 'bg-success text-success-foreground' : ''}
              >
                {problem.difficulty}
              </Badge>
              <div className="flex gap-1">
                {problem.companies.map((company, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {company}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {problem.timeLimit} min • {problem.memoryLimit}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Problem Description */}
        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Problem Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">{problem.description}</p>
              
              <div>
                <h4 className="font-semibold mb-3">Examples:</h4>
                <div className="space-y-4">
                  {problem.examples.map((example, index) => (
                    <div key={index} className="bg-code-bg border border-code-border rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div><span className="font-semibold">Input:</span> {example.input}</div>
                        <div><span className="font-semibold">Output:</span> {example.output}</div>
                        <div className="text-muted-foreground">{example.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Constraints:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {problem.constraints.map((constraint, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                      {constraint}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Test Results
                  {hasSubmitted && (
                    <Badge 
                      variant={successRate === 100 ? "default" : "destructive"}
                      className={successRate === 100 ? 'bg-success text-success-foreground ml-2' : 'ml-2'}
                    >
                      {passedTests}/{totalTests} Passed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasSubmitted && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Success Rate</span>
                      <span>{successRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={successRate} className="mb-4" />
                  </div>
                )}
                
                <div className="space-y-3">
                  {testResults.map((test) => (
                    <div 
                      key={test.id}
                      className="flex items-center justify-between p-3 bg-code-bg border border-code-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {test.passed ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <div className="text-sm">
                          <div>Input: {test.input}</div>
                          <div className="text-muted-foreground">Expected: {test.expected}</div>
                          {!test.passed && (
                            <div className="text-destructive">Got: {test.actual}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {test.runtime}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Code Editor */}
        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Code Editor
                </CardTitle>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="code-editor min-h-96 resize-none font-mono text-sm"
                placeholder="Write your solution here..."
              />
              
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  {isRunning ? <LoadingSpinner size="sm" /> : <Play className="w-4 h-4" />}
                  {isRunning ? 'Running...' : 'Run Code'}
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  disabled={isRunning}
                  className="flex-1 gap-2 bg-primary hover:bg-primary-hover"
                >
                  {isRunning ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                  {isRunning ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Success Message */}
          {hasSubmitted && successRate === 100 && (
            <Card className="border-success bg-success/5">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-success mb-2">
                  Accepted! 🎉
                </h3>
                <p className="text-muted-foreground">
                  Great job! Your solution passed all test cases.
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <Button onClick={onBack} variant="outline">
                    Back to Dashboard
                  </Button>
                  <Button className="bg-primary hover:bg-primary-hover">
                    Next Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};