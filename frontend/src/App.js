// App.js - Updated with real icons
import React, { useState, useEffect } from 'react';
import Camera from './components/Camera';
import WorkoutDashboard from './components/WorkoutDashboard';
import Summary from './components/Summary';
import './App.css';

function App() {
  const [view, setView] = useState('entry');
  const [sessionId, setSessionId] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    console.log('🏋️ Squat Detector Web App Loaded (Client-Side Mode)');
  }, []);

  const handleStartWorkout = () => {
    setSessionId('client-' + Date.now());
    setView('workout');
    console.log('✅ Starting workout (client-side mode)');
  };

  const handleEndWorkout = (data) => {
    setSummaryData(data);
    setView('summary');
  };

  const handleBackToEntry = () => {
    setView('entry');
    setSessionId(null);
    setSummaryData(null);
  };

  return (
    <div className="App">
      {view === 'entry' && (
        <EntryScreen onStartWorkout={handleStartWorkout} />
      )}

      {view === 'workout' && (
        <WorkoutDashboard 
          sessionId={sessionId}
          onEndWorkout={handleEndWorkout}
        />
      )}

      {view === 'summary' && (
        <Summary 
          data={summaryData}
          onBack={handleBackToEntry}
        />
      )}
    </div>
  );
}

// Entry Screen Component with Real Icons
function EntryScreen({ onStartWorkout }) {
  return (
    <div className="entry-screen">
      <div className="entry-container">
        <div className="app-logo">
          
          <h3>Select Workout Mode</h3>
        </div>

        <div className="features">
          <div className="feature">
            <div className='workout-card-img'>
            <img 
              src="/assets/icons/squat_img.jpg" 
              alt="Squat" 
              className="feature-icon-img"
            />
            <h3>Squat</h3>
            </div>
          </div>

          <div className="feature">
            <div className='workout-card-img'>
            <img 
              src="/assets/icons/pushups_img.png" 
              alt="Pushups" 
              className="feature-icon-img"
            />
            <h3>Pushups</h3>
            </div>
          </div>

        
          <div className="feature">
            <div className='workout-card-img'>
            <img 
              src="/assets/icons/pullups_img.png" 
              alt="Pullups" 
              className="feature-icon-img"
            />
            <h3>Pullups</h3>
            </div>
          </div>

          <div className="feature">
            <div className='workout-card-img'>
            <img 
              src="/assets/icons/pullups_img.png" 
              alt="Pullups" 
              className="feature-icon-img"
            />
            <h3>Jumping Jacks</h3>
            </div>
          </div>

        </div>

        <button className="start-button" onClick={onStartWorkout}>
          <img 
            src="/assets/icons/ic_play_wt.png" 
            alt="Start" 
            style={{ width: '24px', height: '24px', marginRight: '10px' }}
          />
          Start
        </button>

        <div className="requirements">
          <img 
            src="/assets/icons/ic_info.png" 
            alt="Info" 
            style={{ width: '20px', height: '20px', marginRight: '8px', verticalAlign: 'middle' }}
          />
          <span>Camera access required • Works best in good lighting</span>
        </div>
      </div>
    </div>
  );
}

export default App;