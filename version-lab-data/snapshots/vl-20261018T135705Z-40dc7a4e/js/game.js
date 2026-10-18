// Letter Rain: words fall, type them before they reach the ground.
window.KQ = window.KQ || {};

KQ.RainGame = class {
  constructor(area, hud, opts) {
    this.area = area;
    this.hud = hud;          // { score, level, lives }
    this.words = opts.words; // pool of strings
    this.onEnd = opts.onEnd;
    this.speedScale = opts.speedScale || 1;
    this.running = false;
    this.items = [];
    this.active = null;
    this.raf = null;
    this.onVisibility = () => { if (document.hidden) this.pause(); };
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.spawnTimer = 0;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  reset() {
    for (const it of this.items) it.el.remove();
    this.items = [];
    this.active = null;
    this.score = 0;
    this.level = 1;
    this.lives = 5;
    this.cleared = 0;
    this.updateHud();
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

  get speed() { return (28 + this.level * 9) * this.speedScale; }             // px per second
  get spawnEvery() { return Math.max(900, 2800 - this.level * 220) / this.speedScale; } // ms

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.paused) {
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= this.spawnEvery || this.items.length === 0) {
        this.spawnTimer = 0;
        this.spawn();
      }
      const floor = this.area.clientHeight - 18;
      for (const it of this.items.slice()) {
        it.y += this.speed * dt;
        it.el.style.top = `${it.y}px`;
        if (it.y + it.h >= floor) this.miss(it);
      }
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  spawn() {
    const text = this.words[Math.floor(Math.random() * this.words.length)];
    const el = document.createElement("div");
    el.className = "rain-word";
    this.area.appendChild(el);
    const it = { text, typed: 0, el, x: 0, y: -40, h: 0 };
    this.renderWord(it);
    it.h = el.offsetHeight;
    const maxX = Math.max(0, this.area.clientWidth - el.offsetWidth - 10);
    it.x = 5 + Math.random() * maxX;
    el.style.left = `${it.x}px`;
    el.style.top = `${it.y}px`;
    this.items.push(it);
  }

  renderWord(it) {
    const done = KQ.escapeHtml(it.text.slice(0, it.typed));
    const rest = KQ.escapeHtml(it.text.slice(it.typed));
    it.el.innerHTML = `<span class="done">${done}</span>${rest}`;
  }

  input(ch) {
    if (!this.running || this.paused) return "ignored";
    if (!this.active) {
      const candidates = this.items.filter((it) => it.text[0] === ch);
      if (!candidates.length) return this.wrong();
      candidates.sort((a, b) => b.y - a.y);
      this.active = candidates[0];
      this.active.el.classList.add("active");
    }
    const it = this.active;
    if (it.text[it.typed] !== ch) return this.wrong();
    it.typed++;
    this.renderWord(it);
    if (it.typed >= it.text.length) {
      this.complete(it);
      return "complete";
    }
    return "correct";
  }

  wrong() {
    this.area.classList.remove("shake");
    void this.area.offsetWidth;
    this.area.classList.add("shake");
    this.score = Math.max(0, this.score - 1);
    this.updateHud();
    return "wrong";
  }

  complete(it) {
    this.score += it.text.length * 10 + this.level * 2;
    this.cleared++;
    if (this.cleared % 8 === 0) this.level++;
    this.remove(it, "pop");
    this.updateHud();
  }

  miss(it) {
    this.lives--;
    this.remove(it, "splat");
    this.updateHud();
    if (this.lives <= 0) this.gameOver();
  }

  remove(it, cls) {
    this.items = this.items.filter((x) => x !== it);
    if (this.active === it) this.active = null;
    it.el.classList.remove("active");
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
