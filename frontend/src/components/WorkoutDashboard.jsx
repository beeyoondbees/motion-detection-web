// WorkoutDashboard.jsx - Mobile-optimized matching Android UI
import React, { useState, useEffect, useRef } from 'react';
import Camera from './Camera';
import './WorkoutDashboard.css';

const CALORIES_PER_SQUAT = 0.12;

const WorkoutDashboard = ({ sessionId, onEndWorkout }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [squatCount, setSquatCount] = useState(0);
  const [calories, setCalories] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused]);

  const handleSquatUpdate = (data) => {
    setSquatCount(data.squatCount);
    setCalories(data.squatCount * CALORIES_PER_SQUAT);
    setFeedbackData(data.feedbackData);
  };

  const togglePause = () => {
    if (isPaused) {
      const pausedDuration = Date.now() - startTimeRef.current - (elapsedTime * 1000);
      startTimeRef.current = Date.now() - (elapsedTime * 1000);
    }
    setIsPaused(!isPaused);
  };

  const handleEndWorkout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const summaryData = {
      elapsedTime,
      squatCount,
      calories: Math.round(calories * 10) / 10,
      ...feedbackData
    };

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
              // onError={(e) => {
              //   e.target.style.display = 'none';
              //   e.target.parentElement.innerHTML += '<span style="font-size: 32px;">🔥</span>';
              // }}
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
              className="summary-button-mobile"
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
              alt="Fire" 
              className="circle-icon"
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