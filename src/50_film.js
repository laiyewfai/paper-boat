/* The director: one time value drives the whole film. */

const state = {
  fade: 1,          // 1 = ink, 0 = picture
  exposure: 1.06,
  fog: 0.028,
  bg: new THREE.Color(PALETTE.ink),
};

function setSectionVisibility(t) {
  tableGroup.visible = !HIDE.has("table") && t < at(CUE.street) + 0.4;
  streetGroup.visible = !HIDE.has("street") && t > at(CUE.launch) - 1.0 && t < at(CUE.tunnel) + 1.5;
  tunnelGroup.visible = !HIDE.has("tunnel") && t > at(CUE.tunnel) - 2.6 && t < at(CUE.sea) + 1.6;
  seaGroup.visible = !HIDE.has("sea") && t > at(CUE.sea) - 1.6;
  rain.visible = !HIDE.has("rain") && t > at(CUE.storm) - 1.2 && t < at(CUE.tunnel) + 1.5;
  rings.visible = t > at(CUE.street) && t < at(CUE.tunnel) + 1.5;
}

function foldAmounts(t) {
  // four clacks: the keel, the bow, the stern, the sail
  const keel = easeOut(span(t, 0.02, 0.42));
  const taper = easeOut(span(t, 0.64, 1.06));
  const lift = easeOut(span(t, 1.26, 1.62));
  const sail = easeOut(span(t, 1.88, 2.22));

  // and back again at the end
  const back = easeInOut(span(t, at(CUE.unfold), at(CUE.unfold) + 1.9));
  return {
    keel: keel * (1 - back),
    taper: taper * (1 - back),
    lift: lift * (1 - back),
    sail: sail * (1 - back),
  };
}

function updateFilm(t, dt) {
  const b = boatPose(t);
  setSectionVisibility(t);

  /* boat */
  const f = foldAmounts(t);
  boatState.keel = f.keel;
  boatState.taper = f.taper;
  boatState.lift = f.lift;
  boatState.sail = f.sail;
  boatState.x = b.x;
  // on the table the hull rests on its keel; on the water it floats
  boatState.y = t < at(CUE.launch) ? 0.17 * f.keel + 0.006 : 0.135 + (b.y - 0.055);
  boatState.z = b.z;
  boatState.roll = b.roll;
  boatState.pitch = b.pitch;
  boatState.yaw = b.yaw;
  boatState.scale = t < at(CUE.launch) ? 1.0 : (b.sea > 0.5 ? 0.72 : 0.62);
  applyBoat();

  /* the soft patch under the boat */
  shadowBlob.position.set(b.x, 0.008, b.z);
  shadowBlob.scale.setScalar(boatState.scale * 1.9);
  shadowBlob.visible = t > at(CUE.launch) + 0.1;

  /* water */
  const inSea = t > at(CUE.sea) - 0.6;
  const inTunnel = t > at(CUE.tunnel) - 0.6 && t < at(CUE.sea) - 0.4;
  const inStreet = t > at(CUE.launch) + 0.1;

  water.visible = !HIDE.has("water") && (inStreet || inSea);
  if (inSea) {
    water.position.set(0, 0, b.z - 40);
    setWater({
      w: 1600, d: 1600, amp: 0.07, freq: 1.5, speed: 0.9,
      deep: 0x05161e, shallow: 0x1d4c52, glow: 0.95,
    });
  } else if (inTunnel) {
    water.position.set(0, 0, b.z - 6);
    setWater({
      w: 7, d: 70, amp: 0.02, freq: 4.5, speed: 1.4,
      deep: 0x061219, shallow: 0x143a41, glow: 0,
    });
  } else {
    water.position.set(0, 0, b.z - 8);
    setWater({
      w: 9, d: 120, amp: 0.022, freq: 3.4, speed: 1.25,
      deep: 0x071b23, shallow: 0x1c4a4f, glow: 0,
    });
  }
  waterUniforms.uTime.value = t;
  waterUniforms.uFogColor.value.copy(state.bg);
  waterUniforms.uFogDensity.value = state.fog;
  waterUniforms.uFoam.value = clamp(b.storm * 0.9 + b.sea * 0.3, 0, 1);

  /* the four warm reflections the water samples */
  if (inSea) {
    for (let i = 0; i < 4; i++) {
      waterUniforms.uLights.value[i].set(
        Math.sin(t * 0.3 + i * 2.1) * 26, b.z - 12 - i * 22, 5.5, 0.35
      );
    }
  } else {
    let n = 0;
    for (let i = 0; i < LANTERN_POSITIONS.length && n < 4; i += 3) {
      const p = LANTERN_POSITIONS[i];
      if (Math.abs(p.z - b.z) < 26) {
        waterUniforms.uLights.value[n++].set(p.x, p.z, 1.5, 0.8);
      }
    }
    for (; n < 4; n++) waterUniforms.uLights.value[n].set(0, 0, 0, 0);
  }

  /* street dressing */
  if (streetGroup.visible) updateLanterns(t, b.z);

  /* rain */
  if (rain.visible) {
    const amt = span(t, at(CUE.storm) - 1.2, at(CUE.storm) + 1.4)
      * (1 - span(t, at(CUE.tunnel) - 0.6, at(CUE.tunnel) + 0.8));
    updateRain(t, amt, camera.position, dt);
    updateRings(t, amt, camera.position, dt);
  }
  if (seaGroup.visible) updateSea(t, camera.position);

  /* the light the boat carries */
  const lit = span(t, 2.2, 3.4);
  boatLight.position.set(b.x, b.y + 0.07, b.z);
  boatLight.intensity = lit * (7.0 + Math.sin(t * 9.1) * 0.3 + b.storm * 1.5);
  boatLight.distance = 10 + b.sea * 6;

  /* a soft key that rides with the camera so the paper always reads */
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  keyLight.position.copy(camera.position).addScaledVector(fwd, 1.6);
  keyLight.position.y += 0.4;
  keyLight.intensity = 0.45 + lit * 0.55;
  keyLight.distance = 9;

  /* mood: fog, background, exposure */
  const storm = span(t, at(CUE.storm) - 0.5, at(CUE.storm) + 1.0)
    * (1 - span(t, at(CUE.tunnel) - 1.0, at(CUE.tunnel) + 0.6));
  const tunnel = span(t, at(CUE.tunnel) - 0.8, at(CUE.tunnel) + 0.8)
    * (1 - span(t, at(CUE.sea) - 1.4, at(CUE.sea) + 0.4));
  const sea = span(t, at(CUE.sea) - 0.6, at(CUE.sea) + 2.2);

  keyLight.intensity -= tunnel * 0.4;

  state.fog = 0.030 + storm * 0.030 + tunnel * 0.075 - sea * 0.018;
  state.exposure = 1.06 - storm * 0.10 + tunnel * 0.10 + sea * 0.02;

  state.bg.copy(new THREE.Color(PALETTE.ink));
  state.bg.lerp(new THREE.Color(0x04080c), tunnel);
  state.bg.lerp(new THREE.Color(0x071420), sea * 0.9);
  scene.background.copy(state.bg);
  scene.fog.color.copy(state.bg);
  scene.fog.density = state.fog;
  renderer.toneMappingExposure = damp(renderer.toneMappingExposure, state.exposure, 2.5, dt);

  /* the paper needs to read as paper: a little extra light on the table */
  hemi.intensity = 0.55 + lit * 0.25 - tunnel * 0.25 + sea * 0.1;
  moonLight.intensity = 1.15 - storm * 0.35 + sea * 0.25;

  /* ink in and out */
  const fadeIn = 1 - span(t, 0.0, 1.1);
  const fadeOut = span(t, DURATION - 1.4, DURATION - 0.15);
  state.fade = clamp(fadeIn + fadeOut, 0, 1);
}
