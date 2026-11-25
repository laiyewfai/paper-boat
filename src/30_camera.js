/* Where the boat is, and where the camera stands while it goes. */

/* boat position along the canal: keyframed, smoothed between keys */
const Z_KEYS = [
  [0.0, 0],
  [at(CUE.launch), 0],
  [at(CUE.launch) + 1.2, -1.4],
  [at(CUE.storm), -64],
  [at(CUE.tunnel), -100],
  [at(CUE.sea), -154],
  [at(CUE.unfold), -206],
  [DURATION, -208],
];

function zAt(t) {
  if (t <= Z_KEYS[0][0]) return Z_KEYS[0][1];
  for (let i = 1; i < Z_KEYS.length; i++) {
    const [t1, z1] = Z_KEYS[i];
    if (t <= t1) {
      const [t0, z0] = Z_KEYS[i - 1];
      return lerp(z0, z1, smooth(span(t, t0, t1)));
    }
  }
  return Z_KEYS[Z_KEYS.length - 1][1];
}

function boatPose(t) {
  const onWater = t > at(CUE.launch) + 0.2;
  const z = zAt(t);
  const storm = span(t, at(CUE.storm), at(CUE.storm) + 1.5) * (1 - span(t, at(CUE.tunnel) - 1, at(CUE.tunnel) + 1));
  const sea = span(t, at(CUE.sea), at(CUE.sea) + 2) * (1 - span(t, at(CUE.unfold), at(CUE.unfold) + 2));

  const amp = onWater ? 0.018 + storm * 0.05 + sea * 0.03 : 0;
  const bob = Math.sin(t * 3.1) * amp + Math.sin(t * 5.3 + 1.2) * amp * 0.5;
  const roll = Math.sin(t * 2.2 + 0.4) * (0.05 + storm * 0.22 + sea * 0.10);
  const pitch = Math.sin(t * 2.7) * (0.03 + storm * 0.12) + storm * 0.12;

  return {
    x: Math.sin(t * 1.7) * 0.06 + storm * Math.sin(t * 2.9) * 0.25,
    y: onWater ? 0.055 + bob : 0.012,
    z,
    roll,
    pitch,
    yaw: Math.sin(t * 0.9) * 0.05 + storm * Math.sin(t * 2.1) * 0.3,
    scale: 1,
    onWater,
    storm,
    sea,
  };
}

/* --- shots -------------------------------------------------------------- */

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function shake(t, amount) {
  if (amount <= 0.001) return v3(0, 0, 0);
  const s = amount * 0.09;
  return v3(
    Math.sin(t * 41.3) * s + Math.sin(t * 17.1) * s * 0.6,
    Math.sin(t * 37.7 + 1.3) * s + Math.sin(t * 23.9) * s * 0.5,
    Math.sin(t * 29.1 + 2.1) * s * 0.4
  );
}

const SHOTS = [
  {
    // the sheet on the table, a slow push in
    t0: 0, t1: at(CUE.launch) + 0.2,
    pos(t, b, u) { return v3(lerp(1.9, 1.15, u), lerp(0.95, 0.78, u), lerp(3.6, 2.85, u)); },
    look(t, b) { return v3(0, 0.14, 0.02); },
    fov(t, b, u) { return lerp(36, 33, u); },
  },
  {
    // the drop, camera right above the gutter
    t0: at(CUE.launch) + 0.2, t1: at(CUE.launch) + 1.6,
    pos(t, b, u) { return v3(lerp(0.5, 0.1, u), lerp(0.95, 0.42, u), b.z + lerp(1.5, 1.1, u)); },
    look(t, b) { return v3(b.x, 0.12, b.z - 0.4); },
    fov() { return 40; },
  },
  {
    // following behind, low over the water
    t0: at(CUE.launch) + 1.6, t1: at(CUE.street) + 5,
    pos(t, b) { return v3(b.x * 0.5 + 1.15, 0.52, b.z + 2.7); },
    look(t, b) { return v3(b.x, 0.34, b.z - 7); },
    fov() { return 46; },
  },
  {
    // tracking alongside
    t0: at(CUE.street) + 5, t1: at(CUE.storm),
    pos(t, b, u) { return v3(lerp(2.1, 2.8, u), lerp(0.55, 0.9, u), b.z + 1.3); },
    look(t, b) { return v3(b.x, 0.3, b.z - 0.6); },
    fov() { return 44; },
  },
  {
    // storm: close, shaken by the drums
    t0: at(CUE.storm), t1: at(CUE.tunnel),
    pos(t, b) {
      const s = shake(t, 0.55 + score.pulse(t, BEAT, 2.4) * 0.7);
      return v3(b.x * 0.6 + 1.25 + s.x, 0.30 + s.y, b.z + 2.9 + s.z);
    },
    look(t, b) { return v3(b.x, 0.30, b.z - 5.0); },
    fov() { return 50; },
  },
  {
    // the drain: wide, drifting up as the roof closes in
    t0: at(CUE.tunnel), t1: at(CUE.sea),
    pos(t, b, u) { return v3(Math.sin(t * 0.4) * 0.3, lerp(0.55, 1.15, u), b.z + 3.1); },
    look(t, b) { return v3(0, 0.8, b.z - 8); },
    fov() { return 48; },
  },
  {
    // out onto the sea, the camera lifts and pulls back
    t0: at(CUE.sea), t1: at(CUE.unfold),
    pos(t, b, u) { return v3(lerp(-0.4, 0.9, u), lerp(0.8, 2.0, u), b.z + lerp(3.4, 6.4, u)); },
    look(t, b) { return v3(b.x, 0.4, b.z - 2.5); },
    fov(t, b, u) { return lerp(44, 38, u); },
  },
  {
    // the unfold, seen from above, then the sheet is a page again
    t0: at(CUE.unfold), t1: DURATION + 0.5,
    pos(t, b, u) {
      return v3(lerp(0.6, 1.6, u), lerp(1.5, 2.9, u), b.z + lerp(2.0, 2.4, u));
    },
    look(t, b, u) { return v3(b.x, lerp(0.15, 0.02, u), b.z); },
    fov(t, b, u) { return lerp(40, 46, u); },
  },
];

const camTarget = { pos: new THREE.Vector3(1.2, 1.3, 2.3), look: new THREE.Vector3(0, 0, 0), fov: 38 };
const camNow = { pos: camTarget.pos.clone(), look: camTarget.look.clone(), fov: 38 };

function sampleShot(shot, t, b) {
  const u = easeInOut(span(t, shot.t0, shot.t1));
  return { pos: shot.pos(t, b, u), look: shot.look(t, b, u), fov: shot.fov(t, b, u) };
}

function cameraTargetAt(t) {
  const b = boatPose(t);
  let shot = SHOTS[SHOTS.length - 1];
  for (const s of SHOTS) if (t >= s.t0 && t < s.t1) { shot = s; break; }

  const cur = sampleShot(shot, t, b);

  // crossfade into the next shot so cuts are soft, not snappy
  const next = SHOTS[SHOTS.indexOf(shot) + 1];
  const blend = 0.7;
  if (next && t > shot.t1 - blend) {
    const k = smooth(span(t, shot.t1 - blend, shot.t1));
    const n = sampleShot(next, t, b);
    cur.pos.lerp(n.pos, k);
    cur.look.lerp(n.look, k);
    cur.fov = lerp(cur.fov, n.fov, k);
  }
  return cur;
}

function updateCamera(t, dt) {
  const target = cameraTargetAt(t);
  const k = 1 - Math.exp(-9 * dt);
  camNow.pos.lerp(target.pos, k);
  camNow.look.lerp(target.look, k);
  camNow.fov = lerp(camNow.fov, target.fov, k);

  camera.position.copy(camNow.pos);
  camera.lookAt(camNow.look);
  if (Math.abs(camera.fov - camNow.fov) > 0.001) {
    camera.fov = camNow.fov;
    camera.updateProjectionMatrix();
  }
}
