'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Mic, Monitor, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PreStartPage = ({ permissions, onPermissionsUpdate, onNext }) => {
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  const requestCameraPermission = async () => {
    try {
      setIsCheckingPermissions(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: false 
      });
      
      onPermissionsUpdate({ camera: true });
      toast.success('Camera access granted');
      
      // Stop the stream immediately as we're just checking permissions
      stream.getTracks().forEach(track => track.stop());

      // Mark that the camera was checked and should be opened when interview actually starts
      try {
        sessionStorage.setItem('openCameraOnInterviewStart', 'true');
      } catch (e) {
        // ignore storage errors
      }
    } catch (error) {
      console.error('Camera permission denied:', error);
      onPermissionsUpdate({ camera: false });
      toast.error('Camera access denied. Please allow camera access to continue.');
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      setIsCheckingPermissions(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      onPermissionsUpdate({ microphone: true });
      toast.success('Microphone access granted');
      
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Microphone permission denied:', error);
      onPermissionsUpdate({ microphone: false });
      toast.error('Microphone access denied. Please allow microphone access to continue.');
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const requestScreenPermission = async () => {
    try {
      setIsCheckingPermissions(true);
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices.getDisplayMedia) {
        toast.error('Screen sharing is not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false 
      });
      
      onPermissionsUpdate({ screen: true });
      toast.success('Screen sharing access granted');
      
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Screen sharing permission denied:', error);
      onPermissionsUpdate({ screen: false });
      if (error.name !== 'NotAllowedError') {
        toast.error('Screen sharing access denied or not supported.');
      }
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsCheckingPermissions(true);
    
    // Request camera and microphone together
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      onPermissionsUpdate({ camera: true, microphone: true });
      toast.success('Camera and microphone access granted');
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());

      // Mark that the camera was checked and should be opened when interview actually starts
      try {
        sessionStorage.setItem('openCameraOnInterviewStart', 'true');
      } catch (e) {
        // ignore storage errors
      }
    } catch (error) {
      console.error('Media permission denied:', error);
      toast.error('Please allow camera and microphone access to continue.');
    }

    // Screen sharing is optional
    try {
      if (navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false 
        });
        
        onPermissionsUpdate({ screen: true });
        toast.success('Screen sharing access granted');
        
        screenStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      // Screen sharing is optional, don't show error
      console.log('Screen sharing not granted (optional)');
    }
    
    setIsCheckingPermissions(false);
  };

  const renderPermissionStatus = (hasPermission, label) => {
    if (hasPermission) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        {label} Granted
      </Badge>;
    } else if (hasPermission === false) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        {label} Denied
      </Badge>;
    } else {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        {label} Not Requested
      </Badge>;
    }
  };

  const canProceed = permissions.camera && permissions.microphone;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to PrepStart AI
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Your AI-powered interview preparation platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Permission Setup Required
            </h3>
            <p className="text-gray-600 mb-6">
              To provide you with the best interview experience, we need access to your camera and microphone. 
              Screen sharing is optional but recommended for coding interviews.
            </p>
          </div>

          <div className="grid gap-4">
            {/* Camera Permission */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <Camera className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-800">Camera Access</h4>
                  <p className="text-sm text-gray-600">Required for video interview</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {renderPermissionStatus(permissions.camera, 'Camera')}
                {!permissions.camera && (
                  <Button 
                    size="sm" 
                    onClick={requestCameraPermission}
                    disabled={isCheckingPermissions}
                  >
                    Grant Access
                  </Button>
                )}
              </div>
            </div>

            {/* Microphone Permission */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <Mic className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-800">Microphone Access</h4>
                  <p className="text-sm text-gray-600">Required for audio responses</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {renderPermissionStatus(permissions.microphone, 'Microphone')}
                {!permissions.microphone && (
                  <Button 
                    size="sm" 
                    onClick={requestMicrophonePermission}
                    disabled={isCheckingPermissions}
                  >
                    Grant Access
                  </Button>
                )}
              </div>
            </div>

            {/* Screen Sharing Permission */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <Monitor className="w-6 h-6 text-purple-600" />
                <div>
                  <h4 className="font-medium text-gray-800">Screen Sharing</h4>
                  <p className="text-sm text-gray-600">Optional for coding interviews</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {renderPermissionStatus(permissions.screen, 'Screen')}
                {!permissions.screen && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={requestScreenPermission}
                    disabled={isCheckingPermissions}
                  >
                    Grant Access
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              onClick={requestAllPermissions}
              disabled={isCheckingPermissions || canProceed}
              className="flex-1"
              size="lg"
            >
              {isCheckingPermissions ? 'Checking Permissions...' : 'Grant All Permissions'}
            </Button>
            
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              Continue to Interview Rules
            </Button>
          </div>

          {!canProceed && (
            <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-amber-800">
                Camera and microphone access are required to proceed with the interview.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreStartPage;
