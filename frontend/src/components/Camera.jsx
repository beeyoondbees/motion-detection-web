// Camera.jsx - Hybrid Mode (Client-Side with Backend Fallback)
// Works independently with MediaPipe in browser
// Dynamic colors + High accuracy + No backend required
import React, { useRef, useEffect, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera as CameraUtils } from '@mediapipe/camera_utils';
import SquatDetector from '../utils/squatDetector';
import VoiceFeedbackHelper from '../utils/voiceFeedback';
import './Camera.css';

const Camera = ({ onSquatUpdate, isPaused }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const squatDetectorRef = useRef(null);
  const voiceHelperRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const isProcessingRef = useRef(false);
  
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing camera...');

  // KEY joints only (matching Kotlin code)
  const keyJointIndices = [
    11, 12, // Shoulders
    13, 14, // Elbows
    15, 16, // Wrists
    23, 24, // Hips
    25, 26, // Knees
    27, 28, // Ankles
    29, 30, // Heels
    31, 32  // Foot indices
  ];

  useEffect(() => {
    // Initialize squat detector and voice helper
    squatDetectorRef.current = new SquatDetector();
    voiceHelperRef.current = new VoiceFeedbackHelper();
    
    console.log('🏋️ Initializing Squat Detector (Client-Side Mode)...');
    setStatusMessage('Loading pose detection model...');

    // Initialize MediaPipe Pose with HIGH ACCURACY settings
    poseRef.current = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    poseRef.current.setOptions({
      modelComplexity: 1,      // 0=Lite, 1=Full, 2=Heavy (1 is good balance)
      smoothLandmarks: true,   // Smooth landmark positions
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.6,  // Higher for better accuracy
      minTrackingConfidence: 0.6    // Higher for stable tracking
    });

    poseRef.current.onResults(onPoseResults);

    // Initialize camera
    if (videoRef.current) {
      setStatusMessage('Starting camera...');
      
      cameraRef.current = new CameraUtils(videoRef.current, {
        onFrame: async () => {
          if (!isProcessingRef.current && videoRef.current && poseRef.current && !isPaused) {
            isProcessingRef.current = true;
            try {
              await poseRef.current.send({ image: videoRef.current });
            } catch (error) {
              console.error('Frame processing error:', error);
            }
            isProcessingRef.current = false;
          }
        },
        width: 1280,
        height: 720
      });
      
      cameraRef.current.start()
        .then(() => {
          console.log('✅ Camera started successfully');
          setIsReady(true);
          setStatusMessage('');
        })
        .catch((error) => {
          console.error('❌ Camera start error:', error);
          setStatusMessage('Camera access denied. Please allow camera permission.');
        });
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (voiceHelperRef.current) {
        voiceHelperRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPoseResults = (results) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    
    const canvasCtx = canvasElement.getContext('2d');

    // Set canvas dimensions
    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;

      if (!isPaused) {
        // Convert landmarks to array format for squat detector
        const landmarksList = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility
        }));

        // Detect squat
        const analysis = squatDetectorRef.current.detectSquat(landmarksList);

        // Check for squat completion and provide voice feedback
        if (squatDetectorRef.current.hasSquatJustCompleted()) {
          const wasPerfect = squatDetectorRef.current.wasLastSquatPerfect();
          const feedback = squatDetectorRef.current.getSquatCompletionFeedback(wasPerfect);
          voiceHelperRef.current.speakImmediate(feedback);
        }

        // Update parent component with squat data
        if (onSquatUpdate) {
          const squatCount = squatDetectorRef.current.getSquatCount();
          const feedbackData = squatDetectorRef.current.getFeedbackData();
          onSquatUpdate({
            squatCount,
            feedbackData,
            analysis
          });
        }

        // Draw pose with dynamic colors
        drawDynamicColorJoints(canvasCtx, landmarks, analysis);
      } else {
        // Draw paused overlay
        drawPausedOverlay(canvasCtx, canvasElement);
      }
    } else {
      // No pose detected
      drawNoPoseDetected(canvasCtx, canvasElement);
    }

    canvasCtx.restore();
  };

  // Draw skeleton and joints with dynamic colors based on form
  const drawDynamicColorJoints = (ctx, landmarks, analysis) => {
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Get form quality indicators
    const checkpoints = analysis.checkpointResults || {};
    const hasIssues = Object.values(checkpoints).some(v => v === true);
    const isSquatting = analysis.isSquatPosition || false;
    const isPerfectForm = isSquatting && !hasIssues;
    
    // Filter connections to only show key joints
    const keyConnections = POSE_CONNECTIONS.filter(([start, end]) => 
      keyJointIndices.includes(start) && keyJointIndices.includes(end)
    );
    
    // Determine skeleton line color based on form
    let lineColor = '#00D4FF'; // Default cyan
    if (isPerfectForm) {
      lineColor = '#00FF00'; // Green for perfect
    } else if (hasIssues && isSquatting) {
      lineColor = '#FFA500'; // Orange for issues
    }
    
    // Draw skeleton connections
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    keyConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      
      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // Draw joints with dynamic colors
    keyJointIndices.forEach((idx) => {
      const landmark = landmarks[idx];
      if (!landmark || landmark.visibility < 0.5) return;
      
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      let fillColor, strokeColor, dotSize;
      
      // Check if this specific joint has an issue
      const hasJointIssue = checkpoints[idx] === true;
      
      if (hasJointIssue) {
        // RED: This joint has a form issue
        fillColor = '#FF4444';
        strokeColor = '#CC0000';
        dotSize = 11; // Larger to draw attention
      } else if (isPerfectForm) {
        // GREEN: Perfect squat form
        fillColor = '#00FF00';
        strokeColor = '#00DD00';
        dotSize = 9;
      } else if (isSquatting) {
        // ORANGE: Squatting but needs improvement
        fillColor = '#FFA500';
        strokeColor = '#FF8C00';
        dotSize = 9;
      } else {
        // YELLOW: Default state (standing)
        fillColor = '#FFFF00';
        strokeColor = '#FFD700';
        dotSize = 9;
      }
      
      // Draw glow effect
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = 12;
      
      // Draw main dot
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Draw border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // White center highlight
      ctx.beginPath();
      ctx.arc(x, y, dotSize * 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw feedback text with dynamic color
    const feedback = analysis.formFeedback || 'Ready to squat';
    ctx.font = 'bold 32px Arial';
    
    if (isPerfectForm) {
      ctx.fillStyle = '#00FF00'; // Green
    } else if (hasIssues) {
      ctx.fillStyle = '#FF4444'; // Red
    } else if (isSquatting) {
      ctx.fillStyle = '#FFA500'; // Orange
    } else {
      ctx.fillStyle = '#FFFFFF'; // White
    }
    
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(feedback, width / 2, 60);
    ctx.fillText(feedback, width / 2, 60);
    
    // Draw angle info at bottom (helpful for debugging/users)
    if (analysis.kneeAngle) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 2;
      
      const angleText = `Knee: ${analysis.kneeAngle.toFixed(0)}° | Hip: ${analysis.hipAngle.toFixed(0)}°`;
      ctx.strokeText(angleText, 15, height - 15);
      ctx.fillText(angleText, 15, height - 15);
    }
  };

  const drawPausedOverlay = (ctx, canvas) => {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Paused text
    ctx.font = 'bold 64px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 3;
    ctx.strokeText('PAUSED', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = '28px Arial';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Click ▶ to resume', canvas.width / 2, canvas.height / 2 + 30);
  };

  const drawNoPoseDetected = (ctx, canvas) => {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Instructions
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    
    ctx.strokeText('Stand in front of camera', canvas.width / 2, canvas.height / 2 - 25);
    ctx.fillText('Stand in front of camera', canvas.width / 2, canvas.height / 2 - 25);
    
    ctx.font = '24px Arial';
    ctx.fillStyle = '#CCCCCC';
    ctx.strokeText('Show your full body in frame', canvas.width / 2, canvas.height / 2 + 25);
    ctx.fillText('Show your full body in frame', canvas.width / 2, canvas.height / 2 + 25);
  };

  const handleReset = () => {
    if (squatDetectorRef.current) {
      squatDetectorRef.current.reset();
      console.log('🔄 Counter reset');
    }
  };

  return (
    <div className="camera-container">
      <video 
        ref={videoRef} 
        className="camera-video"
        style={{ display: 'none' }}
        playsInline
        muted
      />
      <canvas 
        ref={canvasRef} 
        className="camera-canvas"
      />
      
      {/* Status message overlay */}
      {statusMessage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#FFFF00',
          padding: '20px 30px',
          borderRadius: '10px',
          fontSize: '18px',
          textAlign: 'center',
          zIndex: 100
        }}>
          <div style={{ marginBottom: '10px' }}>⏳</div>
          {statusMessage}
        </div>
      )}
      
      {/* Mode indicator - shows client-side mode */}
      {isReady && (
        <div 
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 200, 0, 0.3)',
            padding: '6px 12px',
            borderRadius: '15px',
            zIndex: 100
          }}
        >
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00FF00',
              boxShadow: '0 0 6px #00FF00'
            }}
          />
          <span style={{ color: 'white', fontSize: '11px' }}>
            Ready
          </span>
        </div>
      )}
      
      {/* Reset button */}
      <button 
        className="rotate-button"
        onClick={handleReset}
        title="Reset counter"
      >
        <img 
          src="/assets/icons/ic_rotate_wt.png" 
          alt="Reset" 
          className="reset-icon"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '🔄';
          }}
        />
      </button>
    </div>
  );
};

export default Camera;