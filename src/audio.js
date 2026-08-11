/**
 * Web Audio API & Web Speech Synthesis Controller
 * Pure Web Audio synth (zero external audio files needed) + Native SpeechSynthesis.
 */

export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.ambientGain = null;
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.isAmbientPlaying = false;
    
    // Text-To-Speech
    this.synth = window.speechSynthesis || null;
    this.spanishVoice = null;
    this.isTTSActive = false;
    this.currentUtterance = null;
    this.ttsRate = 1.0;

    this.initSpeech();
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initSpeech() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Find best Spanish voice
      this.spanishVoice = voices.find(v => v.lang.startsWith('es-')) || voices.find(v => v.lang.includes('es')) || voices[0];
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  toggleAmbient(enable) {
    this.initAudioContext();
    
    if (enable) {
      if (this.isAmbientPlaying) return;
      
      // Create ambient space drone
      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.ambientGain.gain.exponentialRampToValueAtTime(0.18, this.audioCtx.currentTime + 3);

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.audioCtx.currentTime);

      this.ambientOsc1 = this.audioCtx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, this.audioCtx.currentTime); // A1 note

      this.ambientOsc2 = this.audioCtx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(110.5, this.audioCtx.currentTime); // Slight detune

      this.ambientOsc1.connect(filter);
      this.ambientOsc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.audioCtx.destination);

      this.ambientOsc1.start();
      this.ambientOsc2.start();
      this.isAmbientPlaying = true;
    } else {
      if (!this.isAmbientPlaying || !this.ambientGain) return;
      this.ambientGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
      setTimeout(() => {
        if (this.ambientOsc1) this.ambientOsc1.stop();
        if (this.ambientOsc2) this.ambientOsc2.stop();
        this.isAmbientPlaying = false;
      }, 800);
    }
  }

  playIntroFanfare() {
    this.initAudioContext();
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    
    // Brass style fanfare notes (Bb - F - Bb)
    osc.frequency.setValueAtTime(233.08, now); // Bb3
    osc.frequency.setValueAtTime(349.23, now + 0.3); // F4
    osc.frequency.setValueAtTime(466.16, now + 0.6); // Bb4

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 3.0);
  }

  playLaserClick() {
    if (!this.audioCtx) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playHyperdriveSFX() {
    if (!this.audioCtx) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 1.4);
  }

  /* ================= Speech Synthesis (Text To Speech) ================= */

  speakText(text, onEndCallback = null) {
    if (!this.synth) return;
    
    this.stopSpeech();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    if (this.spanishVoice) {
      this.currentUtterance.voice = this.spanishVoice;
    }
    this.currentUtterance.lang = 'es-ES';
    this.currentUtterance.rate = this.ttsRate;

    if (onEndCallback) {
      this.currentUtterance.onend = onEndCallback;
    }

    this.synth.speak(this.currentUtterance);
    this.isTTSActive = true;
  }

  setSpeechRate(rate) {
    this.ttsRate = Math.max(0.5, Math.min(2.5, rate));
    if (this.currentUtterance) {
      this.currentUtterance.rate = this.ttsRate;
    }
  }

  stopSpeech() {
    if (this.synth) {
      this.synth.cancel();
      this.isTTSActive = false;
    }
  }

  pauseSpeech() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  resumeSpeech() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }
}
