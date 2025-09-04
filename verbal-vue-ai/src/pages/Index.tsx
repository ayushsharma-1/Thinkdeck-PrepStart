import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Code2, 
  Brain, 
  MessageSquare, 
  Trophy, 
  Clock, 
  Target,
  Zap,
  BookOpen,
  Users,
  TrendingUp
} from "lucide-react";
import { AssessmentCard } from "@/components/AssessmentCard";
import { MockInterview } from "@/components/MockInterview";
import { CodeEditor } from "@/components/CodeEditor";
import { MCQTest } from "@/components/MCQTest";

type ViewType = 'dashboard' | 'interview' | 'coding' | 'mcq' | 'results';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  const companies = [
    { id: 'all', name: 'All Companies', count: 1250 },
    { id: 'google', name: 'Google', count: 145 },
    { id: 'amazon', name: 'Amazon', count: 198 },
    { id: 'microsoft', name: 'Microsoft', count: 122 },
    { id: 'meta', name: 'Meta', count: 89 },
    { id: 'apple', name: 'Apple', count: 67 },
    { id: 'netflix', name: 'Netflix', count: 45 }
  ];

  const stats = [
    { label: 'Total Questions', value: '2,500+', icon: Target },
    { label: 'Companies', value: '50+', icon: Users },
    { label: 'Success Rate', value: '85%', icon: TrendingUp },
    { label: 'Avg. Score', value: '7.2/10', icon: Trophy }
  ];

  const assessmentTypes = [
    {
      id: 'interview',
      title: 'AI Mock Interview',
      description: 'Practice with AI-powered interviews tailored to your resume and job description',
      icon: MessageSquare,
      duration: '30 min',
      difficulty: 'Adaptive',
      color: 'from-primary via-accent to-primary',
      features: ['Voice Recognition', 'Real-time Feedback', 'Custom Questions', 'Performance Analytics']
    },
    {
      id: 'coding',
      title: 'Coding Challenges',
      description: 'Solve algorithmic problems with our advanced code editor and test runner',
      icon: Code2,
      duration: '45-90 min',
      difficulty: 'Easy to Hard',
      color: 'from-accent via-primary to-accent',
      features: ['Multi-language Support', 'Test Cases', 'Time Complexity', 'Code Optimization']
    },
    {
      id: 'mcq',
      title: 'Technical MCQs',
      description: 'Test your knowledge across various technical domains and concepts',
      icon: Brain,
      duration: '20-45 min',
      difficulty: 'Mixed',
      color: 'from-success via-warning to-success',
      features: ['Multiple Categories', 'Instant Results', 'Explanation', 'Progress Tracking']
    }
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'interview':
        return <MockInterview onBack={() => setCurrentView('dashboard')} />;
      case 'coding':
        return <CodeEditor onBack={() => setCurrentView('dashboard')} />;
      case 'mcq':
        return <MCQTest onBack={() => setCurrentView('dashboard')} />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-5"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Assessment Platform
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Master Your Tech
            <br />
            Interview Skills
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            Practice coding challenges, take mock interviews, and test your technical knowledge 
            with our comprehensive AI-powered platform designed for software engineers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-3 text-lg font-semibold"
              onClick={() => setCurrentView('interview')}
            >
              Start Mock Interview
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-lg font-semibold"
              onClick={() => setCurrentView('coding')}
            >
              Try Coding Challenge
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Filter */}
      <section className="px-6 py-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Your Assessment</h2>
              <p className="text-muted-foreground">Practice with questions from top tech companies</p>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              {companies.map((company) => (
                <Badge
                  key={company.id}
                  variant={selectedCompany === company.id ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-2 transition-all ${
                    selectedCompany === company.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-secondary'
                  }`}
                  onClick={() => setSelectedCompany(company.id)}
                >
                  {company.name} ({company.count})
                </Badge>
              ))}
            </div>
          </div>

          {/* Assessment Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assessmentTypes.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                {...assessment}
                onClick={() => setCurrentView(assessment.id as ViewType)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-secondary/30">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Why Choose Our Platform?</h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Get the edge you need with our comprehensive suite of assessment tools
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Insights',
                description: 'Get personalized feedback and recommendations based on your performance'
              },
              {
                icon: Clock,
                title: 'Real-time Evaluation',
                description: 'Instant scoring and feedback for immediate learning and improvement'
              },
              {
                icon: BookOpen,
                title: 'Comprehensive Coverage',
                description: 'Practice across all technical domains with thousands of curated questions'
              }
            ].map((feature, index) => (
              <Card key={index} className="card-hover border-card-border">
                <CardHeader className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-4 mx-auto">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  return renderCurrentView();
};

export default Index;