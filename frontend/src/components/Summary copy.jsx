// Summary.jsx - Updated with real icons
import React from 'react';
import './Summary.css';

const Summary = ({ data, onBack }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 70) return '✅';
    if (percentage >= 40) return '⚠️';
    return '❌';
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 70) return '#4CAF50';
    if (percentage >= 40) return '#FF9800';
    return '#F44336';
  };

  return (
    <div className="summary-container">
      <div className="summary-content">
        {/* Header */}
        <div className="summary-header">
          <button className="back-button" onClick={onBack}>
            <img 
              src="/assets/icons/home_btn.png" 
              alt="Home" 
              style={{ width: '24px', height: '24px', marginRight: '8px' }}
            />
            Home
          </button>
          <h1>Workout Summary</h1>
          <button className="info-button" title="Info">
            <img 
              src="/assets/icons/help_icon.png" 
              alt="Help" 
              style={{ width: '24px', height: '24px' }}
            />
          </button>
        </div>

        {/* Top Stats Cards */}
        <div className="top-stats">
          <div className="stat-box time-box">
            <div className="stat-icon-container">
              <img 
                src="/assets/icons/ic_clock.png" 
                alt="Time" 
                className="stat-icon-img"
              />
            </div>
            
            <div className="stat-value">{formatTime(data.elapsedTime)}</div>
            <div className="stat-label">Time</div>
          </div>

          <div className="stat-box kcal-box">
            <div className="stat-icon-container">
              <img 
                src="/assets/icons/ic_burn.png" 
                alt="Calories" 
                className="stat-icon-img"
              />
            </div>
            <div className="stat-value">{data.calories}</div>
            <div className="stat-label">KCal</div>
          </div>

          <div className="stat-box raps-box">
            <div className="stat-icon-container">
              <img src="/assets/icons/ic_raps.png" alt="Raps" className="stat-icon-img" />
            </div>
            <div className="stat-value">{data.squatCount}</div>
            <div className="stat-label">Raps</div>
          </div>
        </div>

        {/* Attempt Summary */}
        <div className="attempts-summary">
          <div className="attempt-card">
            <div className="attempt-label">Total</div>
            <div className="attempt-value total">{data.total || 0}</div>
          </div>

          <div className="attempt-card">
            <div className="attempt-label">Correct</div>
            <div className="attempt-value correct">{data.correct || 0}</div>
          </div>

          <div className="attempt-card">
            <div className="attempt-label">Missed</div>
            <div className="attempt-value missed">{data.missed || 0}</div>
          </div>
        </div>

        {/* Body Part Accuracy */}
        <div className="accuracy-section">
          <h2>Body Part Accuracy</h2>
          <p className="accuracy-description">
            Percentages show form accuracy during correct squats only
          </p>

          {/* Knee */}
          <div className="accuracy-card">
            <div className="accuracy-header">
              <div className="body-part-icon-container">
                <img 
                  src="/assets/icons/ic_knee.png" 
                  alt="Knee" 
                  className="body-part-icon-img"
                />
              </div>
              <div className="body-part-name">Knee</div>
              <div 
                className="status-icon"
                style={{ color: getStatusColor(data.kneePercentage || 0) }}
              >
                {getStatusIcon(data.kneePercentage || 0)}
              </div>
            </div>
            <div className="accuracy-progress">
              <div className="circular-progress-large">
                <svg width="100" height="100">
                  <circle
                    className="bg-circle"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E0E0E0"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    className="progress-circle"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={getStatusColor(data.kneePercentage || 0)}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${(data.kneePercentage || 0) * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="percentage-text">
                  {data.kneePercentage || 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Hip */}
          <div className="accuracy-card">
            <div className="accuracy-header">
              <div className="body-part-icon-container">
                <img 
                  src="/assets/icons/ic_hip.png" 
                  alt="Hip" 
                  className="body-part-icon-img"
                />
              </div>
              <div className="body-part-name">Hip</div>
              <div 
                className="status-icon"
                style={{ color: getStatusColor(data.hipPercentage || 0) }}
              >
                {getStatusIcon(data.hipPercentage || 0)}
              </div>
            </div>
            <div className="accuracy-progress">
              <div className="circular-progress-large">
                <svg width="100" height="100">
                  <circle
                    className="bg-circle"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E0E0E0"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    className="progress-circle"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={getStatusColor(data.hipPercentage || 0)}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${(data.hipPercentage || 0) * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="percentage-text">
                  {data.hipPercentage || 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="accuracy-card">
            <div className="accuracy-header">
              <div className="body-part-icon-container">
                <img 
                  src="/assets/icons/ic_back.png" 
                  alt="Back" 
                  className="body-part-icon-img"
                />
              </div>
              <div className="body-part-name">Back</div>
              <div 
                className="status-icon"
                style={{ color: getStatusColor(data.backPercentage || 0) }}
              >
                {getStatusIcon(data.backPercentage || 0)}
              </div>
            </div>
            <div className="accuracy-progress">
              <div className="circular-progress-large">
                <svg width="100" height="100">
                  <circle
                    className="bg-circle"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E0E0E0"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    className="progress-circle"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={getStatusColor(data.backPercentage || 0)}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${(data.backPercentage || 0) * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="percentage-text">
                  {data.backPercentage || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend">
          <div className="legend-item">
            <span style={{ color: '#4CAF50' }}>✅</span> Excellent (70%+)
          </div>
          <div className="legend-item">
            <span style={{ color: '#FF9800' }}>⚠️</span> Needs Work (40-69%)
          </div>
          <div className="legend-item">
            <span style={{ color: '#F44336' }}>❌</span> Poor (&lt;40%)
          </div>
        </div>

        {/* Back button */}
        <button className="new-workout-button" onClick={onBack}>
          <img 
            src="/assets/icons/home_btn.png" 
            alt="Home" 
            style={{ width: '24px', height: '24px', marginRight: '10px' }}
          />
          Start New Workout
        </button>
      </div>
    </div>
  );
};

export default Summary;