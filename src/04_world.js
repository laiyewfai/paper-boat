/* Renderer, scene, lights and the small set of materials the film reuses. */

const stage = document.getElementById("stage");

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  alpha: false,
});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.ink);
scene.fog = new THREE.FogExp2(PALETTE.ink, 0.028);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 1500);
camera.position.set(0, 2.2, 6);

/* --- lights ------------------------------------------------------------- */

const hemi = new THREE.HemisphereLight(0x2d4c66, 0x0a131b, 0.75);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0xbcd7ef, 1.15);
moonLight.position.set(-14, 22, 9);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 90;
moonLight.shadow.camera.left = -26;
moonLight.shadow.camera.right = 26;
moonLight.shadow.camera.top = 26;
moonLight.shadow.camera.bottom = -26;
moonLight.shadow.bias = -0.0006;
scene.add(moonLight);

const fill = new THREE.DirectionalLight(0x6f9fae, 0.25);
fill.position.set(8, 6, -10);
scene.add(fill);

/* one warm light that follows the boat, standing in for every lantern */
const boatLight = new THREE.PointLight(PALETTE.amber, 0, 12, 2);
scene.add(boatLight);

/* --- materials ---------------------------------------------------------- */

const MAT = {
  paper: new THREE.MeshStandardMaterial({
    color: 0xe9e2d0, roughness: 0.96, metalness: 0.0,
    side: THREE.DoubleSide, flatShading: false,
  }),
  paperThin: new THREE.MeshStandardMaterial({
    color: PALETTE.paperShade, roughness: 0.95, metalness: 0.0,
    side: THREE.DoubleSide, transparent: true, opacity: 0.9,
  }),
  stone: new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.95 }),
  brick: new THREE.MeshStandardMaterial({ color: PALETTE.brick, roughness: 0.98 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.9 }),
  cloth: new THREE.MeshStandardMaterial({
    color: 0x2f5a5f, roughness: 0.95, side: THREE.DoubleSide,
  }),
  clothWarm: new THREE.MeshStandardMaterial({
    color: 0x8d4b3a, roughness: 0.95, side: THREE.DoubleSide,
  }),
  metal: new THREE.MeshStandardMaterial({ color: 0x54666f, roughness: 0.5, metalness: 0.7 }),
  glow: new THREE.MeshStandardMaterial({
    color: 0xffd9a0, emissive: PALETTE.ember, emissiveIntensity: 2.2, roughness: 0.6,
  }),
  glowSoft: new THREE.MeshStandardMaterial({
    color: 0xffe7bd, emissive: PALETTE.amber, emissiveIntensity: 0.9, roughness: 0.9,
    transparent: true, opacity: 0.55, depthWrite: false,
  }),
  moon: new THREE.MeshBasicMaterial({ color: PALETTE.moon, fog: false }),
  star: new THREE.PointsMaterial({
    color: 0xdcecff, size: 0.55, sizeAttenuation: true,
    transparent: true, opacity: 0.8, depthWrite: false, fog: false,
  }),
};

/* a helper that also turns on shadows in one place */
function mesh(geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  if (opts.pos) m.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
  if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  if (opts.scale) m.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
  return m;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);

/* --- resize ------------------------------------------------------------- */

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener("resize", onResize);
