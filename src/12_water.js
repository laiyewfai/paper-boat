/* Water: one shader, two moods (a street gutter and the open sea). */

const waterUniforms = {
  uTime: { value: 0 },
  uAmp: { value: 0.02 },
  uFreq: { value: 3.0 },
  uSpeed: { value: 1.2 },
  uDeep: { value: new THREE.Color(0x081a22) },
  uShallow: { value: new THREE.Color(0x1d4f55) },
  uGlowColor: { value: new THREE.Color(PALETTE.amber) },
  uGlowAmount: { value: 0.0 },
  uFoam: { value: 0.0 },
  uFogColor: { value: new THREE.Color(PALETTE.ink) },
  uFogDensity: { value: 0.03 },
  uMoonX: { value: -26 },
  uLights: { value: [
    new THREE.Vector4(0, 0, 0, 0),
    new THREE.Vector4(0, 0, 0, 0),
    new THREE.Vector4(0, 0, 0, 0),
    new THREE.Vector4(0, 0, 0, 0),
  ] },
};

const waterVert = /* glsl */`
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uSpeed;
varying vec3 vWorld;
varying float vH;

void main() {
  vec3 p = position;
  float t = uTime * uSpeed;
  float f = uFreq;

  float h = sin(p.x * f + t * 1.10) * 0.50
          + sin(p.y * f * 1.70 - t * 0.90) * 0.30
          + sin((p.x + p.y) * f * 2.30 + t * 0.60) * 0.20;
  h *= uAmp;

  p.z += h;

  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vH = h;

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const waterFrag = /* glsl */`
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGlowColor;
uniform float uGlowAmount;
uniform float uFoam;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime;
uniform float uMoonX;
uniform vec4 uLights[4];

varying vec3 vWorld;
varying float vH;

void main() {
  vec3 V = normalize(cameraPosition - vWorld);

  // slope of the surface, enough for a fresnel and a broken reflection
  vec3 n = normalize(vec3(
    sin(vWorld.x * 7.0 + uTime * 1.3) * 0.16 + sin(vWorld.z * 3.1 - uTime) * 0.09,
    1.0,
    sin(vWorld.z * 6.4 + uTime * 1.1) * 0.14 + sin(vWorld.x * 2.6 + uTime * 0.7) * 0.07
  ));

  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
  vec3 col = mix(uDeep, uShallow, clamp(fres * 0.6 + vH * 3.0, 0.0, 1.0));

  float dist = length(cameraPosition - vWorld);

  // lantern light: a tight smear under each one
  for (int i = 0; i < 4; i++) {
    vec4 L = uLights[i];
    if (L.w <= 0.001) continue;
    float across = exp(-pow((vWorld.x - L.x) / (L.z * 0.42), 2.0));
    float along = exp(-abs(vWorld.z - L.y) / (L.z * 2.2));
    col += uGlowColor * across * along * L.w * (0.75 + 0.25 * sin(vWorld.z * 5.0 + uTime * 2.0));
  }

  // the moon path: broken by chop, never a clean wedge
  float lane = exp(-pow((vWorld.x - uMoonX) / 13.0, 2.0));
  float chopA = sin(vWorld.z * 2.1 + uTime * 1.2) * 0.5 + 0.5;
  float chopB = sin(vWorld.z * 0.7 - uTime * 0.8) * 0.5 + 0.5;
  float near = exp(-dist * 0.0016);
  col += vec3(0.58, 0.70, 0.80) * lane * pow(chopA * chopB, 1.6) * uGlowAmount * 1.15 * near;

  // the far water takes the colour of the sky
  col = mix(col, uFogColor * 1.25, smoothstep(60.0, 340.0, dist) * 0.62);

  // foam on the crests
  float foam = smoothstep(0.45, 0.95, vH * 7.0 + 0.35) * uFoam;
  col = mix(col, vec3(0.72, 0.79, 0.78), foam * 0.40);

  float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  col = mix(col, uFogColor, clamp(fog, 0.0, 0.98));

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  vertexShader: waterVert,
  fragmentShader: waterFrag,
});

const waterGeo = new THREE.PlaneGeometry(1, 1, 200, 200);
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
scene.add(water);

function setWater({ w = 8, d = 90, amp = 0.02, freq = 3, speed = 1.2, deep, shallow, glow = 0 } = {}) {
  water.scale.set(w, d, 1);
  waterUniforms.uAmp.value = amp;
  waterUniforms.uFreq.value = freq;
  waterUniforms.uSpeed.value = speed;
  if (deep !== undefined) waterUniforms.uDeep.value.setHex(deep);
  if (shallow !== undefined) waterUniforms.uShallow.value.setHex(shallow);
  waterUniforms.uGlowAmount.value = glow;
}
