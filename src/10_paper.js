/* The sheet of paper, and the four moves that turn it into a boat.

   The sheet is a grid in (u, v). Four moves deform it:
     1. the keel drops into a V
     2. bow and stern taper to a point
     3. the two ends lift
     4. the sail rises
   All four are driven by the score, so the folds land on the clacks. */

const SHEET_L = 1.34;   // bow to stern
const SHEET_W = 0.74;   // gunwale to gunwale
const COLS = 40;
const ROWS = 24;

function makeSheet() {
  const geo = new THREE.BufferGeometry();
  const verts = (COLS + 1) * (ROWS + 1);
  const pos = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  let p = 0, q = 0;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const u = i / COLS, v = j / ROWS;
      pos[p++] = (v - 0.5) * SHEET_W;
      pos[p++] = 0;
      pos[p++] = (u - 0.5) * SHEET_L;
      uv[q++] = u; uv[q++] = v;
    }
  }
  const idx = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = j * (COLS + 1) + i;
      const b = a + 1;
      const c = a + COLS + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const HULL_DEPTH = 0.17;

/* keel: 0..1 depth of the V. taper: 0..1 how far the ends close.
   lift: 0..1 how much bow and stern rise. */
function foldSheet(geo, keel, taper, lift) {
  const pos = geo.attributes.position;
  const arr = pos.array;
  const halfL = SHEET_L * 0.5;
  const halfW = SHEET_W * 0.5;
  let k = 0;

  for (let j = 0; j <= ROWS; j++) {
    const v = j / ROWS;               // 0..1 across
    const vv = v * 2 - 1;             // -1..1
    const edge = Math.abs(vv);        // 0 at the keel, 1 at the gunwale

    for (let i = 0; i <= COLS; i++) {
      const u = i / COLS;
      const z = (u - 0.5) * SHEET_L;
      const zn = z / halfL;           // -1 bow, 1 stern
      const endness = Math.pow(Math.abs(zn), 2.0);

      // the plan narrows to a point at both ends
      const plan = 1 - taper * (1 - Math.sqrt(Math.max(0, 1 - zn * zn)));

      const x = vv * halfW * plan;
      // the V: deepest at the keel, zero at the gunwale
      const y = -keel * HULL_DEPTH * (1 - edge) + lift * endness * 0.09;

      arr[k++] = x;
      arr[k++] = y;
      arr[k++] = z;
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

const boat = new THREE.Group();
const sheetGeo = makeSheet();
const sheet = mesh(sheetGeo, MAT.paper, { receive: true });
boat.add(sheet);

/* the sail: two triangles of the same paper, one just behind the other */
function sailGeo(width, height, depth) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([
    -width, 0, 0,
    width, 0, 0,
    0, height, depth * 0.35,
  ], 3));
  g.computeVertexNormals();
  return g;
}

const sailGroup = new THREE.Group();
const sailFront = mesh(sailGeo(0.19, 0.52, 0.10), MAT.paper, { cast: true });
const sailBack = mesh(sailGeo(0.13, 0.40, -0.10), MAT.paperThin, { cast: true });
sailBack.position.set(0.015, 0.005, -0.04);
sailGroup.add(sailFront, sailBack);
sailGroup.position.set(0, 0.02, 0.0);
boat.add(sailGroup);

/* a small lantern at the mast foot, so the boat carries its own light */
const bowLantern = mesh(new THREE.SphereGeometry(0.038, 12, 10), MAT.glow, {
  pos: [0, 0.035, 0.02], cast: false,
});
boat.add(bowLantern);

const boatGroup = new THREE.Group();
boatGroup.add(boat);
scene.add(boatGroup);

const boatState = {
  keel: 0, taper: 0, lift: 0, sail: 0,
  x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, scale: 1,
};

function applyBoat() {
  foldSheet(sheetGeo, boatState.keel, boatState.taper, boatState.lift);
  const s = Math.max(0.001, boatState.sail);
  sailGroup.scale.set(s, s, s);
  sailGroup.rotation.z = Math.sin(boatState.pitch * 3) * 0.04;
  bowLantern.scale.setScalar(Math.max(0.001, boatState.sail * 0.9));
  boatGroup.position.set(boatState.x, boatState.y, boatState.z);
  boatGroup.rotation.set(boatState.pitch, boatState.yaw, boatState.roll);
  boatGroup.scale.setScalar(boatState.scale);
}
