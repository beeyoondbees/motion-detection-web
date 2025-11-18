// Camera.jsx - Updated with PNG silhouette for verification
import React, { useRef, useEffect, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera as CameraUtils } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import SquatDetector from '../utils/squatDetector';
import VoiceFeedbackHelper from '../utils/voiceFeedback';
import './Camera.css';

const Camera = ({ onSquatUpdate, isPaused }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPoseVerified, setIsPoseVerified] = useState(false);
  const [showGetReady, setShowGetReady] = useState(false);
  const [verificationFrames, setVerificationFrames] = useState(0);
  const [getReadyFrames, setGetReadyFrames] = useState(0);
  const [silhouetteImage, setSilhouetteImage] = useState(null);
  
  const squatDetectorRef = useRef(null);
  const voiceHelperRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const isProcessingRef = useRef(false);

  const FRAMES_FOR_VERIFICATION = 20;
  const FRAMES_FOR_GET_READY = 60;

  useEffect(() => {
    // Load the silhouette image
    const img = new Image();
    img.src = '/assets/icons/human_silhouette.png';
    img.onload = () => {
      setSilhouetteImage(img);
    };

    squatDetectorRef.current = new SquatDetector();
    voiceHelperRef.current = new VoiceFeedbackHelper();

    poseRef.current = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    poseRef.current.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    poseRef.current.onResults(onPoseResults);

    if (videoRef.current) {
      cameraRef.current = new CameraUtils(videoRef.current, {
        onFrame: async () => {
          if (!isProcessingRef.current && videoRef.current && poseRef.current) {
            isProcessingRef.current = true;
            await poseRef.current.send({ image: videoRef.current });
            isProcessingRef.current = false;
          }
        },
        width: 1280,
        height: 720
      });
      cameraRef.current.start();
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (voiceHelperRef.current) {
        voiceHelperRef.current.stop();
      }
    };
  }, []);

  const onPoseResults = (results) => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;

      if (!isPoseVerified) {
        drawSilhouetteVerification(canvasCtx, canvasElement, landmarks);
        
        const isStanding = checkStandingPosition(landmarks);
        if (isStanding) {
          setVerificationFrames(prev => prev + 1);
          if (verificationFrames >= FRAMES_FOR_VERIFICATION) {
            setIsPoseVerified(true);
            setShowGetReady(true);
            voiceHelperRef.current.speakImmediate("Get ready!");
          }
        } else {
          setVerificationFrames(0);
        }
      }
      else if (showGetReady) {
        drawGetReadyMessage(canvasCtx, canvasElement);
        setGetReadyFrames(prev => prev + 1);
        
        if (getReadyFrames >= FRAMES_FOR_GET_READY) {
          setShowGetReady(false);
        }
      }
      else if (!isPaused) {
        const landmarksList = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility
        }));

        const analysis = squatDetectorRef.current.detectSquat(landmarksList);

        if (squatDetectorRef.current.hasSquatJustCompleted()) {
          const wasPerfect = squatDetectorRef.current.wasLastSquatPerfect();
          const feedback = squatDetectorRef.current.getSquatCompletionFeedback(wasPerfect);
          voiceHelperRef.current.speakImmediate(feedback);
        }

        if (onSquatUpdate) {
          const squatCount = squatDetectorRef.current.getSquatCount();
          const feedbackData = squatDetectorRef.current.getFeedbackData();
          onSquatUpdate({
            squatCount,
            feedbackData,
            analysis
          });
        }

        drawSkeleton(canvasCtx, landmarks, analysis);
      }
      else {
        drawPausedOverlay(canvasCtx, canvasElement);
      }
    } else {
      if (!isPoseVerified) {
        drawNoPostDetected(canvasCtx, canvasElement);
      }
    }

    canvasCtx.restore();
  };

  const checkStandingPosition = (landmarks) => {
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
    const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

    return avgKneeAngle >= 160 && avgHipAngle >= 160;
  };

  const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - 
                    Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  const drawSilhouetteVerification = (ctx, canvas, landmarks) => {
    const isStanding = checkStandingPosition(landmarks);
    
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw silhouette image if loaded
    if (silhouetteImage) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const silhouetteHeight = canvas.height * 0.55;
      const aspectRatio = silhouetteImage.width / silhouetteImage.height;
      const silhouetteWidth = silhouetteHeight * aspectRatio;

      // Apply color tint based on standing position
      ctx.save();
      
      if (isStanding) {
        // Green tint for correct position
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      } else {
        // Gray for not in position
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
      }

      // Draw silhouette
      const x = centerX - silhouetteWidth / 2;
      const y = centerY - silhouetteHeight / 2;
      
      ctx.drawImage(silhouetteImage, x, y, silhouetteWidth, silhouetteHeight);
      
      // Add color overlay
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillRect(x, y, silhouetteWidth, silhouetteHeight);
      
      // Add border/outline
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = isStanding ? '#00FF00' : '#808080';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      
      // Draw outline around silhouette
      ctx.strokeRect(x, y, silhouetteWidth, silhouetteHeight);
      
      ctx.restore();
    }

    // Text instructions
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    
    const message = 'Stand in front of camera';
    ctx.fillText(message, canvas.width / 2, canvas.height - 100);
    
    // Progress indicator
    if (isStanding) {
      const progress = Math.floor(verificationFrames / FRAMES_FOR_VERIFICATION * 100);
      ctx.font = '20px Arial';
      ctx.fillStyle = '#00FF00';
      ctx.fillText(`${progress}%`, canvas.width / 2, canvas.height - 60);
      
      // Progress bar
      const barWidth = 200;
      const barHeight = 8;
      const barX = (canvas.width - barWidth) / 2;
      const barY = canvas.height - 40;
      
      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Progress
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(barX, barY, barWidth * (progress / 100), barHeight);
    }
  };

  const drawGetReadyMessage = (ctx, canvas) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 20;
    
    ctx.fillText('GET READY', canvas.width / 2, canvas.height / 2);
  };

  const drawSkeleton = (ctx, landmarks, analysis) => {
    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 3;
    drawConnectors(ctx, landmarks, POSE_CONNECTIONS, { color: '#00BFFF' });

    const checkpoints = analysis.checkpointResults || {};
    
    landmarks.forEach((landmark, idx) => {
      const x = landmark.x * canvasRef.current.width;
      const y = landmark.y * canvasRef.current.height;
      
      const isGood = !checkpoints[idx];
      ctx.fillStyle = isGood ? '#00FF00' : '#FFFF00';
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = analysis.isSquatPosition ? '#00FF00' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.fillText(analysis.formFeedback, canvasRef.current.width / 2, 50);
  };

  const drawPausedOverlay = (ctx, canvas) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 40);

    ctx.font = '30px Arial';
    ctx.fillText('Click ▶ to resume', canvas.width / 2, canvas.height / 2 + 20);
  };

  const drawNoPostDetected = (ctx, canvas) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw silhouette in gray
    if (silhouetteImage) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const silhouetteHeight = canvas.height * 0.55;
      const aspectRatio = silhouetteImage.width / silhouetteImage.height;
      const silhouetteWidth = silhouetteHeight * aspectRatio;

      ctx.save();
      ctx.globalAlpha = 0.4;
      
      const x = centerX - silhouetteWidth / 2;
      const y = centerY - silhouetteHeight / 2;
      
      ctx.drawImage(silhouetteImage, x, y, silhouetteWidth, silhouetteHeight);
      
      // Gray overlay
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
      ctx.fillRect(x, y, silhouetteWidth, silhouetteHeight);
      
      ctx.restore();
    }
    
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.fillText('Stand in front of camera', canvas.width / 2, canvas.height - 100);
  };

  const handleReset = () => {
    squatDetectorRef.current.reset();
    setIsPoseVerified(false);
    setShowGetReady(false);
    setVerificationFrames(0);
    setGetReadyFrames(0);
  };

  return (
    <div className="camera-container">
      <video 
        ref={videoRef} 
        className="camera-video"
        style={{ display: 'none' }}
      />
      <canvas 
        ref={canvasRef} 
        className="camera-canvas"
      />
      
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
            e.target.parentElement.innerHTML += '📷';
          }}
        />
      </button>
    </div>
  );
};

export default Camera;