/* Generated glow textures: no image files, just a canvas and a gradient. */

function radialTexture(stops, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [stop, color] of stops) grad.addColorStop(stop, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const GLOW_TEX = radialTexture([
  [0.0, "rgba(255,255,255,1)"],
  [0.18, "rgba(255,255,255,0.72)"],
  [0.45, "rgba(255,255,255,0.22)"],
  [1.0, "rgba(255,255,255,0)"],
]);

const HALO_TEX = radialTexture([
  [0.0, "rgba(255,255,255,0.85)"],
  [0.35, "rgba(255,255,255,0.28)"],
  [1.0, "rgba(255,255,255,0)"],
]);

const BLOB_TEX = radialTexture([
  [0.0, "rgba(0,0,0,0.55)"],
  [0.55, "rgba(0,0,0,0.28)"],
  [1.0, "rgba(0,0,0,0)"],
]);

function addGlow(parent, { size = 1, color = 0xffc98a, opacity = 0.8, pos = [0, 0, 0], tex = GLOW_TEX } = {}) {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  s.position.set(pos[0], pos[1], pos[2]);
  parent.add(s);
  return s;
}

/* a soft dark patch to sit under the boat so it does not look pasted on */
const shadowBlob = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    map: BLOB_TEX, transparent: true, opacity: 0.55,
    depthWrite: false, color: 0x000000,
  })
);
shadowBlob.rotation.x = -Math.PI / 2;
shadowBlob.position.y = 0.008;
scene.add(shadowBlob);

/* a key light that rides with the camera: the subject is always readable */
const keyLight = new THREE.PointLight(0xffe2c0, 0, 9, 2);
scene.add(keyLight);
