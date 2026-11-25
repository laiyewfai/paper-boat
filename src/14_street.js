/* Two sets: the table where the paper is folded, and the canal street. */

/* --- the table ---------------------------------------------------------- */

const tableGroup = new THREE.Group();
scene.add(tableGroup);

const tableTop = mesh(
  new THREE.CircleGeometry(220, 72),
  new THREE.MeshStandardMaterial({ color: 0x1d1712, roughness: 0.85, metalness: 0.05 }),
  { pos: [0, -0.002, 0], rot: [-Math.PI / 2, 0, 0], cast: false }
);
tableGroup.add(tableTop);

const tableSpot = new THREE.SpotLight(0xffc98a, 30, 18, 0.7, 0.6, 1.5);
tableSpot.position.set(0.4, 5.2, 1.6);
tableSpot.target.position.set(0, 0, 0);
tableSpot.castShadow = true;
tableSpot.shadow.mapSize.set(1024, 1024);
tableSpot.shadow.bias = -0.0012;
tableGroup.add(tableSpot, tableSpot.target);

/* a cup and a book, so the sheet has a size to be measured against */
const cup = mesh(
  new THREE.CylinderGeometry(0.16, 0.13, 0.2, 24),
  new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.35 }),
  { pos: [-1.5, 0.1, 0.55] }
);
const cupRim = mesh(
  new THREE.TorusGeometry(0.155, 0.008, 8, 32),
  MAT.metal, { pos: [-1.5, 0.2, 0.55], rot: [Math.PI / 2, 0, 0] }
);
const book = mesh(
  new THREE.BoxGeometry(0.9, 0.12, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x243b46, roughness: 0.8 }),
  { pos: [1.6, 0.06, -0.5], rot: [0, 0.4, 0] }
);
tableGroup.add(cup, cupRim, book);

/* --- the canal street --------------------------------------------------- */

const streetGroup = new THREE.Group();
streetGroup.visible = false;
scene.add(streetGroup);

const LANTERNS = [];
const LANTERN_POSITIONS = [];

function buildStreet() {
  const sideMat = [MAT.brick, MAT.stone, MAT.timber];
  const clothMat = [MAT.cloth, MAT.clothWarm];

  for (const side of [-1, 1]) {
    let z = 6;
    let i = 0;
    while (z > -96) {
      const depth = randRange(4.5, 8.5);
      const height = randRange(3.2, 7.5);
      const width = randRange(3.0, 5.0);
      const x = side * (4.4 + width * 0.5);

      const body = mesh(BOX, sideMat[i % 3], {
        pos: [x, height * 0.5, z - depth * 0.5],
        scale: [width, height, depth],
      });
      streetGroup.add(body);

      // roof lip
      const roof = mesh(BOX, MAT.timber, {
        pos: [x - side * 0.25, height + 0.12, z - depth * 0.5],
        scale: [width + 0.5, 0.22, depth + 0.4],
      });
      streetGroup.add(roof);

      // two lit windows facing the water
      for (let k = 0; k < 2; k++) {
        if (rand() > 0.55) continue;
        const wy = 1.4 + rand() * (height - 2.0);
        const win = mesh(
          new THREE.PlaneGeometry(0.5, 0.7),
          MAT.glow,
          {
            pos: [side * 4.35, wy, z - depth * (0.25 + 0.4 * k)],
            rot: [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0],
            cast: false, receive: false,
          }
        );
        win.material = MAT.glow;
        streetGroup.add(win);
      }

      // awning over the water
      if (i % 2 === 0) {
        const aw = mesh(BOX, clothMat[i % 2], {
          pos: [side * 3.5, 2.5, z - depth * 0.5],
          scale: [1.9, 0.08, depth * 0.8],
          rot: [0, 0, side * 0.18],
        });
        streetGroup.add(aw);
      }

      z -= depth + randRange(0.2, 1.4);
      i++;
    }
  }

  // lanterns strung over the water, one pair every six metres
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffd8a6, emissive: 0xffb066, emissiveIntensity: 3.2, roughness: 0.7,
  });
  for (let z = 4; z > -92; z -= 6) {
    for (const side of [-1, 1]) {
      const x = side * 2.1;
      const y = 2.9 + Math.sin(z * 0.3) * 0.15;
      const l = mesh(new THREE.SphereGeometry(0.19, 16, 12), lanternMat, {
        pos: [x, y, z], cast: false,
      });
      streetGroup.add(l);
      const halo = addGlow(l, { size: 1.5, color: 0xffb877, opacity: 0.55 });
      halo.position.set(0, 0, 0);
      LANTERNS.push({ mesh: l, base: new THREE.Vector3(x, y, z), phase: rand() * TAU, halo });
      LANTERN_POSITIONS.push(new THREE.Vector3(x, y, z));

      const line = mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 1.2, 4),
        MAT.timber, { pos: [x, y + 0.6, z], cast: false }
      );
      streetGroup.add(line);
    }
  }

  // wet cobbles either side of the gutter
  for (const side of [-1, 1]) {
    const kerb = mesh(BOX, MAT.stone, {
      pos: [side * 3.9, 0.12, -44], scale: [0.9, 0.24, 110],
    });
    streetGroup.add(kerb);
  }
}
buildStreet();

/* three lights hop between the nearest lanterns so the street stays lit */
const lanternLights = [0, 1, 2].map(() => {
  const p = new THREE.PointLight(PALETTE.amber, 0, 9, 2);
  streetGroup.add(p);
  return p;
});

function updateLanterns(t, camZ) {
  for (const l of LANTERNS) {
    const sway = Math.sin(t * 1.4 + l.phase) * 0.035;
    l.mesh.position.set(l.base.x + sway, l.base.y + sway * 0.4, l.base.z);
    const near = clamp(1 - Math.abs(l.base.z - camZ) / 40, 0, 1);
    l.mesh.scale.setScalar(0.9 + near * 0.2);
    l.halo.scale.setScalar(1.3 + near * 0.5 + Math.sin(t * 3.1 + l.phase) * 0.05);
    l.halo.material.opacity = 0.34 + near * 0.3;
  }

  // assign the three lights to the closest lanterns
  let best = [];
  for (const l of LANTERNS) {
    const d = Math.abs(l.base.z - camZ);
    if (best.length < 3) best.push({ l, d });
    else {
      let worst = 0;
      for (let i = 1; i < 3; i++) if (best[i].d > best[worst].d) worst = i;
      if (d < best[worst].d) best[worst] = { l, d };
    }
  }
  best.sort((a, b) => a.d - b.d);
  for (let i = 0; i < 3; i++) {
    const pick = best[i];
    if (!pick) { lanternLights[i].intensity = 0; continue; }
    lanternLights[i].position.copy(pick.l.mesh.position);
    lanternLights[i].intensity = 9 * clamp(1 - pick.d / 30, 0, 1);
  }
}
