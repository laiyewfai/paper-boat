/* Rain: instanced streaks that follow the camera, plus rings on the water. */

const RAIN_COUNT = 4200;
const rainGeo = new THREE.BoxGeometry(0.005, 0.30, 0.005);
const rainMat = new THREE.MeshBasicMaterial({
  color: 0xcfe4ee, transparent: true, opacity: 0.3, depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const rain = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
rain.frustumCulled = false;
scene.add(rain);

const drops = [];
for (let i = 0; i < RAIN_COUNT; i++) {
  drops.push({
    x: randRange(-9, 9),
    y: randRange(0, 15),
    z: randRange(-18, 6),
    v: randRange(9, 15),
    s: randRange(0.6, 1.5),
  });
}

const rainDummy = new THREE.Object3D();

function updateRain(t, intensity, camPos, dt) {
  rainMat.opacity = 0.06 + intensity * 0.30;
  const visible = Math.floor(RAIN_COUNT * clamp(intensity, 0, 1));
  rainDummy.rotation.set(0, 0, 0.06);

  for (let i = 0; i < RAIN_COUNT; i++) {
    const d = drops[i];
    d.y -= d.v * dt;
    if (d.y < -0.4 || d.z < camPos.z - 16 || d.z > camPos.z - 2 ||
        d.x < camPos.x - 8 || d.x > camPos.x + 8) {
      d.y = randRange(6, 15);
      d.x = camPos.x + randRange(-7, 7);
      d.z = camPos.z - randRange(2.2, 15);
    }
    if (i >= visible) {
      rainDummy.position.set(0, -999, 0);
      rainDummy.scale.setScalar(0.0001);
    } else {
      rainDummy.position.set(d.x, d.y, d.z);
      rainDummy.scale.set(1, d.s * 1.4, 1);
    }
    rainDummy.updateMatrix();
    rain.setMatrixAt(i, rainDummy.matrix);
  }
  rain.instanceMatrix.needsUpdate = true;
}

/* rings where drops land */
const RING_COUNT = 90;
const ringGeo = new THREE.RingGeometry(0.06, 0.09, 16);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xb9d8dd, transparent: true, opacity: 0.22,
  side: THREE.DoubleSide, depthWrite: false,
});
const rings = new THREE.InstancedMesh(ringGeo, ringMat, RING_COUNT);
rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
rings.frustumCulled = false;
scene.add(rings);

const ringState = [];
for (let i = 0; i < RING_COUNT; i++) {
  ringState.push({ x: 0, z: 0, age: rand() * 1.6, life: randRange(0.9, 1.6) });
}

const ringDummy = new THREE.Object3D();

function updateRings(t, intensity, camPos, dt) {
  ringMat.opacity = 0.10 + intensity * 0.24;
  for (let i = 0; i < RING_COUNT; i++) {
    const r = ringState[i];
    r.age += dt;
    if (r.age > r.life) {
      r.age = 0;
      r.life = randRange(0.8, 1.7);
      r.x = camPos.x + randRange(-9, 9);
      r.z = camPos.z + randRange(-16, 6);
    }
    const p = r.age / r.life;
    const s = 0.4 + p * 4.2;
    ringDummy.position.set(r.x, 0.012, r.z);
    ringDummy.rotation.set(-Math.PI / 2, 0, 0);
    ringDummy.scale.setScalar(s * clamp(intensity * 1.4, 0, 1));
    ringDummy.updateMatrix();
    rings.setMatrixAt(i, ringDummy.matrix);
  }
  rings.instanceMatrix.needsUpdate = true;
}
