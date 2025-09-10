'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Briefcase,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const SetupPage = ({ sessionData, onSessionDataUpdate, onNext, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    onSessionDataUpdate({ [field]: value });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create FormData to send file to backend for processing
      const formData = new FormData();
      formData.append('resume', file);
      
      // Send file to backend server for text extraction
      const response = await fetch('http://localhost:5000/api/upload-resume', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to process resume');
      }
      
      if (result.success && result.resumeText) {
        // Store both file info and extracted text
        onSessionDataUpdate({ 
          resume: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            url: URL.createObjectURL(file)
          },
          resumeText: result.resumeText // Store extracted text for AI processing
        });
        
        toast.success('Resume uploaded and processed successfully');
      } else {
        throw new Error('Failed to extract text from resume');
      }
    } catch (error) {
      console.error('Resume upload failed:', error);
      toast.error(`Resume upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const removeResume = () => {
    onSessionDataUpdate({ resume: null, resumeText: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Resume removed');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!sessionData.fullName || sessionData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }
    
    if (!sessionData.email || !/\S+@\S+\.\S+/.test(sessionData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!sessionData.phone || sessionData.phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!sessionData.jobTitle || sessionData.jobTitle.trim().length < 2) {
      newErrors.jobTitle = 'Job title is required';
    }
    
    if (!sessionData.company || sessionData.company.trim().length < 2) {
      newErrors.company = 'Company name is required';
    }
    
    if (!sessionData.jobDescription || sessionData.jobDescription.trim().length < 50) {
      newErrors.jobDescription = 'Job description must be at least 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    setIsLoading(true);
    
    try {
      // Here you would typically send the form data to your backend
      // For now, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Setup completed successfully');
      onNext();
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Interview Setup
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Please provide your details to personalize your interview experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <User className="w-6 h-6 mr-2 text-blue-600" />
              Personal Information
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={sessionData.fullName || ''}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.fullName}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={sessionData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={sessionData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Job Information Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <Briefcase className="w-6 h-6 mr-2 text-green-600" />
              Job Information
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="e.g., Software Engineer"
                  value={sessionData.jobTitle || ''}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  className={errors.jobTitle ? 'border-red-500' : ''}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.jobTitle}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="e.g., Google"
                  value={sessionData.company || ''}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className={errors.company ? 'border-red-500' : ''}
                />
                {errors.company && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.company}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description *</Label>
              <textarea
                id="jobDescription"
                rows="4"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.jobDescription ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Paste the complete job description here. This helps our AI tailor questions to the specific role..."
                value={sessionData.jobDescription || ''}
                onChange={(e) => handleInputChange('jobDescription', e.target.value)}
              />
              {errors.jobDescription && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.jobDescription}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Character count: {(sessionData.jobDescription || '').length} (minimum 50 required)
              </p>
            </div>
          </div>

          {/* Resume Upload Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-purple-600" />
              Resume Upload
            </h3>
            
            {!sessionData.resume ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">
                  Upload Your Resume
                </h4>
                <p className="text-gray-500 mb-4">
                  Drag and drop or click to select your resume (PDF or Word document)
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="mb-2"
                >
                  {isLoading ? 'Uploading...' : 'Choose File'}
                </Button>
                <p className="text-xs text-gray-400">
                  Maximum file size: 5MB
                </p>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800">{sessionData.resume.name}</h4>
                    <p className="text-sm text-green-600">
                      {formatFileSize(sessionData.resume.size)} • Uploaded successfully
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeResume}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <div className="flex space-x-2">
              <Badge variant={sessionData.fullName && sessionData.email && sessionData.phone ? "default" : "secondary"}>
                Personal Info
              </Badge>
              <Badge variant={sessionData.jobTitle && sessionData.company && sessionData.jobDescription ? "default" : "secondary"}>
                Job Details
              </Badge>
              <Badge variant={sessionData.resume ? "default" : "secondary"}>
                Resume (Optional)
              </Badge>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1"
              size="lg"
              disabled={isLoading}
            >
              Back to Rules
            </Button>
            
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {isLoading ? (
                'Setting up...'
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Start Interview
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPage;
