/**
 * Web Audio API synthesizer for rich Werewolves sound effects & atmospheric suspense soundtrack
 * Requires zero external audio files, ultra-low latency, works on all devices!
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private musicPlaying: boolean = false;
  private musicVolume: number = 0.25;

  // Music nodes references
  private musicGainNode: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private musicInterval: any = null;
  private musicListeners: Set<(isPlaying: boolean) => void> = new Set();

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.sfxEnabled;
  }

  public subscribeMusic(callback: (isPlaying: boolean) => void): () => void {
    this.musicListeners.add(callback);
    callback(this.musicPlaying);
    return () => this.musicListeners.delete(callback);
  }

  private notifyMusic() {
    this.musicListeners.forEach((cb) => cb(this.musicPlaying));
  }

  public isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGainNode && this.ctx) {
      this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.35, this.ctx.currentTime);
    }
  }

  /**
   * Generative Dark Ambient Suspense Soundtrack
   * Atmospheric low drone + eerie melodic minor notes in D Minor
   */
  public startSuspenseMusic() {
    if (this.musicPlaying) return;
    this.init();
    if (!this.ctx) return;

    try {
      this.musicPlaying = true;
      const now = this.ctx.currentTime;

      // Master music gain
      const masterMusicGain = this.ctx.createGain();
      masterMusicGain.gain.setValueAtTime(0.001, now);
      masterMusicGain.gain.exponentialRampToValueAtTime(this.musicVolume * 0.35, now + 2.5);
      masterMusicGain.connect(this.ctx.destination);
      this.musicGainNode = masterMusicGain;

      // Filter for warm dark drone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      filter.Q.setValueAtTime(2, now);
      filter.connect(masterMusicGain);
      this.droneFilter = filter;

      // Low sub drone (D1 - 36.7Hz and D2 - 73.4Hz + detuned A1 55Hz)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(73.42, now); // D2

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(36.71, now); // D1 sub

      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(110.0, now); // A2 (fifth)

      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0.3, now);

      osc1.connect(droneGain);
      osc2.connect(droneGain);
      osc3.connect(droneGain);
      droneGain.connect(filter);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      this.droneOsc1 = osc1;
      this.droneOsc2 = osc2;

      // Eerie random melodic notes in D minor (D, F, G, A, Bb, C#, D)
      const scaleFrequencies = [
        146.83, // D3
        174.61, // F3
        196.0,  // G3
        220.0,  // A3
        233.08, // Bb3
        277.18, // C#4
        293.66, // D4
        349.23, // F4
        440.0,  // A4
        466.16, // Bb4
        554.37, // C#5
        587.33, // D5
      ];

      const playMelodyNote = () => {
        if (!this.musicPlaying || !this.ctx || !this.musicGainNode) return;
        try {
          const t = this.ctx.currentTime;
          const noteOsc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          const noteFilter = this.ctx.createBiquadFilter();

          const freq = scaleFrequencies[Math.floor(Math.random() * scaleFrequencies.length)];
          noteOsc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
          noteOsc.frequency.setValueAtTime(freq, t);

          noteFilter.type = 'bandpass';
          noteFilter.frequency.setValueAtTime(freq, t);
          noteFilter.Q.setValueAtTime(3, t);

          // Ethereal slow attack and long ringing decay
          const duration = 2.5 + Math.random() * 2.0;
          noteGain.gain.setValueAtTime(0.0001, t);
          noteGain.gain.exponentialRampToValueAtTime(0.18, t + 0.6);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

          noteOsc.connect(noteFilter);
          noteFilter.connect(noteGain);
          noteGain.connect(this.musicGainNode);

          noteOsc.start(t);
          noteOsc.stop(t + duration + 0.1);
        } catch (e) {
          // ignore
        }
      };

      // Play an eerie chime note every 1.8 to 3.5 seconds
      const scheduleNextNote = () => {
        if (!this.musicPlaying) return;
        playMelodyNote();
        const delay = 1800 + Math.random() * 2200;
        this.musicInterval = setTimeout(scheduleNextNote, delay);
      };

      this.musicInterval = setTimeout(scheduleNextNote, 800);
      this.notifyMusic();
    } catch (e) {
      console.warn('Suspense music error', e);
      this.musicPlaying = false;
      this.notifyMusic();
    }
  }

  public stopSuspenseMusic() {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;

    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }

    try {
      if (this.ctx && this.musicGainNode) {
        const now = this.ctx.currentTime;
        this.musicGainNode.gain.cancelScheduledValues(now);
        this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
        this.musicGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        setTimeout(() => {
          try {
            this.droneOsc1?.stop();
            this.droneOsc2?.stop();
            this.droneOsc1?.disconnect();
            this.droneOsc2?.disconnect();
            this.musicGainNode?.disconnect();
          } catch (e) {
            // ignore
          }
          this.droneOsc1 = null;
          this.droneOsc2 = null;
          this.musicGainNode = null;
        }, 1300);
      }
    } catch (e) {
      // ignore
    }

    this.notifyMusic();
  }

  public toggleSuspenseMusic(): boolean {
    if (this.musicPlaying) {
      this.stopSuspenseMusic();
      return false;
    } else {
      this.startSuspenseMusic();
      return true;
    }
  }

  // ==========================================
  // High Quality Sound Effects Synthesizers
  // ==========================================

  /**
   * Spooky & Atmospheric Wolf Howl (Multi-oscillator detuned with resonant vocal formant sweep)
   */
  public playWolfHowl() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      // Pitch sweep mimicking real wild wolf howl
      const pitchCurve = (osc: OscillatorNode, detune: number) => {
        osc.frequency.setValueAtTime(135 + detune, now);
        osc.frequency.exponentialRampToValueAtTime(320 + detune, now + 0.7);
        osc.frequency.exponentialRampToValueAtTime(440 + detune, now + 1.3);
        osc.frequency.exponentialRampToValueAtTime(380 + detune, now + 2.0);
        osc.frequency.exponentialRampToValueAtTime(210 + detune, now + 3.0);
        osc.frequency.exponentialRampToValueAtTime(95 + detune, now + 4.2);
      };

      pitchCurve(osc1, 0);
      pitchCurve(osc2, 2.5); // Rich chorus detune

      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.5, now);
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + 1.2);
      filter.frequency.exponentialRampToValueAtTime(350, now + 3.8);

      // Volume envelope with long haunting breath fadeout
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.6);
      gain.gain.setValueAtTime(0.38, now + 2.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.3);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 4.4);
      osc2.stop(now + 4.4);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Deep Heavy Church Bell / Midnight Gong with Bronze Harmonics
   */
  public playMidnightGong() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Inharmonic bell partials: fundamental + minor 3rd + fifth + octave + upper partials
      const partials = [
        { f: 98.0, g: 0.45, d: 4.5 },   // G2 Fundamental (heavy body)
        { f: 196.0, g: 0.35, d: 4.0 },  // G3 Octave
        { f: 233.08, g: 0.3, d: 3.5 },  // Bb3 Minor 3rd (spooky bell hum)
        { f: 293.66, g: 0.25, d: 3.0 }, // D4 Quint
        { f: 392.0, g: 0.2, d: 2.5 },   // G4 Strike tone
        { f: 587.33, g: 0.15, d: 1.8 }, // D5 Upper chime
        { f: 880.0, g: 0.08, d: 1.2 },  // A5 Ring
      ];

      partials.forEach(({ f, g, d }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f + (Math.random() - 0.5) * 1.5, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(g, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + d + 0.1);
      });
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Witch bubbling cauldron / potion
   */
  public playPotionBubble() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 9; i++) {
        const bubbleTime = now + i * 0.13;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        const startFreq = 220 + Math.random() * 250;
        const endFreq = 650 + Math.random() * 500;
        osc.frequency.setValueAtTime(startFreq, bubbleTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, bubbleTime + 0.09);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(endFreq, bubbleTime);
        filter.Q.setValueAtTime(5, bubbleTime);

        gain.gain.setValueAtTime(0.18, bubbleTime);
        gain.gain.exponentialRampToValueAtTime(0.001, bubbleTime + 0.11);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(bubbleTime);
        osc.stop(bubbleTime + 0.12);
      }
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Rooster & Golden Sunrise Awakening Fanfare
   */
  public playDawnAwakening() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Majestic chord progression: D4 -> F#4 -> A4 -> D5
      const notes = [293.66, 369.99, 440.0, 587.33];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = now + idx * 0.2;
        const osc = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(freq * 2, noteTime);

        const dur = 1.6;
        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.24, noteTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + dur);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        oscHarmonic.start(noteTime);
        osc.stop(noteTime + dur + 0.1);
        oscHarmonic.stop(noteTime + dur + 0.1);
      });
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Dramatic Sub-Bass Heartbeat Tension (Lub-Dub)
   */
  public playHeartbeat() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [
        { offset: 0, freq: 62, dur: 0.16, vol: 0.45 },
        { offset: 0.19, freq: 52, dur: 0.22, vol: 0.55 },
      ].forEach(({ offset, freq, dur, vol }) => {
        if (!this.ctx) return;
        const time = now + offset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, time);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Dramatic Lynch / Gavel of Execution Doom Strike
   */
  public playLynchStrike() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Heavy wood thud + dark minor chord ring
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.type = 'triangle';
      oscThud.frequency.setValueAtTime(150, now);
      oscThud.frequency.exponentialRampToValueAtTime(35, now + 0.25);
      gainThud.gain.setValueAtTime(0.5, now);
      gainThud.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      oscThud.connect(gainThud);
      gainThud.connect(this.ctx.destination);
      oscThud.start(now);
      oscThud.stop(now + 0.35);

      [110, 130.81, 164.81].forEach((f) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + 0.02);
        g.gain.setValueAtTime(0.2, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now + 0.02);
        osc.stop(now + 2.1);
      });
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Psychic Vision / Seer Glass Chime
   */
  public playSeerChime() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const crystalNotes = [587.33, 880.0, 1174.66, 1760.0];
      crystalNotes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = now + idx * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 1.9);
      });
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Card Reveal Swoosh
   */
  public playCardFlip() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn('Audio error', e);
    }
  }

  /**
   * Victory Fanfare
   */
  public playVictory() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const melody = [
        { f: 523.25, t: 0 },
        { f: 659.25, t: 0.15 },
        { f: 783.99, t: 0.3 },
        { f: 1046.5, t: 0.5 },
        { f: 1318.51, t: 0.8 },
      ];
      melody.forEach((note) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);

        gain.gain.setValueAtTime(0.28, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + 1.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + note.t);
        osc.stop(now + note.t + 1.5);
      });
    } catch (e) {
      console.warn('Audio error', e);
    }
  }
}

export const sounds = new SoundEngine();
