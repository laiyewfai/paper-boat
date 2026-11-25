/* Boot, clock, keys, and the render loop. */

const fadeEl = document.createElement("div");
fadeEl.style.cssText =
  "position:fixed;inset:0;background:#08111b;pointer-events:none;opacity:1;transition:opacity .25s linear";
document.body.appendChild(fadeEl);

const titleEl = document.getElementById("title");
const hintEl = document.getElementById("hint");
const barEl = document.querySelector("#bar i");

let t = START_AT;
let paused = false;
let started = false;
let last = performance.now();
let hintTimer = 0;

if (DEBUG) document.getElementById("err").style.display = "block";

window.addEventListener("error", (e) => fail(`${e.message} (${e.filename}:${e.lineno})`));
window.addEventListener("unhandledrejection", (e) => fail(String(e.reason)));

function begin() {
  if (started) return;
  started = true;
  audio.start();
  titleEl.classList.add("gone");
  hintEl.classList.add("show");
  hintTimer = 0;
}

function restart() {
  t = 0;
  paused = false;
  audio.start();
  audio.setMuted(audio.muted);
  document.body.classList.remove("print");
}

function togglePause() {
  if (!started) { begin(); return; }
  if (paused) {
    paused = false;
    audio.resume(t);
  } else {
    paused = true;
    audio.pause();
  }
}

function seek(seconds) {
  t = clamp(t + seconds, 0, DURATION - 0.05);
  if (started) audio.resume(t);
}

addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); togglePause(); return; }
  if (e.key === "r" || e.key === "R") { restart(); return; }
  if (e.key === "p" || e.key === "P") { document.body.classList.toggle("print"); return; }
  if (e.key === "m" || e.key === "M") { audio.setMuted(!audio.muted); return; }
  if (e.key === "ArrowRight") { seek(5); return; }
  if (e.key === "ArrowLeft") { seek(-5); return; }
  if (!started) begin();
});

addEventListener("pointerdown", () => { if (!started) begin(); });

/* a still frame, for checking the film without playing it */
if (STILL) {
  const want = parseFloat(STILL === "1" ? QUERY.get("t") || "0" : STILL) || 0;
  t = clamp(want, 0, DURATION);
  for (let i = 0; i < 40; i++) {
    updateFilm(t, 1 / 60);
    updateCamera(t, 1 / 60);
  }
  fadeEl.style.opacity = "0";
  titleEl.style.display = "none";
  hintEl.style.display = "none";
  renderer.render(scene, camera);
} else {
  requestAnimationFrame(frame);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;

  if (started && !paused) {
    t = audio.time();
    if (t >= DURATION) {
      // loop: the page closes and opens again
      audio.start();
      t = 0;
    }
  }

  if (started && !paused) {
    audio.update(t);
    updateFilm(t, dt);
    updateCamera(t, dt);
  } else if (!started) {
    // a slow drift on the table before the first click
    t = (now / 1000) * 0.12;
    updateFilm(t, dt);
    updateCamera(t, dt);
  } else {
    updateCamera(t, dt * 0.4);
  }

  fadeEl.style.opacity = String(state.fade);
  barEl.style.width = `${(t / DURATION) * 100}%`;

  if (hintEl.classList.contains("show")) {
    hintTimer += dt;
    if (hintTimer > 9) hintEl.classList.remove("show");
  }

  renderer.render(scene, camera);
}

/* keep the page honest about its own size */
addEventListener("resize", () => {
  if (STILL) { updateCamera(t, 0.2); renderer.render(scene, camera); }
});
