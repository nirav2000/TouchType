// End-to-end test: serves the app from this repo and drives it with Playwright.
//   npm test                      (uses Playwright's bundled Chromium)
//   CHROME_PATH=/usr/bin/google-chrome npm test   (use an installed Chrome)
//   HEADED=1 npm test             (watch it run)
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/index.html` }));
  });
}

let passed = 0;
function check(name, cond) {
  if (!cond) throw new Error("FAILED: " + name);
  passed++;
  console.log("  ok  " + name);
}

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch({ headless: !process.env.HEADED, executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  const wait = (ms) => page.waitForTimeout(ms);
  const text = () => page.$eval("#text-display", (el) => [...el.querySelectorAll(".c")].map((c) => c.textContent).join(""));
  const results = () => page.$eval("#screen-results", (el) => el.innerText.replace(/\s+/g, " "));
  const profile = () => page.evaluate(() => KQ.store.current());
  const typeEx = async (errRate) => {
    const t = await text();
    for (const ch of t) {
      if (Math.random() < errRate) await page.keyboard.press(ch === "a" ? "b" : "a");
      await page.keyboard.type(ch, { delay: 4 });
    }
    await wait(120);
  };
  const runLesson = async (errRate) => {
    let n = 0;
    for (;;) {
      await typeEx(errRate); n++;
      const label = await page.$eval("#btn-results-next", (b) => b.textContent);
      if (!/Next exercise/.test(label)) return n;
      await page.click("#btn-results-next"); await wait(100);
    }
  };

  try {
    console.log("Curriculum data");
    await page.goto(url); await wait(200);
    const gen = await page.evaluate(() => {
      let bad = 0, total = 0;
      for (const l of KQ.LESSONS) for (const lv of Object.keys(KQ.LEVELS)) for (const e of KQ.buildExercises(l, lv)) {
        total++;
        if (![...e.text].every((c) => l.allowed.has(c))) bad++;
      }
      return { bad, total, lessons: KQ.LESSONS.length };
    });
    check(`all ${gen.total} generated exercises use only taught keys`, gen.bad === 0);
    check("24 lessons", gen.lessons === 24);
    const adaptive = await page.evaluate(() => {
      const p = { wordSkills: {}, keyStats: {}, transitionStats: {} };
      const lesson = KQ.LESSONS[6];
      const ex = KQ.buildExercises(lesson, "kid", p);
      const acquisition = ex.find((x) => x.acquisition);
      const counts = acquisition ? acquisition.text.split(" ").reduce((m, w) => ((m[w] = (m[w] || 0) + 1), m), {}) : {};
      return { title: lesson.title, hasAcquisition: !!acquisition, counts };
    });
    check("G and H come before E and I", adaptive.title === "G and H");
    check("adaptive lesson contains acquisition drill", adaptive.hasAcquisition);
    check("acquisition words repeat exactly five times", Object.values(adaptive.counts).every((n) => n === 5));
    const daily = await page.evaluate(() => {
      const p = { wordSkills: {}, keyStats: {}, transitionStats: {}, adaptiveStage: 0 };
      const plan = KQ.buildAdaptivePlan(p);
      const counts = plan.exercises[0].text.split(" ").reduce((m,w)=>((m[w]=(m[w]||0)+1),m),{});
      return {stage:plan.stage.id, reps:plan.repetitions, counts, hasSentence:plan.exercises.some(x=>x.transfer), hasRecall:plan.exercises.some(x=>x.recall)};
    });
    check("adaptive daily practice starts at home row plus G/H", daily.stage === "home-gh");
    check("new adaptive words repeat exactly five times", Object.values(daily.counts).every((n) => n === 5));
    check("adaptive practice transfers into sentences", daily.hasSentence);
    check("adaptive practice includes mixed recall", daily.hasRecall);

    console.log("Profiles and home");
    await page.click("#level-picker button:nth-child(1)");
    await page.fill("#new-name", "Ada"); await page.click("#btn-create"); await wait(200);
    check("profile created with little-kid level", (await profile()).settings.level === "little");
    check("home screen shown", await page.$eval("#screen-home", (e) => e.classList.contains("active")));
    check("adaptive practice is the primary home action", /adaptive practice/i.test(await page.$eval("#home-continue",(e)=>e.innerText)));
    check("five-repeat method is visible", /New word ×5/.test(await page.$eval(".method-card",(e)=>e.innerText)));
    const focusBefore = await page.$eval("#btn-focus", e => e.getAttribute("aria-pressed"));
    await page.click("#btn-focus");
    check("header focus button enables mode", await page.evaluate(() => document.body.classList.contains("focus-mode")));
    check("header focus button hides extra home panels", await page.$eval("#nav-lessons", e => getComputedStyle(e).display === "none"));
    check("header focus setting persists", (await profile()).settings.focusMode === true);
    await page.click("#btn-focus");
    check("header focus button restores home panels", await page.$eval("#nav-lessons", e => getComputedStyle(e).display !== "none"));
    check("header focus setting persists when disabled", (await profile()).settings.focusMode === false);
    const soundBefore = (await profile()).settings.sound;
    await page.click("#btn-sound");
    check("header sound button changes stored state", (await profile()).settings.sound === !soundBefore);
    check("header sound button changes icon", (await page.$eval("#btn-sound",e=>e.textContent)) === (soundBefore ? "🔇" : "🔊"));
    await page.reload(); await wait(200);
    check("sound setting survives reload", (await profile()).settings.sound === !soundBefore);
    await page.click("#btn-sound");

    const progressModel = await page.evaluate(() => {
      const p = KQ.store.current();
      KQ.store.recordDrill(p,{mode:"adaptive",stage:"home-gh",exercise:"Test drill",targets:["glass"],wpm:20,accuracy:98,errors:0,seconds:30,latency:400,hesitation:5,timingSamples:20});
      const snap=KQ.store.learningSnapshot(p);
      return {drills:snap.totalDrills, hasAdvice:typeof KQ.store.continuationAdvice(p).stop==="boolean"};
    });
    check("drill-level history is persisted", progressModel.drills >= 1);
    check("continuation advice is available", progressModel.hasAdvice);
    await page.click("#nav-progress");
    check("progress shows adaptive drills", /Adaptive drills completed/.test(await page.$eval("#screen-progress",(e)=>e.innerText)));
    check("progress shows review forecast", /Review forecast/.test(await page.$eval("#screen-progress",(e)=>e.innerText)));
    await page.click("#screen-progress [data-go=home]");
    await page.click("#nav-analytics");
    check("separate analytics dashboard opens", await page.$eval("#screen-analytics",e=>e.classList.contains("active")));
    check("analytics renders three charts", (await page.evaluate(() => document.querySelectorAll(".analytics-svg").length)) === 3);
    check("analytics includes per-key diagnostics", /Avg latency/.test(await page.$eval("#analytics-keys-table",e=>e.innerText)));
    check("analytics includes SRS mastery table", /Retention/.test(await page.$eval("#analytics-words-table",e=>e.innerText)));
    await page.selectOption("#analytics-range","all");
    check("analytics range filter works", (await page.$eval("#analytics-range",e=>e.value)) === "all");
    await page.click("#btn-home");
    await page.click("#nav-settings");
    check("adaptive motor SRS is default", (await page.$eval("#set-srs",e=>e.value)) === "adaptive");
    check("classic spaced-review ladder remains available", await page.$eval("#set-srs",e=>[...e.options].some(o=>o.value==="ladder" && /1.*3.*7.*14.*30/.test(o.textContent))));
    check("version number is visible in settings", /v0\.4\.1/.test(await page.$eval("#settings-version",e=>e.textContent)));
    await page.click("#set-focus");
    check("focus mode can be enabled", await page.evaluate(()=>document.body.classList.contains("focus-mode")));
    await page.click("#screen-settings [data-go=home]");
    check("focus home explains simplified mode", await page.$eval("#focus-home-note",e=>getComputedStyle(e).display!=="none"));
    check("focus home hides extra lessons", await page.$eval("#nav-lessons",e=>getComputedStyle(e).display==="none"));
    check("focus home keeps progress", await page.$eval("#nav-progress",e=>getComputedStyle(e).display!=="none"));
    check("focus home keeps settings", await page.$eval("#nav-settings",e=>getComputedStyle(e).display!=="none"));
    await page.click("#btn-continue"); await wait(100);
    check("focus practice keeps Home navigation", await page.$eval("#btn-home",e=>getComputedStyle(e).display!=="none"));
    check("focus practice keeps quit/back control", await page.$eval("#btn-quit",e=>getComputedStyle(e).display!=="none"));
    await page.click("#btn-home");

    console.log("Lessons and mastery");
    await page.click("#nav-lessons"); await wait(150);
    check("units rendered", (await page.$$(".unit")).length === 5);
    check("only lesson 0 unlocked", (await page.$$(".lesson-card.locked")).length === 23);
    await page.click(".lesson-card"); await wait(150);
    check("posture checklist shown", (await page.$$("#intro-checklist li")).length === 6);
    await page.click("#btn-start-lesson"); await wait(150);
    check("lesson 0 has 3 exercises", (await runLesson(0)) === 3);
    await page.click("#btn-results-next"); await wait(150); await page.click("#btn-start-lesson"); await wait(150);
    check("lesson 1 has 4 exercises", (await runLesson(0)) === 4);
    let p = await profile();
    check("clean lesson 1 earns 3 stars", p.lessons[1].stars === 3);
    check("lesson 2 unlocked", await page.evaluate(() => KQ.store.unlockedIndex(KQ.store.current())) === 2);
    await page.click("#btn-results-next"); await wait(150); await page.click("#btn-start-lesson"); await wait(150);
    await runLesson(0.15);
    p = await profile();
    check("sloppy lesson 2 earns fewer than 2 stars", p.lessons[2].stars < 2);
    check("lesson 3 stays locked", await page.evaluate(() => KQ.store.unlockedIndex(KQ.store.current())) === 2);
    check("results explain mastery", /2 stars/.test(await results()));

    console.log("Weak-key practice");
    await page.click("#btn-results-back"); await page.click("#btn-home"); await wait(150);
    check("tricky keys card shown", !(await page.$eval("#home-weak", (e) => e.hidden)));
    await page.click("#btn-weak"); await wait(150);
    check("weak practice has 5 exercises", (await runLesson(0)) === 5);
    p = await profile();
    check("weak practice recorded in history", /^Tricky keys/.test(p.history[0].label));
    await page.click("#btn-results-next"); await wait(150);

    console.log("Unit test");
    await page.click("#nav-settings"); await wait(100);
    await page.selectOption("#set-level", "big"); await page.check("#set-unlock");
    check("level saved", (await profile()).settings.level === "big");
    await page.click("#btn-home"); await page.click("#nav-lessons"); await wait(150);
    check("unlock all opens every lesson", (await page.$$(".lesson-card.locked")).length === 0);
    await (await page.$$(".lesson-card"))[5].click(); await wait(150); await page.click("#btn-start-lesson"); await wait(150);
    for (let i = 0; i < 4; i++) { await typeEx(0); await page.click("#btn-results-next"); await wait(100); }
    check("last exercise is the unit test", /Unit test/.test(await page.$eval("#practice-title", (e) => e.textContent)));
    await typeEx(0.25);
    check("failed unit test gives 0 stars", (await profile()).lessons[5].stars === 0);
    check("failed test message", /90%/.test(await results()));
    await page.click("#btn-results-next"); await wait(150);
    for (let i = 0; i < 4; i++) { await typeEx(0); await page.click("#btn-results-next"); await wait(100); }
    await typeEx(0);
    check("passed unit test masters lesson", (await profile()).lessons[5].stars >= 2);

    console.log("Practice details");
    await page.click("#btn-results-back"); await page.click(".lesson-card"); await page.click("#btn-start-lesson"); await wait(150);
    const first = (await text())[0];
    await page.keyboard.press(first === "f" ? "j" : "f"); await wait(50);
    check("wrong key marks character", (await page.$$(".c.wrong")).length === 1);
    check("wrong key does not advance", (await page.$eval(".c.cur", (e) => e.textContent)) === first);
    await page.keyboard.press(first); await wait(50);
    check("corrected key marked as fixed", (await page.$$(".c.fixed")).length === 1);
    check("next key highlighted on keyboard", (await page.$$(".kb-key.next")).length >= 1);
    check("caps lock banner hidden", await page.$eval("#capslock", (e) => e.hidden));
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F", modifierCapsLock: true, bubbles: true })));
    check("caps lock banner shown", !(await page.$eval("#capslock", (e) => e.hidden)));
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keyup", { key: "CapsLock", modifierCapsLock: false, bubbles: true })));
    check("caps lock banner hides again", await page.$eval("#capslock", (e) => e.hidden));
    await page.keyboard.press("Escape"); await wait(100);

    console.log("Speed test");
    await page.click("#btn-home"); await page.click("#nav-test"); await wait(150);
    await page.keyboard.type((await text()).slice(0, 30), { delay: 5 }); await wait(400);
    check("speed test counts down", /0:5\d/.test(await page.$eval("#stat-time", (e) => e.textContent)));
    await page.keyboard.press("Escape"); await wait(100);

    console.log("Games");
    await page.click("#nav-games"); await wait(100);
    await page.click("[data-rain=letters]"); await page.keyboard.press("Enter"); await wait(1200);
    const w = await page.$$eval(".rain-word", (els) => els.map((e) => e.textContent)[0]);
    await page.keyboard.type(w, { delay: 20 }); await wait(100);
    check("letter rain scores a word", parseInt(await page.$eval("#rain-score", (e) => e.textContent)) > 0);
    await page.click("#btn-rain-quit");
    await page.click("[data-race=slow]"); await page.keyboard.press("Enter"); await wait(3600);
    const rt = await page.$eval("#race-text", (el) => [...el.querySelectorAll(".c")].map((c) => c.textContent).join(""));
    await page.keyboard.type(rt, { delay: 3 }); await wait(300);
    check("rocket race can be won", /You win/.test(await page.$eval("#race-overlay-title", (e) => e.textContent)));
    await page.click("#btn-race-quit");
    await page.click("[data-bubbles=home]"); await page.keyboard.press("Enter"); await wait(1200);
    const b = await page.$$eval(".bubble", (els) => els.map((e) => e.textContent)[0]);
    await page.keyboard.press(b); await wait(100);
    check("bubble pop scores a pop", parseInt(await page.$eval("#bubbles-score", (e) => e.textContent)) > 0);
    await page.click("#btn-bubbles-quit");
    check("game bests recorded", (await profile()).bests.race > 0);

    console.log("Progress and persistence");
    await page.click("#btn-home"); await page.click("#nav-progress"); await wait(150);
    check("heatmap colours used keys", (await page.$$("#kb-heat .kb-key.heat-good, #kb-heat .kb-key.heat-ok, #kb-heat .kb-key.heat-bad")).length > 0);
    await page.reload(); await wait(200);
    check("profile persists across reload", await page.$eval("#chip-name", (e) => e.textContent === "Ada"));

    console.log("Mobile layout");
    await page.setViewportSize({ width: 400, height: 800 });
    await page.click("#nav-lessons"); await page.click(".lesson-card"); await page.click("#btn-start-lesson"); await wait(150);
    check("no horizontal overflow at phone width", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    check("no console or page errors", errors.length === 0);
    console.log(`\n${passed} checks passed`);
  } catch (e) {
    console.error("\n" + e.message);
    if (errors.length) console.error("Browser errors:\n" + errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
