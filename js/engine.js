// Typing session engine: tracks position, correctness, timing and per-key stats.
window.KQ = window.KQ || {};

// Character states
KQ.PENDING = 0;
KQ.CORRECT = 1;
KQ.WRONG = 2;
KQ.FIXED = 3; // was wrong, later typed correctly

KQ.TypingSession = class {
  constructor(text, opts = {}) {
    this.text = text;
    this.stopOnError = opts.stopOnError !== false;
    this.pos = 0;
    this.states = new Array(text.length).fill(KQ.PENDING);
    this.keystrokes = 0;
    this.errors = 0;
    this.startTime = null;
    this.endTime = null;
    this.done = false;
    this.keyStats = {}; // expected char -> { attempts, errors }
  }

  get started() { return this.startTime !== null; }
  get expected() { return this.done ? null : this.text[this.pos]; }

  // Feed a single typed character. Returns "correct", "wrong", "complete" or "ignored".
  input(ch) {
    if (this.done) return "ignored";
    if (this.startTime === null) this.startTime = performance.now();
    const expected = this.text[this.pos];
    this.keystrokes++;
    const ks = (this.keyStats[expected] = this.keyStats[expected] || { attempts: 0, errors: 0 });
    ks.attempts++;
    if (ch === expected) {
      this.states[this.pos] = this.states[this.pos] === KQ.WRONG ? KQ.FIXED : KQ.CORRECT;
      this.pos++;
      if (this.pos >= this.text.length) { this.finish(); return "complete"; }
      return "correct";
    }
    this.errors++;
    ks.errors++;
    this.states[this.pos] = KQ.WRONG;
    if (!this.stopOnError) {
      this.pos++;
      if (this.pos >= this.text.length) { this.finish(); return "complete"; }
    }
    return "wrong";
  }

  backspace() {
    if (this.done) return false;
    if (this.stopOnError) {
      if (this.states[this.pos] === KQ.WRONG) { this.states[this.pos] = KQ.PENDING; return true; }
      if (this.pos > 0) { this.pos--; this.states[this.pos] = KQ.PENDING; return true; }
      return false;
    }
    if (this.pos > 0) { this.pos--; this.states[this.pos] = KQ.PENDING; return true; }
    return false;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.endTime = performance.now();
  }

  elapsedMs() {
    if (this.startTime === null) return 0;
    return (this.endTime === null ? performance.now() : this.endTime) - this.startTime;
  }

  stats() {
    const ms = this.elapsedMs();
    const minutes = Math.max(ms / 60000, 1 / 60); // avoid divide-by-zero spikes in the first second
    let typed = 0, wrong = 0;
    for (let i = 0; i < this.pos; i++) {
      if (this.states[i] === KQ.WRONG) wrong++;
      typed++;
    }
    const wpm = Math.max(0, Math.round(((typed - wrong) / 5) / minutes));
    const accuracy = this.keystrokes === 0 ? 100 : Math.round(((this.keystrokes - this.errors) / this.keystrokes) * 100);
    return {
      wpm, accuracy, errors: this.errors, keystrokes: this.keystrokes,
      typed, seconds: Math.round(ms / 1000), done: this.done, progress: this.pos / this.text.length,
    };
  }
};

// Stars for a result, against a target words-per-minute.
KQ.starsFor = function (wpm, accuracy, targetWpm) {
  if (accuracy < 85) return 0;
  if (accuracy >= 97 && wpm >= targetWpm * 1.25) return 3;
  if (accuracy >= 92 && wpm >= targetWpm) return 2;
  return 1;
};
