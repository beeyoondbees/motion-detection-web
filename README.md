# 🏋️ AI Squat Detector - Web Application

Professional squat detection web app with real-time pose analysis, converted from Android.

## 🎯 Features

- **Real-time Pose Detection** - MediaPipe + OpenCV for accurate tracking
- **Smart Squat Counting** - Only counts perfect form squats
- **Live Voice Feedback** - Web Speech API for form corrections
- **Workout Analytics** - Detailed statistics and body part accuracy
- **Play/Pause Control** - Pause workout without losing progress
- **Summary Dashboard** - Post-workout insights

## 🛠️ Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI** - High-performance async API
- **MediaPipe** - Pose estimation
- **OpenCV** - Image processing
- **WebSocket** - Real-time communication

### Frontend
- **React.js 18** - UI framework
- **MediaPipe Web** - Browser-based pose detection
- **Canvas API** - Pose visualization
- **Web Speech API** - Voice feedback
- **Tailwind CSS** - Styling

## 📦 Installation

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## 🚀 Usage

1. Start backend server: `http://localhost:8000`
2. Start frontend: `http://localhost:3000`
3. Allow camera permissions
4. Stand in frame until verified
5. Start squatting!

## 🎯 Perfect Squat Criteria

- **Knee Angle**: 50-110°
- **Hip Angle**: 60-120°
- **Hip Depth**: ≥85% (hips below knees)
- **Back Angle**: 0-45° (tracked but not required)

## 📊 Detection Modes

- **Client-Side** (Default): Fast, runs in browser
- **Server-Side**: More accurate, uses Python backend

## 🏗️ Project Structure

```
squat-detector-web/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── squat_detector.py       # Core detection logic
│   ├── pose_processor.py       # MediaPipe wrapper
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Camera.jsx
│   │   │   ├── PoseOverlay.jsx
│   │   │   ├── WorkoutDashboard.jsx
│   │   │   └── Summary.jsx
│   │   ├── hooks/
│   │   │   ├── usePoseDetection.js
│   │   │   └── useSquatDetector.js
│   │   ├── utils/
│   │   │   ├── squatDetector.js
│   │   │   └── voiceFeedback.js
│   │   └── App.js
│   └── package.json
└── README.md
```

## 🔧 Configuration

Edit `backend/config.py`:

```python
DETECTION_MODE = "mediapipe"  # or "opencv"
MIN_DETECTION_CONFIDENCE = 0.5
MIN_TRACKING_CONFIDENCE = 0.5
WEBSOCKET_PORT = 8000
```

## 📱 API Endpoints

- `GET /` - Health check
- `WS /ws/pose` - WebSocket for real-time pose streaming
- `POST /api/session/start` - Start workout session
- `POST /api/session/end` - End session, get summary
- `GET /api/stats` - Get workout statistics

## 🎨 Customization

### Change Detection Sensitivity

```javascript
// frontend/src/config.js
export const SQUAT_THRESHOLDS = {
  KNEE_MIN: 50,
  KNEE_MAX: 110,
  HIP_MIN: 60,
  HIP_MAX: 120,
  DEPTH_RATIO: 0.85
};
```

## 🐛 Troubleshooting

**Camera not detected:**
- Ensure HTTPS or localhost
- Check browser permissions

**Slow detection:**
- Switch to client-side mode
- Reduce video resolution

**WebSocket errors:**
- Check backend is running
- Verify firewall settings

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

Pull requests welcome! See CONTRIBUTING.md

## 📧 Support

Issues: GitHub Issues
Email: support@squatdetector.app