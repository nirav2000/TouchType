// On-screen keyboard and hands with finger colour coding.
window.KQ = window.KQ || {};

// Each key: [lower, upper, width in units, finger]. Special keys use a name.
KQ.LAYOUT = [
  [["`", "~", 1, "lp"], ["1", "!", 1, "lp"], ["2", "@", 1, "lr"], ["3", "#", 1, "lm"], ["4", "$", 1, "li"], ["5", "%", 1, "li"], ["6", "^", 1, "ri"], ["7", "&", 1, "ri"], ["8", "*", 1, "rm"], ["9", "(", 1, "rr"], ["0", ")", 1, "rp"], ["-", "_", 1, "rp"], ["=", "+", 1, "rp"], ["Backspace", "⌫", 2, "rp"]],
  [["Tab", "Tab", 1.5, "lp"], ["q", "Q", 1, "lp"], ["w", "W", 1, "lr"], ["e", "E", 1, "lm"], ["r", "R", 1, "li"], ["t", "T", 1, "li"], ["y", "Y", 1, "ri"], ["u", "U", 1, "ri"], ["i", "I", 1, "rm"], ["o", "O", 1, "rr"], ["p", "P", 1, "rp"], ["[", "{", 1, "rp"], ["]", "}", 1, "rp"], ["\\", "|", 1.5, "rp"]],
  [["CapsLock", "Caps", 1.8, "lp"], ["a", "A", 1, "lp"], ["s", "S", 1, "lr"], ["d", "D", 1, "lm"], ["f", "F", 1, "li"], ["g", "G", 1, "li"], ["h", "H", 1, "ri"], ["j", "J", 1, "ri"], ["k", "K", 1, "rm"], ["l", "L", 1, "rr"], [";", ":", 1, "rp"], ["'", "\"", 1, "rp"], ["Enter", "Enter", 2.2, "rp"]],
  [["ShiftLeft", "Shift", 2.4, "lp"], ["z", "Z", 1, "lp"], ["x", "X", 1, "lr"], ["c", "C", 1, "lm"], ["v", "V", 1, "li"], ["b", "B", 1, "li"], ["n", "N", 1, "ri"], ["m", "M", 1, "ri"], [",", "<", 1, "rm"], [".", ">", 1, "rr"], ["/", "?", 1, "rp"], ["ShiftRight", "Shift", 2.6, "rp"]],
  [["Space", "", 7, "th"]],
];

KQ.Keyboard = class {
  constructor(container) {
    this.container = container;
    this.keys = {};
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    this.container.classList.add("kb");
    for (const row of KQ.LAYOUT) {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      for (const [lower, upper, width, finger] of row) {
        const el = document.createElement("div");
        el.className = `kb-key finger-${finger}`;
        el.style.flex = `${width} ${width} 0`;
        el.dataset.key = lower;
        const isSpecial = lower.length > 1;
        if (isSpecial) {
          el.classList.add("kb-special");
          el.textContent = upper;
        } else if (/[a-z]/.test(lower)) {
          el.textContent = upper;
        } else {
          el.innerHTML = `<span class="kb-upper">${escapeHtml(upper)}</span><span class="kb-lower">${escapeHtml(lower)}</span>`;
        }
        if (lower === "f" || lower === "j") el.classList.add("kb-bump");
        rowEl.appendChild(el);
        this.keys[lower] = el;
      }
      this.container.appendChild(rowEl);
    }
  }

  clearHighlight() {
    for (const el of Object.values(this.keys)) el.classList.remove("next", "pressed", "wrong");
  }

  // Highlight the key (and the correct Shift) needed for character `ch`.
  highlight(ch) {
    this.clearHighlight();
    if (ch == null) return;
    const { key, shift } = KQ.keyFor(ch);
    const el = this.keys[key === " " ? "Space" : key];
    if (el) el.classList.add("next");
    if (shift) {
      const finger = KQ.FINGERS[key] || "ri";
      const shiftEl = this.keys[finger[0] === "l" ? "ShiftRight" : "ShiftLeft"];
      if (shiftEl) shiftEl.classList.add("next");
    }
  }

  flash(ch, cls) {
    const { key } = KQ.keyFor(ch);
    const el = this.keys[key === " " ? "Space" : key];
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 140);
  }

  // Colour keys by a { char: {attempts, errors} } map (used for the progress heatmap).
  heatmap(keyStats) {
    for (const el of Object.values(this.keys)) {
      el.classList.remove("heat-good", "heat-ok", "heat-bad", "heat-none");
      el.classList.add("heat-none");
      el.title = "";
    }
    for (const [ch, s] of Object.entries(keyStats)) {
      const { key } = KQ.keyFor(ch);
      const el = this.keys[key === " " ? "Space" : key];
      if (!el || s.attempts < 3) continue;
      const acc = Math.round(((s.attempts - s.errors) / s.attempts) * 100);
      el.classList.remove("heat-none");
      el.classList.add(acc >= 95 ? "heat-good" : acc >= 85 ? "heat-ok" : "heat-bad");
      el.title = `${acc}% (${s.attempts} tries)`;
    }
  }
};

// Simple SVG hands; the finger for the next key lights up.
KQ.handsSvg = function () {
  const finger = (id, x, y, w, h) => `<rect id="finger-${id}" class="hand-finger finger-${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`;
  const left = `
    <g class="hand hand-left">
      <rect class="hand-palm" x="38" y="112" width="128" height="96" rx="34"/>
      ${finger("lp", 34, 66, 26, 80)}
      ${finger("lr", 66, 40, 28, 106)}
      ${finger("lm", 100, 30, 28, 116)}
      ${finger("li", 134, 46, 28, 100)}
      <rect id="finger-lt" class="hand-finger finger-th" x="158" y="120" width="26" height="72" rx="13" transform="rotate(-38 171 156)"/>
    </g>`;
  const right = `
    <g class="hand hand-right" transform="translate(440 0) scale(-1 1)">
      <rect class="hand-palm" x="38" y="112" width="128" height="96" rx="34"/>
      ${finger("rp", 34, 66, 26, 80)}
      ${finger("rr", 66, 40, 28, 106)}
      ${finger("rm", 100, 30, 28, 116)}
      ${finger("ri", 134, 46, 28, 100)}
      <rect id="finger-rt" class="hand-finger finger-th" x="158" y="120" width="26" height="72" rx="13" transform="rotate(-38 171 156)"/>
    </g>`;
  return `<svg class="hands" viewBox="0 0 440 220" aria-hidden="true">${left}${right}</svg>`;
};

KQ.highlightFinger = function (root, ch) {
  for (const el of root.querySelectorAll(".hand-finger")) el.classList.remove("active");
  if (ch == null) return;
  const { key, shift } = KQ.keyFor(ch);
  const f = KQ.FINGERS[key] || null;
  if (f === "th") {
    root.querySelector("#finger-lt")?.classList.add("active");
    root.querySelector("#finger-rt")?.classList.add("active");
  } else if (f) {
    root.querySelector(`#finger-${f}`)?.classList.add("active");
    if (shift) root.querySelector(`#finger-${f[0] === "l" ? "rp" : "lp"}`)?.classList.add("active");
  }
};

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
KQ.escapeHtml = escapeHtml;
