// Bubble Pop: letters rise inside bubbles; press the key to pop them before they float away.
window.KQ = window.KQ || {};

KQ.BubbleGame = class {
  constructor(area, hud, opts) {
    this.area = area;
    this.hud = hud;          // { score, level, lives }
    this.pool = opts.pool;   // array of characters
    this.onEnd = opts.onEnd;
    this.speedScale = opts.speedScale || 1;
    this.running = false;
    this.items = [];
    this.raf = null;
    this.onVisibility = () => { if (document.hidden) this.pause(); };
  }

  reset() {
    for (const it of this.items) it.el.remove();
    this.items = [];
    this.score = 0;
    this.level = 1;
    this.lives = 5;
    this.popped = 0;
    this.updateHud();
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    this.clock = 0;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop() {
    this.running = false;
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    for (const it of this.items) it.el.remove();
    this.items = [];
  }

  pause() { this.paused = true; }
  resume() { if (this.running && this.paused) { this.paused = false; this.lastTime = performance.now(); } }

  get speed() { return (40 + this.level * 10) * this.speedScale; }                    // px per second upward
  get spawnEvery() { return Math.max(650, 1800 - this.level * 150) / this.speedScale; }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.paused) {
      this.clock += dt;
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= this.spawnEvery || this.items.length === 0) { this.spawnTimer = 0; this.spawn(); }
      for (const it of this.items.slice()) {
        it.y -= this.speed * dt;
        const x = it.x + Math.sin(this.clock * 2 + it.phase) * 18;
        it.el.style.left = `${x}px`;
        it.el.style.top = `${it.y}px`;
        if (it.y < -70) this.miss(it);
      }
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  spawn() {
    const ch = this.pool[Math.floor(Math.random() * this.pool.length)];
    const el = document.createElement("div");
    el.className = "bubble";
    el.textContent = ch;
    this.area.appendChild(el);
    const size = 64;
    const it = { ch, el, x: 20 + Math.random() * Math.max(0, this.area.clientWidth - size - 40), y: this.area.clientHeight, phase: Math.random() * 6.28 };
    el.style.left = `${it.x}px`;
    el.style.top = `${it.y}px`;
    this.items.push(it);
  }

  input(ch) {
    if (!this.running || this.paused) return "ignored";
    const matches = this.items.filter((it) => it.ch === ch);
    if (!matches.length) {
      this.score = Math.max(0, this.score - 1);
      this.updateHud();
      return "wrong";
    }
    matches.sort((a, b) => a.y - b.y); // highest bubble (closest to escaping) first
    this.pop(matches[0]);
    return "complete";
  }

  pop(it) {
    this.score += 10 * this.level;
    this.popped++;
    if (this.popped % 10 === 0) this.level++;
    this.remove(it, "pop");
    this.updateHud();
  }

  miss(it) {
    this.lives--;
    this.remove(it, "escape");
    this.updateHud();
    if (this.lives <= 0) this.gameOver();
  }

  remove(it, cls) {
    this.items = this.items.filter((x) => x !== it);
    it.el.classList.add(cls);
    setTimeout(() => it.el.remove(), 300);
  }

  updateHud() {
    this.hud.score.textContent = this.score;
    this.hud.level.textContent = this.level;
    this.hud.lives.textContent = "❤️".repeat(Math.max(0, this.lives)) + "🖤".repeat(Math.max(0, 5 - this.lives));
  }

  gameOver() {
    const score = this.score;
    this.stop();
    if (this.onEnd) this.onEnd(score);
  }
};

KQ.bubblePool = function (difficulty) {
  if (difficulty === "home") return "asdfghjkl;".split("");
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  if (difficulty === "letters") return letters;
  return letters.concat("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "1234567890".split(""), [",", ".", "?", "!"]);
};
