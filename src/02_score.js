/* One score. The synth plays it, and everything on screen reads it too. */

const BPM = 96;
const BEAT = 60 / BPM;          // 0.625 s
const BAR = BEAT * 4;           // 2.5 s
const BARS = 30;
const DURATION = BAR * BARS;    // 75 s

/* sections, in bars. visuals and audio both read these. */
const CUE = {
  table: 0,
  fold: 0,
  launch: 3.2,
  street: 4,
  storm: 14,
  tunnel: 18,
  sea: 22,
  unfold: 27.2,
  seal: 29,
  end: 30,
};
const at = (bar) => bar * BAR;

/* five-note scale, two octaves, in semitones from A3 */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const A3 = 57; // midi

function midiOf(degree, octave = 0) {
  const i = ((degree % SCALE.length) + SCALE.length) % SCALE.length;
  const wrap = Math.floor(degree / SCALE.length);
  return A3 + SCALE[i] + 12 * (octave + wrap);
}

/* --- the note list ------------------------------------------------------ */

const NOTES = [];
function note(t, inst, midi, vel = 0.7, dur = 0.4) {
  if (t < 0 || t > DURATION + 1) return;
  NOTES.push({ t, inst, midi, vel, dur });
}

/* paper: four clacks as the sheet folds, then the drop */
[0.0, 0.62, 1.24, 1.86].forEach((t, i) => note(t, "block", 84 - i * 3, 0.85, 0.12));
note(at(2.6), "sip", 0, 0.5, 0.9);
note(at(3.0), "splash", 0, 0.55, 1.4);

/* street: kalimba carries the tune, marimba keeps the water moving */
const MOTIF = [
  [0, 1], [1, 1], [3, 2], [2, 1], [4, 1], [3, 2],
  [5, 1], [4, 1], [2, 1], [3, 3],
];
const MOTIF_B = [
  [4, 1], [5, 1], [7, 2], [6, 1], [4, 1], [3, 2],
  [2, 1], [4, 1], [3, 1], [0, 3],
];
function playMotif(startBar, motif, octave, vel) {
  let b = startBar;
  for (const [deg, len] of motif) {
    note(at(b), "kalimba", midiOf(deg, octave), vel, len * BEAT * 0.95);
    b += len;
  }
  return b;
}
playMotif(CUE.street, MOTIF, 0, 0.72);
playMotif(CUE.street + 5, MOTIF, 0, 0.62);
playMotif(CUE.street + 10, MOTIF_B, 0, 0.72);

/* bass: one long note a bar through the whole sail */
for (let bar = CUE.street; bar < CUE.storm; bar++) {
  const deg = [0, 0, 3, 2][(bar - CUE.street) % 4];
  note(at(bar), "bass", midiOf(deg, -2), 0.5, BAR * 0.9);
}

/* marimba droplets, off the beat, quiet */
for (let bar = CUE.street; bar < CUE.storm; bar++) {
  for (let beat = 0.5; beat < 4; beat += 1.5) {
    note(at(bar) + beat * BEAT, "marimba", midiOf((bar * 3 + beat) % 7, 1), 0.22, 0.5);
  }
}

/* storm: taiko on the downbeat, the tune climbs and gets louder */
for (let bar = CUE.storm; bar < CUE.tunnel; bar++) {
  note(at(bar), "taiko", 0, 0.9, 1.1);
  note(at(bar) + 2 * BEAT, "taiko", 0, 0.45, 0.8);
}
playMotif(CUE.storm, MOTIF, 1, 0.5);

/* tunnel: sparse, water dripping, a single bell at the mouth */
note(at(CUE.tunnel), "bell", midiOf(0, 1), 0.5, 3.0);
for (let i = 0; i < 9; i++) {
  note(at(CUE.tunnel) + 1.1 + i * 1.05, "marimba", midiOf(3 + (i % 5), 1), 0.16, 0.6);
}

/* sea: the theme returns wide and slow, bells on the swell */
playMotif(CUE.sea, MOTIF_B, 0, 0.6);
for (let bar = CUE.sea; bar < CUE.unfold; bar++) {
  note(at(bar), "bass", midiOf([0, 3, 4, 2][(bar - CUE.sea) % 4], -2), 0.42, BAR * 1.1);
  note(at(bar) + 2 * BEAT, "bell", midiOf([4, 5, 7, 6][(bar - CUE.sea) % 4], 1), 0.3, 2.4);
}

/* unfold: the sheet goes flat again, one warm chord, then the seal */
note(at(CUE.unfold), "sip", 0, 0.4, 1.2);
[0, 2, 4].forEach((d, i) => note(at(CUE.unfold) + i * 0.18, "kalimba", midiOf(d, 0), 0.5, 2.2));
note(at(CUE.seal), "block", 80, 0.9, 0.2);
note(at(CUE.seal) + 0.12, "block", 84, 0.7, 0.2);
note(at(CUE.seal) + 0.24, "bell", midiOf(0, 2), 0.45, 3.4);

NOTES.sort((a, b) => a.t - b.t);

/* --- queries the picture asks ------------------------------------------ */

const score = {
  duration: DURATION,
  bar(t) { return t / BAR; },
  beat(t) { return t / BEAT; },
  /* 1 -> 0 decay after each beat, used for bobbing and light pulses */
  pulse(t, every = BEAT, sharp = 3.2) {
    const p = ((t % every) + every) % every / every;
    return Math.pow(1 - p, sharp);
  },
  /* smooth 0..1 window between two times */
  between(t, a, b) { return span(t, at(a), at(b)); },
  /* is the film inside a section */
  inSection(t, name) {
    const order = ["table", "street", "storm", "tunnel", "sea", "unfold"];
    const i = order.indexOf(name);
    const start = at(CUE[name]);
    const next = i + 1 < order.length ? at(CUE[order[i + 1]]) : DURATION + 1;
    return t >= start && t < next;
  },
  notes,
};

function notes(inst) {
  return NOTES.filter((n) => n.inst === inst);
}
