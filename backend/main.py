# main.py
"""
FastAPI Backend for Squat Detector Web App
Provides WebSocket for real-time pose processing and REST API for session management
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import mediapipe as mp
import base64
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import asyncio

from squat_detector import SquatDetector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Squat Detector API",
    description="Real-time squat detection with pose analysis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://stelar-herbert-sinlike.ngrok-free.dev"  # ← Add your ngrok URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,  # 0=Lite, 1=Full, 2=Heavy
    smooth_landmarks=True,
    enable_segmentation=False,
    smooth_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Session management
class WorkoutSession:
    def __init__(self):
        self.detector = SquatDetector()
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.frame_count = 0
        self.is_active = True
        
    def get_duration_seconds(self) -> int:
        end = self.end_time if self.end_time else datetime.now()
        return int((end - self.start_time).total_seconds())
    
    def end_session(self):
        self.end_time = datetime.now()
        self.is_active = False

# Store active sessions
sessions: Dict[str, WorkoutSession] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Squat Detector API",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws/pose/{session_id}",
            "start_session": "POST /api/session/start",
            "end_session": "POST /api/session/end/{session_id}",
            "stats": "GET /api/stats/{session_id}"
        }
    }


@app.post("/api/session/start")
async def start_session():
    """Start a new workout session"""
    import uuid
    session_id = str(uuid.uuid4())
    sessions[session_id] = WorkoutSession()
    
    logger.info(f"✅ Started session: {session_id}")
    
    return {
        "session_id": session_id,
        "start_time": sessions[session_id].start_time.isoformat(),
        "message": "Session started successfully"
    }


@app.post("/api/session/end/{session_id}")
async def end_session(session_id: str):
    """End a workout session and get summary"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    session.end_session()
    
    # Get final statistics
    feedback_data = session.detector.get_feedback_data()
    duration = session.get_duration_seconds()
    squat_count = session.detector.get_squat_count()
    calories = squat_count * 0.12  # 0.12 kcal per squat
    
    summary = {
        "session_id": session_id,
        "duration_seconds": duration,
        "squat_count": squat_count,
        "calories": round(calories, 1),
        "total_attempts": feedback_data["total"],
        "correct_squats": feedback_data["correct"],
        "missed_squats": feedback_data["missed"],
        "accuracy": {
            "knee": feedback_data["kneePercentage"],
            "hip": feedback_data["hipPercentage"],
            "back": feedback_data["backPercentage"]
        },
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat()
    }
    
    logger.info(f"📊 Ended session {session_id}: {squat_count} squats, {duration}s")
    
    # Clean up old sessions after 1 hour
    # In production, use Redis or database
    
    return summary


@app.get("/api/stats/{session_id}")
async def get_stats(session_id: str):
    """Get current session statistics"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    feedback_data = session.detector.get_feedback_data()
    
    return {
        "session_id": session_id,
        "squat_count": session.detector.get_squat_count(),
        "duration_seconds": session.get_duration_seconds(),
        "frame_count": session.frame_count,
        "statistics": feedback_data
    }


@app.websocket("/ws/pose/{session_id}")
async def websocket_pose_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time pose processing
    
    Client sends: base64 encoded image frame
    Server responds: pose landmarks + squat analysis
    """
    await websocket.accept()
    logger.info(f"🔌 WebSocket connected: {session_id}")
    
    # Get or create session
    if session_id not in sessions:
        sessions[session_id] = WorkoutSession()
    
    session = sessions[session_id]
    
    try:
        while True:
            # Receive frame from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                # Decode base64 image
                image_data = base64.b64decode(message["data"].split(",")[1])
                nparr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    continue
                
                session.frame_count += 1
                
                # Convert BGR to RGB for MediaPipe
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Process with MediaPipe
                results = pose.process(frame_rgb)
                
                if results.pose_landmarks:
                    # Convert landmarks to dict format
                    landmarks = []
                    for landmark in results.pose_landmarks.landmark:
                        landmarks.append({
                            'x': landmark.x,
                            'y': landmark.y,
                            'z': landmark.z,
                            'visibility': landmark.visibility
                        })
                    
                    # Detect squat
                    squat_analysis = session.detector.detect_squat(landmarks)
                    
                    # Check for squat completion
                    voice_feedback = None
                    if session.detector.has_squat_just_completed():
                        was_perfect = session.detector.was_last_squat_perfect()
                        voice_feedback = session.detector.get_squat_completion_feedback(was_perfect)
                    
                    # Prepare response
                    response = {
                        "type": "pose_results",
                        "landmarks": landmarks,
                        "squat_analysis": {
                            "is_squat_position": squat_analysis.is_squat_position,
                            "knee_angle": round(squat_analysis.knee_angle, 1),
                            "hip_angle": round(squat_analysis.hip_angle, 1),
                            "back_angle": round(squat_analysis.back_angle, 1),
                            "hip_depth": round(squat_analysis.hip_depth, 2),
                            "form_feedback": squat_analysis.form_feedback,
                            "checkpoint_results": squat_analysis.checkpoint_results
                        },
                        "squat_count": session.detector.get_squat_count(),
                        "voice_feedback": voice_feedback,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    await websocket.send_json(response)
                else:
                    # No pose detected
                    await websocket.send_json({
                        "type": "no_pose",
                        "message": "No pose detected"
                    })
            
            elif message.get("type") == "reset":
                # Reset squat counter
                session.detector.reset_squat_count()
                await websocket.send_json({
                    "type": "reset_complete",
                    "message": "Counter reset"
                })
            
            elif message.get("type") == "ping":
                # Heartbeat
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}", exc_info=True)
        await websocket.close()


@app.post("/api/process-image")
async def process_image(request: dict):
    """
    Process a single image (alternative to WebSocket)
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(request["image"].split(",")[1])
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = pose.process(frame_rgb)
        
        if results.pose_landmarks:
            landmarks = []
            for landmark in results.pose_landmarks.landmark:
                landmarks.append({
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility
                })
            
            return {
                "success": True,
                "landmarks": landmarks
            }
        else:
            return {
                "success": False,
                "message": "No pose detected"
            }
            
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Squat Detector API...")
    logger.info("📡 WebSocket: ws://localhost:8000/ws/pose/{session_id}")
    logger.info("🌐 API Docs: http://localhost:8000/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,
        log_level="info"
    )