// WorkoutDashboard.jsx - Client-Side Only (No Backend Required)
// Works independently without backend connection
import React, { useState, useEffect, useRef } from 'react';
import Camera from './Camera';
import './WorkoutDashboard.css';

const CALORIES_PER_SQUAT = 0.12;

const WorkoutDashboard = ({ onEndWorkout }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [squatCount, setSquatCount] = useState(0);
  const [calories, setCalories] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    total: 0,
    correct: 0,
    missed: 0,
    kneePercentage: 0,
    hipPercentage: 0,
    backPercentage: 0
  });
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused]);

  // Handle squat updates from Camera component
  const handleSquatUpdate = (data) => {
    if (data.squatCount !== undefined) {
      setSquatCount(data.squatCount);
      setCalories(data.squatCount * CALORIES_PER_SQUAT);
    }
    
    if (data.feedbackData) {
      setFeedbackData(data.feedbackData);
    }
  };

  // Pause/Resume handling
  const togglePause = () => {
    if (isPaused) {
      // Resuming - add paused duration
      if (pauseStartRef.current) {
        pausedTimeRef.current += Date.now() - pauseStartRef.current;
      }
    } else {
      // Pausing - record start time
      pauseStartRef.current = Date.now();
    }
    setIsPaused(!isPaused);
  };

  // End workout and show summary
  const handleEndWorkout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const summaryData = {
      elapsedTime,
      squatCount,
      calories: Math.round(calories * 10) / 10,
      total: feedbackData.total || squatCount,
      correct: feedbackData.correct || squatCount,
      missed: feedbackData.missed || 0,
      kneePercentage: feedbackData.kneePercentage || 0,
      hipPercentage: feedbackData.hipPercentage || 0,
      backPercentage: feedbackData.backPercentage || 0
    };

    console.log('📊 Workout Summary:', summaryData);
    onEndWorkout(summaryData);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="workout-dashboard">
      {/* Camera View */}
      <div className="camera-section">
        <Camera 
          onSquatUpdate={handleSquatUpdate}
          isPaused={isPaused}
        />
      </div>

      {/* Bottom Navigation Bar - Mobile Style */}
      <div className="bottom-navbar-mobile">
        {/* Left: KCal */}
        <div className="stat-circle-mobile kcal-circle">
          <div className="circle-inner">
            <img 
              src="/assets/icons/ic_burn.png" 
              alt="Fire" 
              className="circle-icon"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span style="font-size: 28px;">🔥</span>' + e.target.parentElement.innerHTML;
              }}
            />
            <div className="circle-value">{Math.floor(calories)}</div>
          </div>
          <div className="circle-label">Kcal Burned</div>
        </div>

        {/* Center: Summary Button + Timer */}
        <div className="center-section-mobile">
          <button 
            className="summary-button-mobile"
            onClick={handleEndWorkout}
            title="View Summary"
          >
            <img 
              src="/assets/icons/ic_summary.png" 
              alt="Summary" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span style="font-size: 36px;">😊</span>';
              }}
            />
          </button>
          <div className="circle-label">Summary</div>
          
          <div className="timer-mobile">
            <img 
              src="/assets/icons/ic_clock.png" 
              alt="Clock" 
              className="timer-icon-mobile"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="timer-label-mobile">Time</span>
            <span className="timer-separator">:</span>
            <span className="timer-value-mobile">{formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* Right: Raps */}
        <div className="stat-circle-mobile raps-circle">
          <div className="circle-inner">
            <img 
              src="/assets/icons/ic_raps.png" 
              alt="Raps" 
              className="circle-icon"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span style="font-size: 28px;">🏃</span>' + e.target.parentElement.innerHTML;
              }}
            />
            <div className="circle-value">{squatCount}</div>
          </div>
          <div className="circle-label">Total Raps</div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutDashboard;