// ============================================================
// Web Audio API sound effects manager
// ============================================================

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    delay = 0
  ) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Audio not available
    }
  }

  // ----------------------------------------------------------
  // Game sounds
  // ----------------------------------------------------------

  /** Ascending C-E-G arpeggio */
  success() {
    this.tone(523, 0.15, 'sine', 0.25, 0);
    this.tone(659, 0.15, 'sine', 0.25, 0.1);
    this.tone(784, 0.3,  'sine', 0.3,  0.2);
  }

  /** Descending buzzy tones */
  fail() {
    this.tone(300, 0.25, 'sawtooth', 0.12, 0);
    this.tone(200, 0.35, 'sawtooth', 0.08, 0.15);
  }

  /** Short beep for countdown ticks */
  countdown() {
    this.tone(440, 0.08, 'sine', 0.2);
  }

  /** Higher beep for "GO!" */
  countdownGo() {
    this.tone(880, 0.25, 'sine', 0.3);
  }

  /** Sad descending notes for losing a life */
  loseLife() {
    this.tone(400, 0.12, 'sine', 0.2, 0);
    this.tone(350, 0.12, 'sine', 0.2, 0.1);
    this.tone(280, 0.25, 'sine', 0.15, 0.2);
  }

  /** Streak chord — gets richer at higher levels */
  streak(level: number) {
    this.tone(523, 0.3, 'sine', 0.2, 0);
    this.tone(659, 0.3, 'sine', 0.2, 0);
    this.tone(784, 0.3, 'sine', 0.2, 0);
    if (level >= 5) {
      this.tone(1047, 0.4, 'sine', 0.25, 0.08);
    }
    if (level >= 10) {
      this.tone(1319, 0.5, 'sine', 0.2, 0.12);
      this.tone(1568, 0.5, 'sine', 0.15, 0.16);
    }
  }

  /** Dramatic sweep for boss rounds */
  bossAppear() {
    for (let i = 0; i < 6; i++) {
      this.tone(150 + i * 80, 0.12, 'square', 0.12, i * 0.08);
    }
    this.tone(700, 0.5, 'sine', 0.25, 0.5);
    this.tone(880, 0.4, 'sine', 0.2, 0.55);
  }

  /** Boss defeated — triumphant fanfare */
  bossDefeated() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.2, 'sine', 0.25, i * 0.12));
    this.tone(1568, 0.6, 'sine', 0.3, notes.length * 0.12);
  }

  /** New high score celebration */
  newHighScore() {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((f, i) => this.tone(f, 0.18, 'sine', 0.25, i * 0.12));
    this.tone(1568, 0.6, 'sine', 0.35, melody.length * 0.12);
  }

  /** Extra life power-up */
  extraLife() {
    this.tone(400, 0.1, 'sine', 0.2, 0);
    this.tone(600, 0.1, 'sine', 0.2, 0.08);
    this.tone(800, 0.1, 'sine', 0.2, 0.16);
    this.tone(1000, 0.3, 'sine', 0.3, 0.24);
  }

  /** Subtle click */
  click() {
    this.tone(800, 0.04, 'sine', 0.1);
  }

  /** Speed increase warning */
  speedUp() {
    this.tone(600, 0.08, 'sine', 0.15, 0);
    this.tone(800, 0.08, 'sine', 0.15, 0.06);
    this.tone(1000, 0.15, 'sine', 0.2, 0.12);
  }

  /** Play a Pokemon cry from PokeAPI */
  async pokemonCry(id: number) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const url = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Cry not available (Safari OGG, network, etc.) — silent fallback
    }
  }

  // ----------------------------------------------------------
  // Controls
  // ----------------------------------------------------------

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Must be called from a user gesture to unlock audio on mobile */
  unlock() {
    try {
      this.getCtx();
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundManager();
