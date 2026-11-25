/* The drain: a dark tube with ring lights, and a bright mouth at the end. */

const tunnelGroup = new THREE.Group();
tunnelGroup.visible = false;
scene.add(tunnelGroup);

const TUNNEL_FROM = -96;
const TUNNEL_TO = -152;
const TUNNEL_LEN = TUNNEL_FROM - TUNNEL_TO;

const tunnelShell = mesh(
  new THREE.CylinderGeometry(3.0, 3.0, TUNNEL_LEN, 40, 1, true),
  new THREE.MeshStandardMaterial({
    color: 0x141c22, roughness: 1.0, side: THREE.BackSide, metalness: 0.05,
  }),
  {
    pos: [0, 2.2, (TUNNEL_FROM + TUNNEL_TO) / 2],
    rot: [Math.PI / 2, 0, 0],
    cast: false,
  }
);
tunnelGroup.add(tunnelShell);

/* ring lights, warm at the entrance, cooler as it goes */
const tunnelRings = [];
for (let z = TUNNEL_FROM - 4; z > TUNNEL_TO + 2; z -= 7) {
  const warm = clamp((z - TUNNEL_TO) / TUNNEL_LEN, 0, 1);
  const ring = mesh(
    new THREE.TorusGeometry(2.55, 0.05, 6, 40),
    new THREE.MeshStandardMaterial({
      color: 0xffe3b0,
      emissive: new THREE.Color().setHSL(0.09, 0.7, 0.5 + warm * 0.2),
      emissiveIntensity: 1.6 + warm * 1.4,
      roughness: 0.7,
    }),
    { pos: [0, 2.2, z], cast: false, receive: false }
  );
  tunnelGroup.add(ring);
  tunnelRings.push(ring);

  const lamp = new THREE.PointLight(0xffc78a, 6 * (0.4 + warm), 11, 2);
  lamp.position.set(0, 2.2, z);
  tunnelGroup.add(lamp);
}

/* the way out */
const mouth = mesh(
  new THREE.CircleGeometry(2.6, 32),
  new THREE.MeshBasicMaterial({ color: 0x2c4c5c, transparent: true, opacity: 0.9, fog: false }),
  { pos: [0, 2.2, TUNNEL_TO + 0.5], cast: false, receive: false }
);
tunnelGroup.add(mouth);

const mouthGlow = mesh(
  new THREE.CircleGeometry(3.6, 32),
  new THREE.MeshBasicMaterial({
    color: 0xbfe8e0, transparent: true, opacity: 0.34,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }),
  { pos: [0, 2.2, TUNNEL_TO + 0.4], cast: false, receive: false }
);
tunnelGroup.add(mouthGlow);
