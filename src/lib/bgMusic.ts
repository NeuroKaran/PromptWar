/**
 * Background Music Engine
 * Procedurally generates ambient lo-fi background music using Web Audio API.
 * No external audio files — everything is synthesized.
 *
 * Architecture:
 * - A slow pentatonic melody on a soft sine/triangle oscillator
 * - A deep sub-bass pad for warmth
 * - Gentle arpeggiated chords that evolve over time
 * - Integrates with TabVisibilityManager to pause when hidden
 */

import { getTabVisibility } from './tabVisibility';

// Pentatonic scale notes (C minor pentatonic across octaves for a chill vibe)
const MELODY_NOTES = [
  262, 311, 349, 392, 466,   // C4 Eb4 F4 G4 Bb4
  523, 622, 698, 784, 932,   // C5 Eb5 F5 G5 Bb5
];

const BASS_NOTES = [65, 73, 87, 98, 117]; // C2 Eb2 F2 G2 Bb2

const CHORD_SETS = [
  [262, 311, 392],   // Cm
  [349, 466, 523],   // Fm/Bb
  [311, 392, 523],   // Eb
  [233, 311, 392],   // Bb
];

class BgMusicEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private melodyTimer: ReturnType<typeof setTimeout> | null = null;
  private chordTimer: ReturnType<typeof setTimeout> | null = null;
  private bassTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubVisibility: (() => void) | null = null;
  private volume = 0.18;
  private _isMuted = false;
  private chordIndex = 0;

  /**
   * Start the background music. Must be called from a user gesture context
   * (or after an AudioContext has already been unlocked).
   */
  start(existingContext?: AudioContext): void {
    if (this.isPlaying) return;

    try {
      this.context = existingContext ?? new AudioContext();

      if (this.context.state === 'suspended') {
        this.context.resume();
      }

      this.masterGain = this.context.createGain();
      this.masterGain.gain.setValueAtTime(
        this._isMuted ? 0 : this.volume,
        this.context.currentTime
      );
      this.masterGain.connect(this.context.destination);

      this.isPlaying = true;
      this.scheduleMelody();
      this.scheduleChords();
      this.scheduleBass();

      // Pause/resume on tab visibility
      this.unsubVisibility = getTabVisibility().subscribe((visible) => {
        if (!this.masterGain || !this.context) return;
        if (visible) {
          if (this.context.state === 'suspended') this.context.resume();
          this.masterGain.gain.linearRampToValueAtTime(
            this._isMuted ? 0 : this.volume,
            this.context.currentTime + 0.5
          );
        } else {
          this.masterGain.gain.linearRampToValueAtTime(
            0,
            this.context.currentTime + 0.3
          );
        }
      });
    } catch {
      // Audio is non-critical
    }
  }

  stop(): void {
    this.isPlaying = false;
    if (this.melodyTimer) clearTimeout(this.melodyTimer);
    if (this.chordTimer) clearTimeout(this.chordTimer);
    if (this.bassTimer) clearTimeout(this.bassTimer);
    if (this.unsubVisibility) this.unsubVisibility();

    if (this.masterGain && this.context) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.5);
    }
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    if (this.masterGain && this.context) {
      this.masterGain.gain.linearRampToValueAtTime(
        this._isMuted ? 0 : this.volume,
        this.context.currentTime + 0.3
      );
    }
    return this._isMuted;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  // ─── Melody ─────────────────────────────────────────────────────────

  private scheduleMelody(): void {
    if (!this.isPlaying) return;

    const note = MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
    const duration = 1.5 + Math.random() * 2; // 1.5–3.5s per note
    const gap = 400 + Math.random() * 1200;   // pause between notes

    this.playMelodyNote(note, duration);

    this.melodyTimer = setTimeout(() => {
      this.scheduleMelody();
    }, (duration * 1000) + gap);
  }

  private playMelodyNote(freq: number, duration: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    // Slight vibrato for warmth
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4 + Math.random() * 2, this.context.currentTime);
    lfoGain.gain.setValueAtTime(2, this.context.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.context.currentTime);
    filter.Q.setValueAtTime(1, this.context.currentTime);

    const vol = 0.12 + Math.random() * 0.06;
    const t = this.context.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.15);
    gain.gain.setValueAtTime(vol, t + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    lfo.start(t);
    osc.start(t);
    osc.stop(t + duration);
    lfo.stop(t + duration);
  }

  // ─── Chords ─────────────────────────────────────────────────────────

  private scheduleChords(): void {
    if (!this.isPlaying) return;

    const chord = CHORD_SETS[this.chordIndex % CHORD_SETS.length];
    this.chordIndex++;
    const duration = 4 + Math.random() * 3; // 4–7s

    this.playChordPad(chord, duration);

    this.chordTimer = setTimeout(() => {
      this.scheduleChords();
    }, duration * 1000 + 500);
  }

  private playChordPad(freqs: number[], duration: number): void {
    if (!this.context || !this.masterGain) return;

    freqs.forEach((freq) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.context!.currentTime);

      const vol = 0.04;
      const t = this.context!.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.8);
      gain.gain.setValueAtTime(vol, t + duration * 0.5);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + duration + 0.1);
    });
  }

  // ─── Bass ───────────────────────────────────────────────────────────

  private scheduleBass(): void {
    if (!this.isPlaying) return;

    const note = BASS_NOTES[Math.floor(Math.random() * BASS_NOTES.length)];
    const duration = 3 + Math.random() * 3; // 3–6s

    this.playBassNote(note, duration);

    this.bassTimer = setTimeout(() => {
      this.scheduleBass();
    }, duration * 1000 + 800);
  }

  private playBassNote(freq: number, duration: number): void {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.context.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.context.currentTime);

    const vol = 0.08;
    const t = this.context.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.3);
    gain.gain.setValueAtTime(vol, t + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.1);
  }
}

// Singleton
let bgMusicInstance: BgMusicEngine | null = null;

export function getBgMusic(): BgMusicEngine {
  if (!bgMusicInstance) {
    bgMusicInstance = new BgMusicEngine();
  }
  return bgMusicInstance;
}

export { BgMusicEngine };
