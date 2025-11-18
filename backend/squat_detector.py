# squat_detector.py
"""
Squat Detector - Converted from Android/Kotlin
Detects and counts perfect squat form using pose landmarks
"""

import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class SquatAnalysis:
    """Results from squat analysis"""
    is_squat_position: bool
    knee_angle: float
    hip_angle: float
    back_angle: float
    hip_depth: float
    form_feedback: str
    checkpoint_results: Dict[int, bool]


class SquatDetector:
    """
    Real-time squat detection with state machine
    Only counts squats with perfect lower body form
    """
    
    # Landmark indices (MediaPipe Pose)
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    
    # Detection thresholds
    STANDING_KNEE_THRESHOLD = 130.0  # Above this = standing
    SQUATTING_KNEE_THRESHOLD = 120.0  # Below this = squatting
    
    # Perfect squat criteria (LOWER BODY ONLY)
    KNEE_PERFECT_MIN = 50.0
    KNEE_PERFECT_MAX = 110.0
    HIP_PERFECT_MIN = 60.0
    HIP_PERFECT_MAX = 120.0
    MIN_HIP_DEPTH_RATIO = 0.85
    
    # Back/shoulder (tracked but not required for counting)
    BACK_LEAN_MIN = 0.0
    BACK_LEAN_MAX = 45.0
    
    def __init__(self):
        self.squat_count = 0
        self.total_attempts = 0
        self.correct_squats = 0
        self.missed_squats = 0
        
        # Accuracy tracking for correct squats only
        self.knee_correct_frames = 0
        self.hip_correct_frames = 0
        self.back_correct_frames = 0
        self.total_frames_in_correct_squats = 0
        
        # Current squat tracking
        self.current_squat_knee_frames = 0
        self.current_squat_hip_frames = 0
        self.current_squat_back_frames = 0
        self.current_squat_total_frames = 0
        
        # State machine
        self.was_standing = True
        self.is_currently_squatting = False
        self.lowest_knee_angle_this_squat = 180.0
        self.best_form_this_squat = False
        
        # Completion tracking
        self.last_squat_analysis: Optional[SquatAnalysis] = None
        self.last_squat_was_perfect = False
        self.squat_just_completed = False
        
        # Debug
        self.frame_count = 0
        self.last_log_frame = 0
        
        logger.info("✅ SquatDetector initialized")
    
    def detect_squat(self, landmarks: List[Dict]) -> SquatAnalysis:
        """
        Main detection method - processes pose landmarks
        
        Args:
            landmarks: List of pose landmarks with x, y, z, visibility
            
        Returns:
            SquatAnalysis with current form assessment
        """
        self.frame_count += 1
        
        if not landmarks or len(landmarks) < 33:
            return self._get_empty_analysis("No pose detected")
        
        # Calculate angles
        left_knee_angle = self._calculate_angle(
            landmarks[self.LEFT_HIP],
            landmarks[self.LEFT_KNEE],
            landmarks[self.LEFT_ANKLE]
        )
        right_knee_angle = self._calculate_angle(
            landmarks[self.RIGHT_HIP],
            landmarks[self.RIGHT_KNEE],
            landmarks[self.RIGHT_ANKLE]
        )
        avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
        
        left_hip_angle = self._calculate_angle(
            landmarks[self.LEFT_SHOULDER],
            landmarks[self.LEFT_HIP],
            landmarks[self.LEFT_KNEE]
        )
        right_hip_angle = self._calculate_angle(
            landmarks[self.RIGHT_SHOULDER],
            landmarks[self.RIGHT_HIP],
            landmarks[self.RIGHT_KNEE]
        )
        avg_hip_angle = (left_hip_angle + right_hip_angle) / 2
        
        back_lean = self._calculate_back_lean(
            landmarks[self.LEFT_SHOULDER],
            landmarks[self.RIGHT_SHOULDER],
            landmarks[self.LEFT_HIP],
            landmarks[self.RIGHT_HIP]
        )
        
        hip_depth = self._calculate_hip_depth(
            landmarks[self.LEFT_HIP],
            landmarks[self.RIGHT_HIP],
            landmarks[self.LEFT_KNEE],
            landmarks[self.RIGHT_KNEE]
        )
        
        # Log every 30 frames
        if self.frame_count - self.last_log_frame >= 30:
            logger.debug(
                f"📊 Frame {self.frame_count} | "
                f"Knee: {avg_knee_angle:.0f}° | "
                f"Hip: {avg_hip_angle:.0f}° | "
                f"Back: {back_lean:.0f}° | "
                f"Depth: {hip_depth:.2f}"
            )
            logger.debug(
                f"   State: {'SQUATTING' if self.is_currently_squatting else 'STANDING'} | "
                f"Total: {self.total_attempts} | "
                f"Correct: {self.correct_squats} | "
                f"Missed: {self.missed_squats}"
            )
            self.last_log_frame = self.frame_count
        
        # Check form - FOCUS ON LOWER BODY ONLY
        knees_good = self.KNEE_PERFECT_MIN <= avg_knee_angle <= self.KNEE_PERFECT_MAX
        hips_good = self.HIP_PERFECT_MIN <= avg_hip_angle <= self.HIP_PERFECT_MAX
        depth_good = hip_depth >= self.MIN_HIP_DEPTH_RATIO
        back_good = self.BACK_LEAN_MIN <= back_lean <= self.BACK_LEAN_MAX
        
        # Perfect squat = good lower body (knee + hip + depth)
        lower_body_perfect = knees_good and hips_good and depth_good
        is_perfect_form = lower_body_perfect  # ⭐ ONLY LOWER BODY MATTERS
        
        # Track performance during squat
        if self.is_currently_squatting:
            self.current_squat_total_frames += 1
            if knees_good:
                self.current_squat_knee_frames += 1
            if hips_good and depth_good:
                self.current_squat_hip_frames += 1
            if back_good:
                self.current_squat_back_frames += 1
            
            if avg_knee_angle < self.lowest_knee_angle_this_squat:
                self.lowest_knee_angle_this_squat = avg_knee_angle
            
            if lower_body_perfect:
                self.best_form_this_squat = True
        
        # STATE MACHINE
        is_standing = avg_knee_angle >= self.STANDING_KNEE_THRESHOLD
        is_squatting = avg_knee_angle < self.SQUATTING_KNEE_THRESHOLD
        
        if self.was_standing and is_squatting:
            # 🔽 SQUAT STARTED
            self.is_currently_squatting = True
            self.was_standing = False
            self.lowest_knee_angle_this_squat = avg_knee_angle
            self.best_form_this_squat = False
            
            self.current_squat_total_frames = 0
            self.current_squat_knee_frames = 0
            self.current_squat_hip_frames = 0
            self.current_squat_back_frames = 0
            
            logger.info("🔽 ========== SQUAT STARTED ==========")
            logger.info(f"   Frame: {self.frame_count} | Knee: {avg_knee_angle:.0f}°")
            logger.info("=" * 40)
            
        elif not self.was_standing and is_standing and self.is_currently_squatting:
            # 🔼 SQUAT COMPLETED!
            self.is_currently_squatting = False
            self.was_standing = True
            self.total_attempts += 1
            self.squat_just_completed = True
            
            logger.info("🔼 ========== SQUAT COMPLETED ==========")
            logger.info(f"   Frame: {self.frame_count} | Lowest Knee: {self.lowest_knee_angle_this_squat:.0f}°")
            logger.info("   Checking criteria:")
            logger.info(f"      Knee: {'✓' if knees_good else '✗'} {avg_knee_angle:.0f}° (need {self.KNEE_PERFECT_MIN:.0f}-{self.KNEE_PERFECT_MAX:.0f}°)")
            logger.info(f"      Hip: {'✓' if hips_good else '✗'} {avg_hip_angle:.0f}° (need {self.HIP_PERFECT_MIN:.0f}-{self.HIP_PERFECT_MAX:.0f}°)")
            logger.info(f"      Depth: {'✓' if depth_good else '✗'} {hip_depth:.2f} (need ≥{self.MIN_HIP_DEPTH_RATIO})")
            logger.info(f"      Back: {'✓' if back_good else '✗'} {back_lean:.0f}° (tracked but NOT required)")
            
            sufficient_depth = self.lowest_knee_angle_this_squat < 110.0
            
            if self.best_form_this_squat and sufficient_depth:
                # ✅ PERFECT SQUAT!
                self.squat_count += 1
                self.correct_squats += 1
                self.last_squat_was_perfect = True
                
                self.total_frames_in_correct_squats += self.current_squat_total_frames
                self.knee_correct_frames += self.current_squat_knee_frames
                self.hip_correct_frames += self.current_squat_hip_frames
                self.back_correct_frames += self.current_squat_back_frames
                
                logger.info(f"✅ RESULT: PERFECT SQUAT #{self.squat_count}")
                logger.info("   ⭐ Lower body form was excellent!")
            else:
                # ❌ IMPERFECT SQUAT
                self.missed_squats += 1
                self.last_squat_was_perfect = False
                
                logger.info("❌ RESULT: IMPERFECT SQUAT (NOT COUNTED)")
                if not sufficient_depth:
                    logger.info(f"   ✗ Insufficient depth: {self.lowest_knee_angle_this_squat:.0f}° (need <110°)")
                if not self.best_form_this_squat:
                    logger.info("   ✗ Lower body form issues")
            
            logger.info(f"   TOTALS: Attempts={self.total_attempts} | Correct={self.correct_squats} | Missed={self.missed_squats}")
            logger.info("=" * 40)
            
        elif is_standing:
            self.was_standing = True
            self.is_currently_squatting = False
        
        # Generate checkpoints and feedback
        checkpoints = self._generate_checkpoints(back_good, hips_good and depth_good, knees_good, depth_good)
        feedback = self._generate_feedback(is_perfect_form, back_good, hips_good, knees_good, depth_good, self.is_currently_squatting)
        
        squat_analysis = SquatAnalysis(
            is_squat_position=is_perfect_form,
            knee_angle=avg_knee_angle,
            hip_angle=avg_hip_angle,
            back_angle=back_lean,
            hip_depth=hip_depth,
            form_feedback=feedback,
            checkpoint_results=checkpoints
        )
        
        self.last_squat_analysis = squat_analysis
        return squat_analysis
    
    def has_squat_just_completed(self) -> bool:
        """Check if squat was just completed (one-shot)"""
        completed = self.squat_just_completed
        self.squat_just_completed = False
        return completed
    
    def was_last_squat_perfect(self) -> bool:
        """Check if last completed squat was perfect"""
        return self.last_squat_was_perfect
    
    def get_squat_completion_feedback(self, was_perfect: bool) -> str:
        """Get voice feedback for completed squat"""
        if was_perfect:
            phrases = [
                f"Great job! Perfect squat! {self.squat_count}",
                f"Nice form! Keep going! {self.squat_count}",
                f"Excellent squat, well done! {self.squat_count}",
                f"Perfect! That's {self.squat_count}",
                f"Amazing form! {self.squat_count} squats"
            ]
            import random
            return random.choice(phrases)
        else:
            return self._determine_bad_squat_feedback()
    
    def _determine_bad_squat_feedback(self) -> str:
        """Determine specific feedback for imperfect squat"""
        if not self.last_squat_analysis:
            return "Please adjust your form"
        
        analysis = self.last_squat_analysis
        
        if self.lowest_knee_angle_this_squat >= 110.0:
            return "Go deeper. Bend your knees more"
        elif not (self.KNEE_PERFECT_MIN <= analysis.knee_angle <= self.KNEE_PERFECT_MAX):
            return "Please adjust your form. Check your knee position"
        elif not (self.HIP_PERFECT_MIN <= analysis.hip_angle <= self.HIP_PERFECT_MAX):
            return "Please adjust your form. Push your hips back"
        elif analysis.hip_depth < self.MIN_HIP_DEPTH_RATIO:
            return "Please adjust your form. Go deeper"
        else:
            return "Please adjust your form"
    
    def get_feedback_data(self) -> Dict[str, int]:
        """Get workout feedback statistics"""
        knee_percentage = 0
        hip_percentage = 0
        back_percentage = 0
        
        if self.total_frames_in_correct_squats > 0:
            knee_percentage = (self.knee_correct_frames * 100) // self.total_frames_in_correct_squats
            hip_percentage = (self.hip_correct_frames * 100) // self.total_frames_in_correct_squats
            back_percentage = (self.back_correct_frames * 100) // self.total_frames_in_correct_squats
        
        logger.info("========== WORKOUT SUMMARY ==========")
        logger.info(f"Total Attempts: {self.total_attempts}")
        logger.info(f"Perfect Squats: {self.correct_squats}")
        logger.info(f"Imperfect Squats: {self.missed_squats}")
        logger.info(f"Accuracy: Knee={knee_percentage}% | Hip={hip_percentage}% | Back={back_percentage}%")
        logger.info("=" * 40)
        
        return {
            "total": self.total_attempts,
            "correct": self.correct_squats,
            "missed": self.missed_squats,
            "kneePercentage": knee_percentage,
            "hipPercentage": hip_percentage,
            "backPercentage": back_percentage,
            "kneeCorrectFrames": self.knee_correct_frames,
            "hipCorrectFrames": self.hip_correct_frames,
            "backCorrectFrames": self.back_correct_frames,
            "totalFramesInCorrectSquats": self.total_frames_in_correct_squats
        }
    
    def reset_squat_count(self):
        """Reset all counters"""
        self.squat_count = 0
        self.total_attempts = 0
        self.correct_squats = 0
        self.missed_squats = 0
        
        self.knee_correct_frames = 0
        self.hip_correct_frames = 0
        self.back_correct_frames = 0
        self.total_frames_in_correct_squats = 0
        
        self.current_squat_knee_frames = 0
        self.current_squat_hip_frames = 0
        self.current_squat_back_frames = 0
        self.current_squat_total_frames = 0
        
        self.last_squat_analysis = None
        self.last_squat_was_perfect = False
        self.squat_just_completed = False
        
        self.was_standing = True
        self.is_currently_squatting = False
        self.lowest_knee_angle_this_squat = 180.0
        self.best_form_this_squat = False
        
        self.frame_count = 0
        self.last_log_frame = 0
        
        logger.info("✨ ========== RESET ==========")
        logger.info("All counters reset to zero")
        logger.info("=" * 40)
    
    def get_squat_count(self) -> int:
        """Get current perfect squat count"""
        return self.squat_count
    
    # Helper methods
    
    def _calculate_angle(self, first_point: Dict, mid_point: Dict, last_point: Dict) -> float:
        """Calculate angle between three points"""
        radians = math.atan2(last_point['y'] - mid_point['y'], last_point['x'] - mid_point['x']) - \
                  math.atan2(first_point['y'] - mid_point['y'], first_point['x'] - mid_point['x'])
        angle = math.degrees(radians)
        
        if angle < 0:
            angle += 360
        if angle > 180:
            angle = 360 - angle
        
        return angle
    
    def _calculate_back_lean(self, left_shoulder: Dict, right_shoulder: Dict, 
                            left_hip: Dict, right_hip: Dict) -> float:
        """Calculate back lean angle"""
        shoulder_mid_x = (left_shoulder['x'] + right_shoulder['x']) / 2
        shoulder_mid_y = (left_shoulder['y'] + right_shoulder['y']) / 2
        hip_mid_x = (left_hip['x'] + right_hip['x']) / 2
        hip_mid_y = (left_hip['y'] + right_hip['y']) / 2
        
        delta_x = shoulder_mid_x - hip_mid_x
        delta_y = shoulder_mid_y - hip_mid_y
        
        lean_angle = math.degrees(math.atan2(delta_x, delta_y))
        return abs(lean_angle)
    
    def _calculate_hip_depth(self, left_hip: Dict, right_hip: Dict,
                            left_knee: Dict, right_knee: Dict) -> float:
        """Calculate hip depth ratio"""
        hip_y = (left_hip['y'] + right_hip['y']) / 2
        knee_y = (left_knee['y'] + right_knee['y']) / 2
        
        if knee_y == 0:
            return 0.0
        
        return hip_y / knee_y
    
    def _generate_checkpoints(self, shoulders_good: bool, hips_good: bool,
                             knees_good: bool, ankles_good: bool) -> Dict[int, bool]:
        """Generate checkpoint results for visualization"""
        return {
            self.LEFT_SHOULDER: not shoulders_good,
            self.RIGHT_SHOULDER: not shoulders_good,
            self.LEFT_HIP: not hips_good,
            self.RIGHT_HIP: not hips_good,
            self.LEFT_KNEE: not knees_good,
            self.RIGHT_KNEE: not knees_good,
            self.LEFT_ANKLE: not ankles_good,
            self.RIGHT_ANKLE: not ankles_good,
        }
    
    def _generate_feedback(self, is_perfect: bool, shoulders_good: bool,
                          hips_good: bool, knees_good: bool,
                          ankles_good: bool, is_squatting: bool) -> str:
        """Generate real-time form feedback"""
        if is_perfect and is_squatting:
            return "Perfect form!"
        
        if is_squatting:
            issues = []
            if not hips_good:
                issues.append("Hips")
            if not knees_good:
                issues.append("Knees")
            if not ankles_good:
                issues.append("Depth")
            
            if issues:
                return f"Fix: {', '.join(issues[:2])}"
            return "Keep going"
        
        return "Ready to squat"
    
    def _get_empty_analysis(self, feedback: str) -> SquatAnalysis:
        """Return empty analysis with feedback message"""
        return SquatAnalysis(
            is_squat_position=False,
            knee_angle=0.0,
            hip_angle=0.0,
            back_angle=0.0,
            hip_depth=0.0,
            form_feedback=feedback,
            checkpoint_results={}
        )