// voiceFeedback.js
/**
 * Voice Feedback Helper using Web Speech API
 * Converted from Android TTS to browser-based speech synthesis
 */

class VoiceFeedbackHelper {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.pitch = 0.95;
    this.rate = 0.95;
    this.volume = 1.0;
    
    this.lastFeedbackTime = 0;
    this.lastSpokenText = "";
    this.MIN_TIME_BETWEEN_FEEDBACK_MS = 2000;
    
    this.initialized = false;
    this.initializeVoices();
    
    console.log("✅ VoiceFeedbackHelper initialized");
  }

  initializeVoices() {
    // Wait for voices to load
    if (this.synth.getVoices().length > 0) {
      this.selectBestVoice();
      this.initialized = true;
    } else {
      this.synth.addEventListener('voiceschanged', () => {
        this.selectBestVoice();
        this.initialized = true;
      });
    }
  }

  selectBestVoice() {
    const voices = this.synth.getVoices();
    
    // Try to find a high-quality English voice
    // Preference order:
    // 1. Google US English Female
    // 2. Microsoft voices
    // 3. Any US English voice
    // 4. Any English voice
    
    const preferredVoices = [
      'Google US English Female',
      'Google US English',
      'Microsoft Zira',
      'Microsoft David',
      'Samantha',
      'Karen',
      'Moira',
      'Fiona'
    ];
    
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred));
      if (voice) {
        this.voice = voice;
        console.log(`✅ Voice selected: ${voice.name}`);
        return;
      }
    }
    
    // Fallback: US English
    const usEnglish = voices.find(v => v.lang === 'en-US');
    if (usEnglish) {
      this.voice = usEnglish;
      console.log(`✅ Voice selected: ${usEnglish.name}`);
      return;
    }
    
    // Last resort: any English
    const anyEnglish = voices.find(v => v.lang.startsWith('en'));
    if (anyEnglish) {
      this.voice = anyEnglish;
      console.log(`✅ Voice selected: ${anyEnglish.name}`);
    } else if (voices.length > 0) {
      this.voice = voices[0];
      console.log(`⚠️ Using default voice: ${voices[0].name}`);
    }
  }

  speak(text, priority = 'NORMAL') {
    if (!this.initialized || !text || text.trim() === '') {
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastFeedback = currentTime - this.lastFeedbackTime;

    let shouldSpeak = false;

    switch (priority) {
      case 'HIGH':
        shouldSpeak = text !== this.lastSpokenText || 
                      timeSinceLastFeedback > this.MIN_TIME_BETWEEN_FEEDBACK_MS;
        break;
      case 'NORMAL':
        shouldSpeak = timeSinceLastFeedback > this.MIN_TIME_BETWEEN_FEEDBACK_MS;
        break;
      case 'LOW':
        shouldSpeak = timeSinceLastFeedback > this.MIN_TIME_BETWEEN_FEEDBACK_MS * 2;
        break;
      default:
        shouldSpeak = timeSinceLastFeedback > this.MIN_TIME_BETWEEN_FEEDBACK_MS;
    }

    if (shouldSpeak) {
      this.speakImmediate(text);
    }
  }

  speakImmediate(text) {
    if (!text || text.trim() === '') {
      console.warn("❌ Attempted to speak empty text");
      return;
    }

    if (!this.initialized) {
      console.error("❌ Speech synthesis not initialized!");
      return;
    }

    // Cancel any ongoing speech
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      console.log(`🔊 Speaking: ${text}`);
    };

    utterance.onend = () => {
      console.log(`✅ Speech completed: ${text}`);
    };

    utterance.onerror = (event) => {
      console.error(`❌ Speech error: ${event.error}`);
    };

    this.synth.speak(utterance);

    this.lastFeedbackTime = Date.now();
    this.lastSpokenText = text;
  }

  stop() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }

  isSpeaking() {
    return this.synth.speaking;
  }

  setSpeechRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
    console.log(`Speech rate set to: ${this.rate}`);
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.0, Math.min(2.0, pitch));
    console.log(`Pitch set to: ${this.pitch}`);
  }

  setVolume(volume) {
    this.volume = Math.max(0.0, Math.min(1.0, volume));
    console.log(`Volume set to: ${this.volume}`);
  }

  getCurrentVoiceInfo() {
    if (this.voice) {
      return `${this.voice.name} (${this.voice.lang})`;
    }
    return "No voice selected";
  }

  getAvailableVoices() {
    return this.synth.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default
    }));
  }

  setVoice(voiceName) {
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    
    if (voice) {
      this.voice = voice;
      console.log(`✅ Voice changed to: ${voice.name}`);
      return true;
    } else {
      console.warn(`⚠️ Voice not found: ${voiceName}`);
      return false;
    }
  }
}

export default VoiceFeedbackHelper;