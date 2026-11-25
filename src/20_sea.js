/* The sea at the end: moon, stars, hills, and lanterns floating up. */

const seaGroup = new THREE.Group();
seaGroup.visible = false;
scene.add(seaGroup);

const SEA_Z = -215;

/* moon: a disc and a wide generated halo */
const moon = mesh(new THREE.CircleGeometry(5.2, 48), MAT.moon, {
  pos: [-26, 17, -300], cast: false, receive: false,
});
seaGroup.add(moon);
const moonHalo = addGlow(seaGroup, {
  size: 62, color: 0xcfe2f0, opacity: 0.34, pos: [-26, 17, -300.5], tex: HALO_TEX,
});
const moonHaloInner = addGlow(seaGroup, {
  size: 22, color: 0xf4f0e0, opacity: 0.45, pos: [-26, 17, -300.4],
});

/* stars, thinned towards the horizon */
const starCount = 900;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const a = rand() * TAU;
  const r = 90 + rand() * 140;
  const y = Math.pow(rand(), 0.55) * 120 + 5;
  starPos[i * 3] = Math.cos(a) * r;
  starPos[i * 3 + 1] = y;
  starPos[i * 3 + 2] = SEA_Z + Math.sin(a) * r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, MAT.star);
stars.frustumCulled = false;
seaGroup.add(stars);

/* low hills on the horizon, catching a little moonlight */
for (let i = 0; i < 11; i++) {
  const w = randRange(36, 90);
  const h = randRange(5, 16);
  const hill = mesh(
    new THREE.ConeGeometry(w * 0.5, h, 5),
    new THREE.MeshStandardMaterial({ color: 0x14242e, roughness: 1 }),
    {
      pos: [randRange(-180, 180), h * 0.5 - 1.5, -300 - randRange(0, 70)],
      scale: [1, 1, 0.5],
      cast: false, receive: false,
    }
  );
  seaGroup.add(hill);
}

/* lanterns on the water: glowing points, each one drifting up */
const FLOAT_COUNT = 70;
const floatPos = new Float32Array(FLOAT_COUNT * 3);
const floatState = [];
for (let i = 0; i < FLOAT_COUNT; i++) {
  floatState.push({
    x: randRange(-34, 34),
    z: -166 - rand() * 130,
    y: randRange(0.2, 1.4),
    rise: randRange(0.05, 0.20),
    phase: rand() * TAU,
  });
}
const floatGeo = new THREE.BufferGeometry();
floatGeo.setAttribute("position", new THREE.BufferAttribute(floatPos, 3));
const floatMat = new THREE.PointsMaterial({
  map: GLOW_TEX, color: 0xffc07a, size: 3.4, sizeAttenuation: true,
  transparent: true, opacity: 0.95, depthWrite: false,
  blending: THREE.AdditiveBlending, fog: true,
});
const floaters = new THREE.Points(floatGeo, floatMat);
floaters.frustumCulled = false;
seaGroup.add(floaters);

function updateSea(t, camPos) {
  for (let i = 0; i < FLOAT_COUNT; i++) {
    const f = floatState[i];
    f.y += f.rise * 0.016;
    if (f.y > 11) f.y = 0.3;
    floatPos[i * 3] = f.x + Math.sin(t * 0.6 + f.phase) * 0.3;
    floatPos[i * 3 + 1] = f.y + Math.sin(t * 1.3 + f.phase) * 0.07;
    floatPos[i * 3 + 2] = f.z;
  }
  floatGeo.attributes.position.needsUpdate = true;

  moonHalo.material.opacity = 0.28 + Math.sin(t * 0.7) * 0.05;
  moonHaloInner.material.opacity = 0.40 + Math.sin(t * 1.1) * 0.06;
  stars.rotation.y = t * 0.002;
  stars.position.set(camPos.x * 0.4, 0, camPos.z);
}
