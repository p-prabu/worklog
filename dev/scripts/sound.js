export const SoundEngine = {
  ctx: null,
  enabled: true,

  getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  },

  playChime() {
    if (!this.enabled) {
      return;
    }
    try {
      const ctx = this.getCtx();
      const time = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, time);
      oscillator.frequency.exponentialRampToValueAtTime(660, time + 0.3);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
      oscillator.start(time);
      oscillator.stop(time + 0.7);

      const secondOscillator = ctx.createOscillator();
      const secondGain = ctx.createGain();
      secondOscillator.connect(secondGain);
      secondGain.connect(ctx.destination);
      secondOscillator.type = "sine";
      secondOscillator.frequency.setValueAtTime(1320, time);
      secondGain.gain.setValueAtTime(0, time);
      secondGain.gain.linearRampToValueAtTime(0.06, time + 0.02);
      secondGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
      secondOscillator.start(time);
      secondOscillator.stop(time + 0.5);
    } catch {}
  },

  playLevelUp() {
    if (!this.enabled) {
      return;
    }
    try {
      const ctx = this.getCtx();
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        const time = ctx.currentTime + index * 0.1;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        oscillator.start(time);
        oscillator.stop(time + 0.4);
      });
    } catch {}
  },

  playGentle() {
    if (!this.enabled) {
      return;
    }
    try {
      const ctx = this.getCtx();
      const time = ctx.currentTime;
      [528, 660].forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, time + index * 0.15);
        gain.gain.setValueAtTime(0, time + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.1, time + index * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.15 + 0.45);
        oscillator.start(time + index * 0.15);
        oscillator.stop(time + index * 0.15 + 0.5);
      });
    } catch {}
  },

  playUndo() {
    if (!this.enabled) {
      return;
    }
    try {
      const ctx = this.getCtx();
      const time = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, time);
      oscillator.frequency.exponentialRampToValueAtTime(440, time + 0.25);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      oscillator.start(time);
      oscillator.stop(time + 0.3);
    } catch {}
  },

  playLevelUpFanfare() {
    if (!this.enabled) {
      return;
    }
    try {
      const ctx = this.getCtx();
      [392, 523, 659, 784, 1047].forEach((freq, index) => {
        const time = ctx.currentTime + index * 0.12;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        oscillator.start(time);
        oscillator.stop(time + 0.55);
      });
    } catch {}
  },

  play(priority, wasCompleted) {
    if (wasCompleted) {
      this.playUndo();
      return;
    }

    if (priority === "High") {
      this.playLevelUp();
      return;
    }

    if (priority === "Low") {
      this.playGentle();
      return;
    }

    this.playChime();
  },
};
