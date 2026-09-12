// Rocket Race: type the passage to beat a robot rocket flying at a fixed speed.
window.KQ = window.KQ || {};

KQ.RaceGame = class {
  // els: { text, player, robo, wpm, countdown }
  constructor(els, opts) {
    this.els = els;
    this.text = opts.text;
    this.opponentWpm = opts.opponentWpm;
    this.onEnd = opts.onEnd;
    this.running = false;
    this.paused = false;
    this.raf = null;
    this.timers = [];
  }

  reset() {
    this.session = new KQ.TypingSession(this.text, { stopOnError: true });
    this.renderText();
    this.setRocket(this.els.player, 0);
    this.setRocket(this.els.robo, 0);
    this.els.wpm.textContent = "0";
    this.els.countdown.textContent = "";
  }

  // Counts down 3-2-1 then launches.
  start() {
    this.reset();
    this.counting = true;
    const steps = ["3", "2", "1", "Go!"];
    steps.forEach((s, i) => {
      this.timers.push(setTimeout(() => {
        this.els.countdown.textContent = s;
        if (s === "Go!") {
          this.timers.push(setTimeout(() => { this.els.countdown.textContent = ""; }, 600));
          this.launch();
        }
      }, i * 800));
    });
  }

  launch() {
    this.counting = false;
    this.running = true;
    this.startTime = performance.now();
    this.raf = requestAnimationFrame(() => this.frame());
  }

  pause() {}
  resume() {}

  stop() {
    this.running = false;
    this.counting = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  frame() {
    if (!this.running) return;
    const elapsedMin = (performance.now() - this.startTime) / 60000;
    const oppChars = elapsedMin * this.opponentWpm * 5;
    const oppProgress = Math.min(1, oppChars / this.text.length);
    this.setRocket(this.els.robo, oppProgress);
    this.setRocket(this.els.player, this.session.pos / this.text.length);
    this.els.wpm.textContent = this.session.stats().wpm;
    if (oppProgress >= 1) { this.finish(false); return; }
    this.raf = requestAnimationFrame(() => this.frame());
  }

  setRocket(el, progress) {
    el.style.left = `calc(${(progress * 100).toFixed(2)}% - ${(progress * 44).toFixed(1)}px)`;
  }

  input(ch) {
    if (!this.running) return "ignored";
    const pos = this.session.pos;
    const r = this.session.input(ch);
    this.paintChar(pos);
    this.paintChar(this.session.pos);
    if (r === "complete") this.finish(true);
    return r;
  }

  finish(won) {
    const st = this.session.stats();
    this.stop();
    if (this.onEnd) this.onEnd({ won, wpm: st.wpm, accuracy: st.accuracy, seconds: st.seconds });
  }

  renderText() {
    const box = this.els.text;
    box.innerHTML = "";
    let i = 0;
    for (const word of this.text.split(/(?<= )/)) {
      const w = document.createElement("span");
      w.className = "w";
      for (const ch of word) {
        const c = document.createElement("span");
        c.className = "c" + (ch === " " ? " sp" : "");
        c.textContent = ch;
        w.appendChild(c);
        i++;
      }
      box.appendChild(w);
    }
    this.chars = box.querySelectorAll(".c");
    this.paintChar(0);
  }

  paintChar(i) {
    const el = this.chars[i];
    if (!el) return;
    const s = this.session;
    el.className = "c" + (s.text[i] === " " ? " sp" : "");
    const cls = { 1: "correct", 2: "wrong", 3: "fixed" }[s.states[i]];
    if (cls) el.classList.add(cls);
    if (i === s.pos && !s.done) { el.classList.add("cur"); el.scrollIntoView({ block: "nearest" }); }
  }
};

// Passage for a race. Easier races use lowercase text without punctuation.
KQ.raceText = function (difficulty) {
  const pool = KQ.SENTENCES.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const target = difficulty === "slow" ? 90 : difficulty === "medium" ? 140 : 200;
  const out = [];
  let len = 0;
  for (let s of pool) {
    if (difficulty === "slow") {
      if (s.includes("'")) continue;
      s = s.toLowerCase().replace(/[.,!?"]/g, "");
    }
    if (len + s.length > target && out.length) break;
    out.push(s);
    len += s.length + 1;
  }
  return out.join(" ");
};
