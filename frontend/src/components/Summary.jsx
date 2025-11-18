// Summary.jsx - Updated to match the new UI design
import React from 'react';
import './Summary.css';

const Summary = ({ data, onBack }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="summary-container-new">
      <div className="summary-content-new">
        {/* Header */}
        <div className="summary-header-new">
          <button className="back-arrow-button" onClick={onBack}>
            ←
          </button>
          <h1>Workout Summary</h1>
          <button className="help-button-new">
            <span>?</span>
          </button>
        </div>

        {/* Top Stats Cards */}
        <div className="top-stats-new">
          <div className="stat-card-new time-card">
            <div className="stat-icon-new">
              <img 
                src="/assets/icons/ic_clock.png" 
                alt="Time" 
                className="stat-icon-img"
              />
            </div>
            <div className="stat-value-new time-value">{formatTime(data.elapsedTime)}</div>
            <div className="stat-label-new">Time</div>
          </div>

          <div className="stat-card-new kcal-card">
            <div className="stat-icon-new">
              <img 
                src="/assets/icons/ic_burn.png" 
                alt="Calories" 
                className="stat-icon-img"
              />
            </div>
            <div className="stat-value-new kcal-value">{data.calories}</div>
            <div className="stat-label-new">KCal</div>
          </div>

          <div className="stat-card-new raps-card">
            <div className="stat-icon-new">
              <img 
                src="/assets/icons/ic_raps.png" 
                alt="Raps" 
                className="stat-icon-img"
              />
            </div>
            <div className="stat-value-new raps-value">{data.squatCount}</div>
            <div className="stat-label-new">Raps</div>
          </div>
        </div>

        {/* Attempt Summary - Full Width Cards */}
        <div className="attempts-section-new">
          <div className="attempt-row-new">
            <span className="attempt-label-new">Total</span>
            <span className="attempt-value-new">{data.total || 0}</span>
          </div>

          <div className="attempt-row-new">
            <span className="attempt-label-new">Correct</span>
            <span className="attempt-value-new">{data.correct || 0}</span>
          </div>

          <div className="attempt-row-new">
            <span className="attempt-label-new">Missed</span>
            <span className="attempt-value-new">{data.missed || 0}</span>
          </div>
        </div>

        {/* Body Part Accuracy */}
        <div className="body-parts-section-new">
          {/* Knee */}
          <div className="body-part-card-new">
            <div className="body-part-left">
              <div className="body-part-icon-circle">
                <img 
                  src="/assets/icons/ic_knee.png" 
                  alt="Knee" 
                  className="body-part-icon-img"
                />
              </div>
              <span className="body-part-name-new">Knee</span>
            </div>
            <div className="body-part-right">
              <div className="circular-progress-new">
                <svg width="80" height="80">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke={data.kneePercentage >= 70 ? '#10B981' : data.kneePercentage >= 40 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="6"
                    strokeDasharray={`${(data.kneePercentage || 0) * 2.01} 201`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text x="40" y="40" textAnchor="middle" dy="7" fontSize="18" fontWeight="bold" fill="#EF4444">
                    {data.kneePercentage || 0}%
                  </text>
                </svg>
              </div>
              <button className="info-icon-button">
                <span>i</span>
              </button>
            </div>
          </div>

          {/* Hip */}
          <div className="body-part-card-new">
            <div className="body-part-left">
              <div className="body-part-icon-circle">
                <img 
                  src="/assets/icons/ic_hip.png" 
                  alt="Hip" 
                  className="body-part-icon-img"
                />
              </div>
              <span className="body-part-name-new">Hip</span>
            </div>
            <div className="body-part-right">
              <div className="circular-progress-new">
                <svg width="80" height="80">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke={data.hipPercentage >= 70 ? '#10B981' : data.hipPercentage >= 40 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="6"
                    strokeDasharray={`${(data.hipPercentage || 0) * 2.01} 201`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text x="40" y="40" textAnchor="middle" dy="7" fontSize="18" fontWeight="bold" fill="#EF4444">
                    {data.hipPercentage || 0}%
                  </text>
                </svg>
              </div>
              <button className="info-icon-button">
                <span>i</span>
              </button>
            </div>
          </div>

          {/* Back */}
          <div className="body-part-card-new">
            <div className="body-part-left">
              <div className="body-part-icon-circle">
                <img 
                  src="/assets/icons/ic_back.png" 
                  alt="Back" 
                  className="body-part-icon-img"
                />
              </div>
              <span className="body-part-name-new">Back</span>
            </div>
            <div className="body-part-right">
              <div className="circular-progress-new">
                <svg width="80" height="80">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke={data.backPercentage >= 70 ? '#10B981' : data.backPercentage >= 40 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="6"
                    strokeDasharray={`${(data.backPercentage || 0) * 2.01} 201`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text x="40" y="40" textAnchor="middle" dy="7" fontSize="18" fontWeight="bold" fill="#EF4444">
                    {data.backPercentage || 0}%
                  </text>
                </svg>
              </div>
              <button className="info-icon-button">
                <span>i</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <button className="new-workout-button-new" onClick={onBack}>
          Start New Workout
        </button>
      </div>
    </div>
  );
};

export default Summary;