/**
 * Audio Manager
 * Per Games-skills.md:
 * - Audio context requires user interaction
 * - Create AudioContext on first click/tap
 * - Resume context if suspended
 * - Use Web Audio API
 * - Pool audio sources
 * - Preload common sounds
 */

type SoundId = 'click' | 'choice_good' | 'choice_bad' | 'scene_transition' | 'day_complete' | 'ambient';

class AudioManager {
  private context: AudioContext | null = null;
  private initialized: boolean = false;
  private enabled: boolean = true;
  private masterVolume: number = 0.3;

  /**
   * Initialize AudioContext on user interaction.
   * Must be called from a user gesture event handler.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Resume if suspended (browser policy)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      this.initialized = true;
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  /**
   * Play a synthesized sound effect (no external audio files needed).
   * Uses oscillator-based synthesis for retro pixel-game feel.
   */
  play(soundId: SoundId): void {
    if (!this.initialized || !this.context || !this.enabled) return;

    // Resume context if it got suspended
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    try {
      switch (soundId) {
        case 'click':
          this.playTone(800, 0.05, 'square', 0.15);
          break;
        case 'choice_good':
          this.playChord([523, 659, 784], 0.15, 'sine', 0.2); // C major
          break;
        case 'choice_bad':
          this.playChord([311, 370, 466], 0.15, 'sawtooth', 0.12); // Eb minor
          break;
        case 'scene_transition':
          this.playArpeggio([392, 494, 587, 784], 0.08, 'triangle', 0.15);
          break;
        case 'day_complete':
          this.playArpeggio([523, 659, 784, 1047], 0.12, 'sine', 0.2);
          break;
        case 'ambient':
          // Subtle ambient pad
          this.playPad([220, 330], 2.0, 0.05);
          break;
      }
    } catch {
      // Silently fail - audio is non-critical
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    
    gain.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start(this.context.currentTime);
    osc.stop(this.context.currentTime + duration);
  }

  private playChord(freqs: number[], duration: number, type: OscillatorType, volume: number): void {
    freqs.forEach((freq) => {
      this.playTone(freq, duration, type, volume / freqs.length);
    });
  }

  private playArpeggio(freqs: number[], noteLength: number, type: OscillatorType, volume: number): void {
    if (!this.context) return;
    freqs.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.context!.currentTime);
      
      const startTime = this.context!.currentTime + i * noteLength;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume * this.masterVolume, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength * 1.5);
      
      osc.connect(gain);
      gain.connect(this.context!.destination);
      
      osc.start(startTime);
      osc.stop(startTime + noteLength * 2);
    });
  }

  private playPad(freqs: number[], duration: number, volume: number): void {
    if (!this.context) return;
    freqs.forEach((freq) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.context!.currentTime);
      
      gain.gain.setValueAtTime(0, this.context!.currentTime);
      gain.gain.linearRampToValueAtTime(volume * this.masterVolume, this.context!.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0, this.context!.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.context!.destination);
      
      osc.start(this.context!.currentTime);
      osc.stop(this.context!.currentTime + duration);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let audioInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioInstance) {
    audioInstance = new AudioManager();
  }
  return audioInstance;
}

export { AudioManager };
export type { SoundId };
