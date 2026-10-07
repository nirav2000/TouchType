// Typing session engine: tracks position, correctness, timing and adaptive fluency signals.
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
    this.keyStats = {}; // expected char -> { attempts, errors, totalLatencyMs, samples, slow }
    this.transitionStats = {}; // "a>l" -> { attempts, errors, totalLatencyMs, samples }
    this.wordStats = {}; // word -> { attempts, errors, totalMs, samples, bestMs }
    this.lastCorrectTime = null;
    this.lastCorrectChar = null;
    this.wordStartTime = null;
    this.wordErrors = 0;
    this.wordStartPos = 0;
  }

  get started() { return this.startTime !== null; }
  get expected() { return this.done ? null : this.text[this.pos]; }

  _recordTiming(expected, now, wasError) {
    const latency = this.lastCorrectTime == null ? 0 : Math.max(0, now - this.lastCorrectTime);
    const ks = (this.keyStats[expected] = this.keyStats[expected] || {
      attempts: 0, errors: 0, totalLatencyMs: 0, samples: 0, slow: 0,
    });
    ks.attempts++;
    if (wasError) ks.errors++;
    if (!wasError && expected !== " " && this.lastCorrectTime != null) {
      ks.totalLatencyMs += latency;
      ks.samples++;
      if (latency >= 900) ks.slow++;
    }

    if (this.lastCorrectChar != null) {
      const pair = this.lastCorrectChar + ">" + expected;
      const ts = (this.transitionStats[pair] = this.transitionStats[pair] || {
        attempts: 0, errors: 0, totalLatencyMs: 0, samples: 0,
      });
      ts.attempts++;
      if (wasError) ts.errors++;
      if (!wasError) {
        ts.totalLatencyMs += latency;
        ts.samples++;
      }
    }
  }

  _finishWord(endPos, now) {
    const raw = this.text.slice(this.wordStartPos, endPos).trim().toLowerCase();
    const word = raw.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
    if (word.length < 2 || this.wordStartTime == null) return;
    const ws = (this.wordStats[word] = this.wordStats[word] || {
      attempts: 0, errors: 0, totalMs: 0, samples: 0, bestMs: null,
    });
    const ms = Math.max(1, now - this.wordStartTime);
    ws.attempts++;
    ws.errors += this.wordErrors;
    ws.totalMs += ms;
    ws.samples++;
    ws.bestMs = ws.bestMs == null ? ms : Math.min(ws.bestMs, ms);
  }

  // Feed a single typed character. Returns "correct", "wrong", "complete" or "ignored".
  input(ch) {
    if (this.done) return "ignored";
    const now = performance.now();
    if (this.startTime === null) {
      this.startTime = now;
      this.wordStartTime = now;
      this.wordStartPos = this.pos;
    }
    const expected = this.text[this.pos];
    this.keystrokes++;

    if (ch === expected) {
      this._recordTiming(expected, now, false);
      this.states[this.pos] = this.states[this.pos] === KQ.WRONG ? KQ.FIXED : KQ.CORRECT;
      const completedPos = this.pos;
      this.pos++;
      if (expected === " " || this.pos >= this.text.length) {
        this._finishWord(expected === " " ? completedPos : this.pos, now);
        this.wordStartPos = this.pos;
        this.wordStartTime = now;
        this.wordErrors = 0;
      }
      this.lastCorrectTime = now;
      this.lastCorrectChar = expected;
      if (this.pos >= this.text.length) { this.finish(); return "complete"; }
      return "correct";
    }

    this.errors++;
    this.wordErrors++;
    this._recordTiming(expected, now, true);
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

  fluencyStats() {
    const timed = Object.values(this.keyStats).filter((s) => s.samples > 0);
    const totalSamples = timed.reduce((a, s) => a + s.samples, 0);
    const totalLatency = timed.reduce((a, s) => a + s.totalLatencyMs, 0);
    const slow = timed.reduce((a, s) => a + (s.slow || 0), 0);
    return {
      avgLatencyMs: totalSamples ? Math.round(totalLatency / totalSamples) : 0,
      hesitationRate: totalSamples ? Math.round((slow / totalSamples) * 100) : 0,
      timingSamples: totalSamples,
    };
  }

  stats() {
    const ms = this.elapsedMs();
    const minutes = Math.max(ms / 60000, 1 / 60);
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
      ...this.fluencyStats(),
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
