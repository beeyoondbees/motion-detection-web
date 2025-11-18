// squatDetector.js
/**
 * Squat Detector - JavaScript Implementation
 * Converted from Android/Kotlin for web application
 * Detects and counts perfect squat form using pose landmarks
 */

class SquatDetector {
  // Landmark indices (MediaPipe Pose)
  static LEFT_SHOULDER = 11;
  static RIGHT_SHOULDER = 12;
  static LEFT_HIP = 23;
  static RIGHT_HIP = 24;
  static LEFT_KNEE = 25;
  static RIGHT_KNEE = 26;
  static LEFT_ANKLE = 27;
  static RIGHT_ANKLE = 28;

  // Detection thresholds
  static STANDING_KNEE_THRESHOLD = 130.0;
  static SQUATTING_KNEE_THRESHOLD = 120.0;

  // Perfect squat criteria (LOWER BODY ONLY)
  static KNEE_PERFECT_MIN = 50.0;
  static KNEE_PERFECT_MAX = 110.0;
  static HIP_PERFECT_MIN = 60.0;
  static HIP_PERFECT_MAX = 120.0;
  static MIN_HIP_DEPTH_RATIO = 0.85;

  // Back/shoulder (tracked but not required)
  static BACK_LEAN_MIN = 0.0;
  static BACK_LEAN_MAX = 45.0;

  constructor() {
    this.reset();
    console.log("✅ SquatDetector initialized");
  }

  reset() {
    this.squatCount = 0;
    this.totalAttempts = 0;
    this.correctSquats = 0;
    this.missedSquats = 0;

    // Accuracy tracking
    this.kneeCorrectFrames = 0;
    this.hipCorrectFrames = 0;
    this.backCorrectFrames = 0;
    this.totalFramesInCorrectSquats = 0;

    // Current squat tracking
    this.currentSquatKneeFrames = 0;
    this.currentSquatHipFrames = 0;
    this.currentSquatBackFrames = 0;
    this.currentSquatTotalFrames = 0;

    // State machine
    this.wasStanding = true;
    this.isCurrentlySquatting = false;
    this.lowestKneeAngleThisSquat = 180.0;
    this.bestFormThisSquat = false;

    // Completion tracking
    this.lastSquatAnalysis = null;
    this.lastSquatWasPerfect = false;
    this.squatJustCompleted = false;

    // Debug
    this.frameCount = 0;
    this.lastLogFrame = 0;
  }

  /**
   * Main detection method - processes pose landmarks
   * @param {Array} landmarks - Array of pose landmarks with x, y, z, visibility
   * @returns {Object} SquatAnalysis with current form assessment
   */
  detectSquat(landmarks) {
    this.frameCount++;

    if (!landmarks || landmarks.length < 33) {
      return this.getEmptyAnalysis("No pose detected");
    }

    // Calculate angles
    const leftKneeAngle = this.calculateAngle(
      landmarks[SquatDetector.LEFT_HIP],
      landmarks[SquatDetector.LEFT_KNEE],
      landmarks[SquatDetector.LEFT_ANKLE]
    );
    const rightKneeAngle = this.calculateAngle(
      landmarks[SquatDetector.RIGHT_HIP],
      landmarks[SquatDetector.RIGHT_KNEE],
      landmarks[SquatDetector.RIGHT_ANKLE]
    );
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const leftHipAngle = this.calculateAngle(
      landmarks[SquatDetector.LEFT_SHOULDER],
      landmarks[SquatDetector.LEFT_HIP],
      landmarks[SquatDetector.LEFT_KNEE]
    );
    const rightHipAngle = this.calculateAngle(
      landmarks[SquatDetector.RIGHT_SHOULDER],
      landmarks[SquatDetector.RIGHT_HIP],
      landmarks[SquatDetector.RIGHT_KNEE]
    );
    const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

    const backLean = this.calculateBackLean(
      landmarks[SquatDetector.LEFT_SHOULDER],
      landmarks[SquatDetector.RIGHT_SHOULDER],
      landmarks[SquatDetector.LEFT_HIP],
      landmarks[SquatDetector.RIGHT_HIP]
    );

    const hipDepth = this.calculateHipDepth(
      landmarks[SquatDetector.LEFT_HIP],
      landmarks[SquatDetector.RIGHT_HIP],
      landmarks[SquatDetector.LEFT_KNEE],
      landmarks[SquatDetector.RIGHT_KNEE]
    );

    // Log every 30 frames
    if (this.frameCount - this.lastLogFrame >= 30) {
      console.log(
        `📊 Frame ${this.frameCount} | ` +
        `Knee: ${avgKneeAngle.toFixed(0)}° | ` +
        `Hip: ${avgHipAngle.toFixed(0)}° | ` +
        `Back: ${backLean.toFixed(0)}° | ` +
        `Depth: ${hipDepth.toFixed(2)}`
      );
      console.log(
        `   State: ${this.isCurrentlySquatting ? 'SQUATTING' : 'STANDING'} | ` +
        `Total: ${this.totalAttempts} | ` +
        `Correct: ${this.correctSquats} | ` +
        `Missed: ${this.missedSquats}`
      );
      this.lastLogFrame = this.frameCount;
    }

    // Check form - FOCUS ON LOWER BODY ONLY
    const kneesGood = avgKneeAngle >= SquatDetector.KNEE_PERFECT_MIN && 
                      avgKneeAngle <= SquatDetector.KNEE_PERFECT_MAX;
    const hipsGood = avgHipAngle >= SquatDetector.HIP_PERFECT_MIN && 
                     avgHipAngle <= SquatDetector.HIP_PERFECT_MAX;
    const depthGood = hipDepth >= SquatDetector.MIN_HIP_DEPTH_RATIO;
    const backGood = backLean >= SquatDetector.BACK_LEAN_MIN && 
                     backLean <= SquatDetector.BACK_LEAN_MAX;

    // Perfect squat = good lower body (knee + hip + depth)
    const lowerBodyPerfect = kneesGood && hipsGood && depthGood;
    const isPerfectForm = lowerBodyPerfect;

    // Track performance during squat
    if (this.isCurrentlySquatting) {
      this.currentSquatTotalFrames++;
      if (kneesGood) this.currentSquatKneeFrames++;
      if (hipsGood && depthGood) this.currentSquatHipFrames++;
      if (backGood) this.currentSquatBackFrames++;

      if (avgKneeAngle < this.lowestKneeAngleThisSquat) {
        this.lowestKneeAngleThisSquat = avgKneeAngle;
      }

      if (lowerBodyPerfect) {
        this.bestFormThisSquat = true;
      }
    }

    // STATE MACHINE
    const isStanding = avgKneeAngle >= SquatDetector.STANDING_KNEE_THRESHOLD;
    const isSquatting = avgKneeAngle < SquatDetector.SQUATTING_KNEE_THRESHOLD;

    if (this.wasStanding && isSquatting) {
      // 🔽 SQUAT STARTED
      this.isCurrentlySquatting = true;
      this.wasStanding = false;
      this.lowestKneeAngleThisSquat = avgKneeAngle;
      this.bestFormThisSquat = false;

      this.currentSquatTotalFrames = 0;
      this.currentSquatKneeFrames = 0;
      this.currentSquatHipFrames = 0;
      this.currentSquatBackFrames = 0;

      console.log("🔽 ========== SQUAT STARTED ==========");
      console.log(`   Frame: ${this.frameCount} | Knee: ${avgKneeAngle.toFixed(0)}°`);
      console.log("=" .repeat(40));

    } else if (!this.wasStanding && isStanding && this.isCurrentlySquatting) {
      // 🔼 SQUAT COMPLETED!
      this.isCurrentlySquatting = false;
      this.wasStanding = true;
      this.totalAttempts++;
      this.squatJustCompleted = true;

      console.log("🔼 ========== SQUAT COMPLETED ==========");
      console.log(`   Frame: ${this.frameCount} | Lowest Knee: ${this.lowestKneeAngleThisSquat.toFixed(0)}°`);
      console.log("   Checking criteria:");
      console.log(`      Knee: ${kneesGood ? '✓' : '✗'} ${avgKneeAngle.toFixed(0)}° (need ${SquatDetector.KNEE_PERFECT_MIN}-${SquatDetector.KNEE_PERFECT_MAX}°)`);
      console.log(`      Hip: ${hipsGood ? '✓' : '✗'} ${avgHipAngle.toFixed(0)}° (need ${SquatDetector.HIP_PERFECT_MIN}-${SquatDetector.HIP_PERFECT_MAX}°)`);
      console.log(`      Depth: ${depthGood ? '✓' : '✗'} ${hipDepth.toFixed(2)} (need ≥${SquatDetector.MIN_HIP_DEPTH_RATIO})`);
      console.log(`      Back: ${backGood ? '✓' : '✗'} ${backLean.toFixed(0)}° (tracked but NOT required)`);

      const sufficientDepth = this.lowestKneeAngleThisSquat < 110.0;

      if (this.bestFormThisSquat && sufficientDepth) {
        // ✅ PERFECT SQUAT!
        this.squatCount++;
        this.correctSquats++;
        this.lastSquatWasPerfect = true;

        this.totalFramesInCorrectSquats += this.currentSquatTotalFrames;
        this.kneeCorrectFrames += this.currentSquatKneeFrames;
        this.hipCorrectFrames += this.currentSquatHipFrames;
        this.backCorrectFrames += this.currentSquatBackFrames;

        console.log(`✅ RESULT: PERFECT SQUAT #${this.squatCount}`);
        console.log("   ⭐ Lower body form was excellent!");
      } else {
        // ❌ IMPERFECT SQUAT
        this.missedSquats++;
        this.lastSquatWasPerfect = false;

        console.log("❌ RESULT: IMPERFECT SQUAT (NOT COUNTED)");
        if (!sufficientDepth) {
          console.log(`   ✗ Insufficient depth: ${this.lowestKneeAngleThisSquat.toFixed(0)}° (need <110°)`);
        }
        if (!this.bestFormThisSquat) {
          console.log("   ✗ Lower body form issues");
        }
      }

      console.log(`   TOTALS: Attempts=${this.totalAttempts} | Correct=${this.correctSquats} | Missed=${this.missedSquats}`);
      console.log("=" .repeat(40));

    } else if (isStanding) {
      this.wasStanding = true;
      this.isCurrentlySquatting = false;
    }

    // Generate checkpoints and feedback
    const checkpoints = this.generateCheckpoints(backGood, hipsGood && depthGood, kneesGood, depthGood);
    const feedback = this.generateFeedback(isPerfectForm, backGood, hipsGood, kneesGood, depthGood, this.isCurrentlySquatting);

    const squatAnalysis = {
      isSquatPosition: isPerfectForm,
      kneeAngle: avgKneeAngle,
      hipAngle: avgHipAngle,
      backAngle: backLean,
      hipDepth: hipDepth,
      formFeedback: feedback,
      checkpointResults: checkpoints
    };

    this.lastSquatAnalysis = squatAnalysis;
    return squatAnalysis;
  }

  hasSquatJustCompleted() {
    const completed = this.squatJustCompleted;
    this.squatJustCompleted = false;
    return completed;
  }

  wasLastSquatPerfect() {
    return this.lastSquatWasPerfect;
  }

  getSquatCompletionFeedback(wasPerfect) {
    if (wasPerfect) {
      const phrases = [
        `Great job! Perfect squat! ${this.squatCount}`,
        `Nice form! Keep going! ${this.squatCount}`,
        `Excellent squat, well done! ${this.squatCount}`,
        `Perfect! That's ${this.squatCount}`,
        `Amazing form! ${this.squatCount} squats`
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    } else {
      return this.determineBadSquatFeedback();
    }
  }

  determineBadSquatFeedback() {
    if (!this.lastSquatAnalysis) {
      return "Please adjust your form";
    }

    const analysis = this.lastSquatAnalysis;

    if (this.lowestKneeAngleThisSquat >= 110.0) {
      return "Go deeper. Bend your knees more";
    } else if (!(analysis.kneeAngle >= SquatDetector.KNEE_PERFECT_MIN && analysis.kneeAngle <= SquatDetector.KNEE_PERFECT_MAX)) {
      return "Please adjust your form. Check your knee position";
    } else if (!(analysis.hipAngle >= SquatDetector.HIP_PERFECT_MIN && analysis.hipAngle <= SquatDetector.HIP_PERFECT_MAX)) {
      return "Please adjust your form. Push your hips back";
    } else if (analysis.hipDepth < SquatDetector.MIN_HIP_DEPTH_RATIO) {
      return "Please adjust your form. Go deeper";
    } else {
      return "Please adjust your form";
    }
  }

  getFeedbackData() {
    let kneePercentage = 0;
    let hipPercentage = 0;
    let backPercentage = 0;

    if (this.totalFramesInCorrectSquats > 0) {
      kneePercentage = Math.floor((this.kneeCorrectFrames * 100) / this.totalFramesInCorrectSquats);
      hipPercentage = Math.floor((this.hipCorrectFrames * 100) / this.totalFramesInCorrectSquats);
      backPercentage = Math.floor((this.backCorrectFrames * 100) / this.totalFramesInCorrectSquats);
    }

    return {
      total: this.totalAttempts,
      correct: this.correctSquats,
      missed: this.missedSquats,
      kneePercentage,
      hipPercentage,
      backPercentage,
      kneeCorrectFrames: this.kneeCorrectFrames,
      hipCorrectFrames: this.hipCorrectFrames,
      backCorrectFrames: this.backCorrectFrames,
      totalFramesInCorrectSquats: this.totalFramesInCorrectSquats
    };
  }

  getSquatCount() {
    return this.squatCount;
  }

  // Helper methods

  calculateAngle(firstPoint, midPoint, lastPoint) {
    const radians = Math.atan2(lastPoint.y - midPoint.y, lastPoint.x - midPoint.x) -
                    Math.atan2(firstPoint.y - midPoint.y, firstPoint.x - midPoint.x);
    let angle = radians * (180 / Math.PI);

    if (angle < 0) angle += 360;
    if (angle > 180) angle = 360 - angle;

    return angle;
  }

  calculateBackLean(leftShoulder, rightShoulder, leftHip, rightHip) {
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;

    const deltaX = shoulderMidX - hipMidX;
    const deltaY = shoulderMidY - hipMidY;

    const leanAngle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);
    return Math.abs(leanAngle);
  }

  calculateHipDepth(leftHip, rightHip, leftKnee, rightKnee) {
    const hipY = (leftHip.y + rightHip.y) / 2;
    const kneeY = (leftKnee.y + rightKnee.y) / 2;

    if (kneeY === 0) return 0.0;
    return hipY / kneeY;
  }

  generateCheckpoints(shouldersGood, hipsGood, kneesGood, anklesGood) {
    return {
      [SquatDetector.LEFT_SHOULDER]: !shouldersGood,
      [SquatDetector.RIGHT_SHOULDER]: !shouldersGood,
      [SquatDetector.LEFT_HIP]: !hipsGood,
      [SquatDetector.RIGHT_HIP]: !hipsGood,
      [SquatDetector.LEFT_KNEE]: !kneesGood,
      [SquatDetector.RIGHT_KNEE]: !kneesGood,
      [SquatDetector.LEFT_ANKLE]: !anklesGood,
      [SquatDetector.RIGHT_ANKLE]: !anklesGood,
    };
  }

  generateFeedback(isPerfect, shouldersGood, hipsGood, kneesGood, anklesGood, isSquatting) {
    if (isPerfect && isSquatting) {
      return "Perfect form!";
    }

    if (isSquatting) {
      const issues = [];
      if (!hipsGood) issues.push("Hips");
      if (!kneesGood) issues.push("Knees");
      if (!anklesGood) issues.push("Depth");

      if (issues.length > 0) {
        return `Fix: ${issues.slice(0, 2).join(", ")}`;
      }
      return "Keep going";
    }

    return "Ready to squat";
  }

  getEmptyAnalysis(feedback) {
    return {
      isSquatPosition: false,
      kneeAngle: 0.0,
      hipAngle: 0.0,
      backAngle: 0.0,
      hipDepth: 0.0,
      formFeedback: feedback,
      checkpointResults: {}
    };
  }
}

export default SquatDetector;