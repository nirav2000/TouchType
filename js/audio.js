// Tiny synthesised sound effects (no audio files needed).
window.KQ = window.KQ || {};

KQ.audio = {
  enabled: true,
  ctx: null,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },

  tone(freq, duration, type = "sine", gain = 0.08, when = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  },

  click() { this.tone(880, 0.05, "triangle", 0.05); },
  wrong() { this.tone(160, 0.18, "sawtooth", 0.06); },
  pop() { this.tone(660, 0.08, "square", 0.05); this.tone(990, 0.1, "square", 0.04, 0.05); },
  success() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.08, i * 0.1));
  },
  fanfare() {
    [523, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.09, i * 0.12));
  },
  lose() { [330, 262, 196].forEach((f, i) => this.tone(f, 0.3, "sawtooth", 0.05, i * 0.18)); },
};
