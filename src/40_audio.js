/* The synth. Every sound is generated here, sample by sample, no files. */

const audio = {
  ctx: null,
  master: null,
  rainGain: null,
  rainFilter: null,
  waterGain: null,
  noise: null,
  startTime: 0,
  playing: false,
  muted: false,
  cursor: 0,
};

function makeNoiseBuffer(ctx, seconds = 2.0) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = 0.98 * last + 0.02 * white; // a little brown, less hiss
    data[i] = last * 3.2;
  }
  return buf;
}

audio.init = function () {
  if (this.ctx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) { fail("no WebAudio in this browser"); return; }

  const ctx = new Ctx();
  this.ctx = ctx;

  const master = ctx.createGain();
  master.gain.value = 0.0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;
  master.connect(comp).connect(ctx.destination);
  this.master = master;

  this.noise = makeNoiseBuffer(ctx);

  // rain bed
  const rain = ctx.createBufferSource();
  rain.buffer = this.noise;
  rain.loop = true;
  const rf = ctx.createBiquadFilter();
  rf.type = "bandpass";
  rf.frequency.value = 2400;
  rf.Q.value = 0.6;
  const rg = ctx.createGain();
  rg.gain.value = 0;
  rain.connect(rf).connect(rg).connect(master);
  rain.start();
  this.rainGain = rg;
  this.rainFilter = rf;

  // water lapping
  const wsrc = ctx.createBufferSource();
  wsrc.buffer = this.noise;
  wsrc.loop = true;
  const wf = ctx.createBiquadFilter();
  wf.type = "lowpass";
  wf.frequency.value = 420;
  const wg = ctx.createGain();
  wg.gain.value = 0;
  wsrc.connect(wf).connect(wg).connect(master);
  wsrc.start();
  this.waterGain = wg;
};

function env(ctx, param, t0, peak, attack, decay, curve = 2.2) {
  param.cancelScheduledValues(t0);
  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(peak, t0 + attack);
  param.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(ctx, out, t0, freq, { type = "sine", peak = 0.2, attack = 0.004, decay = 0.5, detune = 0, glide = 0 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t0 + attack + decay);
  osc.detune.value = detune;
  osc.connect(g).connect(out);
  env(ctx, g.gain, t0, peak, attack, decay);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.05);
  return osc;
}

function noiseBurst(ctx, out, t0, { freq = 1800, q = 1.2, peak = 0.2, attack = 0.002, decay = 0.12, type = "bandpass", sweep = 0 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = audio.noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * sweep), t0 + attack + decay);
  const g = ctx.createGain();
  src.connect(f).connect(g).connect(out);
  env(ctx, g.gain, t0, peak, attack, decay);
  src.start(t0);
  src.stop(t0 + attack + decay + 0.05);
}

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const VOICES = {
  kalimba(ctx, out, t0, midi, vel, dur) {
    const f = hz(midi);
    tone(ctx, out, t0, f, { type: "sine", peak: 0.30 * vel, decay: Math.min(1.6, dur + 0.6) });
    tone(ctx, out, t0, f * 2.01, { type: "sine", peak: 0.09 * vel, decay: 0.35 });
    tone(ctx, out, t0, f * 5.43, { type: "sine", peak: 0.035 * vel, decay: 0.12 });
  },
  marimba(ctx, out, t0, midi, vel, dur) {
    const f = hz(midi);
    tone(ctx, out, t0, f, { type: "triangle", peak: 0.16 * vel, decay: 0.30 + dur * 0.3 });
    tone(ctx, out, t0, f * 4, { type: "sine", peak: 0.04 * vel, decay: 0.10 });
  },
  bass(ctx, out, t0, midi, vel, dur) {
    const f = hz(midi);
    tone(ctx, out, t0, f, { type: "sine", peak: 0.26 * vel, attack: 0.02, decay: dur * 1.1 });
    tone(ctx, out, t0, f * 2, { type: "triangle", peak: 0.05 * vel, attack: 0.02, decay: dur * 0.8 });
  },
  block(ctx, out, t0, midi, vel, dur) {
    noiseBurst(ctx, out, t0, { freq: 2100, q: 6, peak: 0.30 * vel, decay: 0.055 });
    tone(ctx, out, t0, 940, { type: "sine", peak: 0.10 * vel, decay: 0.05 });
  },
  taiko(ctx, out, t0, midi, vel, dur) {
    tone(ctx, out, t0, 120, { type: "sine", peak: 0.42 * vel, attack: 0.004, decay: 0.5, glide: 0.55 });
    noiseBurst(ctx, out, t0, { freq: 260, q: 0.8, peak: 0.22 * vel, decay: 0.16, type: "lowpass" });
  },
  bell(ctx, out, t0, midi, vel, dur) {
    const f = hz(midi);
    tone(ctx, out, t0, f, { type: "sine", peak: 0.13 * vel, attack: 0.008, decay: dur });
    tone(ctx, out, t0, f * 2.76, { type: "sine", peak: 0.05 * vel, decay: dur * 0.7 });
    tone(ctx, out, t0, f * 5.4, { type: "sine", peak: 0.02 * vel, decay: dur * 0.4 });
  },
  sip(ctx, out, t0, midi, vel, dur) {
    noiseBurst(ctx, out, t0, { freq: 700, q: 2.5, peak: 0.12 * vel, attack: 0.12, decay: dur, sweep: 2.2 });
  },
  splash(ctx, out, t0, midi, vel, dur) {
    noiseBurst(ctx, out, t0, { freq: 1200, q: 0.7, peak: 0.30 * vel, attack: 0.01, decay: dur, sweep: 0.25, type: "lowpass" });
    tone(ctx, out, t0, 220, { type: "sine", peak: 0.10 * vel, attack: 0.01, decay: 0.35, glide: 0.4 });
  },
};

audio.start = function () {
  this.init();
  const ctx = this.ctx;
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  this.startTime = ctx.currentTime + 0.12;
  this.cursor = 0;
  this.playing = true;
  this.master.gain.cancelScheduledValues(ctx.currentTime);
  this.master.gain.setValueAtTime(0.0001, ctx.currentTime);
  this.master.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.9, ctx.currentTime + 1.2);
};

audio.time = function () {
  if (!this.ctx) return START_AT;
  return this.playing ? Math.max(0, this.ctx.currentTime - this.startTime) : START_AT;
};

/* called every frame: schedule notes a little ahead, set the beds */
audio.update = function (t) {
  if (!this.ctx || !this.playing) return;
  const ctx = this.ctx;
  const horizon = t + 0.7;

  while (this.cursor < NOTES.length && NOTES[this.cursor].t <= horizon) {
    const n = NOTES[this.cursor++];
    const when = this.startTime + n.t;
    if (when < ctx.currentTime - 0.2) continue;
    const voice = VOICES[n.inst];
    if (voice) voice(ctx, this.master, Math.max(when, ctx.currentTime), n.midi, n.vel, n.dur);
  }

  const now = ctx.currentTime;
  const storm = span(t, at(CUE.storm), at(CUE.storm) + 1.2) * (1 - span(t, at(CUE.tunnel) - 1, at(CUE.tunnel) + 0.5));
  const street = span(t, at(CUE.street), at(CUE.street) + 1.0) * (1 - span(t, at(CUE.tunnel), at(CUE.tunnel) + 1.0));
  const rainAmt = street * 0.05 + storm * 0.12;
  const lapAmt = street * 0.035 + storm * 0.06 + span(t, at(CUE.sea), at(CUE.sea) + 2) * 0.05;

  this.rainGain.gain.setTargetAtTime(rainAmt, now, 0.4);
  this.waterGain.gain.setTargetAtTime(lapAmt, now, 0.5);
  this.rainFilter.frequency.setTargetAtTime(1800 + storm * 2200, now, 0.6);
};

audio.setMuted = function (muted) {
  this.muted = muted;
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  this.master.gain.cancelScheduledValues(now);
  this.master.gain.setTargetAtTime(muted ? 0.0001 : 0.9, now, 0.08);
};

audio.pause = function () {
  if (!this.ctx) return;
  this.ctx.suspend();
  this.playing = false;
};
audio.resume = function (t) {
  if (!this.ctx) { this.start(0); return; }
  this.ctx.resume();
  this.startTime = this.ctx.currentTime - t;
  this.cursor = NOTES.findIndex((n) => n.t > t);
  if (this.cursor < 0) this.cursor = NOTES.length;
  this.playing = true;
};
