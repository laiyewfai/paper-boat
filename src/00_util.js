/* Small maths kit shared by every part of the film. */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const saturate = (v) => clamp(v, 0, 1);

/* progress of t through [a,b], smoothed */
function span(t, a, b) {
  if (b <= a) return t >= b ? 1 : 0;
  return saturate((t - a) / (b - a));
}
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeIn(t) { return t * t * t; }

/* deterministic noise so every run of the film looks the same */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261125);
const randRange = (a, b) => a + (b - a) * rand();

/* one-pole damping that does not care about frame rate */
function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/* palette: night water, warm lanterns, pale paper. kept small on purpose. */
const PALETTE = {
  ink: 0x0a1622,
  deep: 0x0d2233,
  water: 0x123240,
  waterLit: 0x2e6f74,
  paper: 0xf2ecdd,
  paperShade: 0xd9d0bd,
  amber: 0xf0a35e,
  ember: 0xffcf8a,
  mint: 0x9fe6cf,
  glass: 0x1b4a55,
  brick: 0x6b4a3e,
  stone: 0x33454f,
  moon: 0xf6f2e2,
};

/* a tiny key/value store for the debug query string */
const QUERY = new URLSearchParams(location.search);
const DEBUG = QUERY.has("debug");
const STILL = QUERY.get("still");
const START_AT = parseFloat(QUERY.get("t") || "0") || 0;
/* ?off=water,rain,sea  hides a layer, for checking the film one piece at a time */
const HIDE = new Set((QUERY.get("off") || "").split(",").filter(Boolean));

function fail(msg) {
  const box = document.getElementById("err");
  if (box) {
    box.style.display = "block";
    box.textContent += msg + "\n";
  }
  console.error(msg);
}
