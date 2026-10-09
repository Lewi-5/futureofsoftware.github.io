import * as THREE from 'three';

export const NEON_FONT = '"Tilt Neon", "Trebuchet MS", sans-serif';

export async function loadNeonFont() {
  try {
    await Promise.race([
      document.fonts.load(`120px ${NEON_FONT}`),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    // Fall back to the system font.
  }
}

function drawSign(text, color) {
  const lines = text.toUpperCase().split('\n');
  const fontPx = 120;
  const lineH = fontPx * 1.12;
  const pad = 90;
  const font = `${fontPx}px ${NEON_FONT}`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  canvas.width = Math.ceil(textW + pad * 2.4);
  canvas.height = Math.ceil(lineH * lines.length + pad * 2);
  const W = canvas.width;
  const H = canvas.height;

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const core = '#' + new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.65).getHexString();
  const inset = 44;
  const frame = () => {
    ctx.beginPath();
    ctx.roundRect(inset, inset, W - inset * 2, H - inset * 2, 40);
  };
  const lineY = (i) => H / 2 + (i - (lines.length - 1) / 2) * lineH;

  // Wide glow, tight glow, then a pale "tube" core.
  for (const [blur, fill, alpha, width] of [[44, color, 0.9, 8], [20, color, 1, 6], [6, core, 1, 3]]) {
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.strokeStyle = fill;
    ctx.lineWidth = width;
    frame();
    ctx.stroke();
    ctx.fillStyle = fill;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, lineY(i)));
  }
  return canvas;
}

export function createNeonSign(text, {
  color = '#ff3df2',
  height = 1.5,
  light = true,
  lightIntensity = 22,
  lightDistance = 14,
  billboard = true,
} = {}) {
  const canvas = drawSign(text, color);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const width = (height * canvas.width) / canvas.height;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);

  const group = new THREE.Group();
  group.add(mesh);

  let pl = null;
  if (light) {
    pl = new THREE.PointLight(color, lightIntensity, lightDistance, 1.5);
    pl.position.y = -1.8;
    group.add(pl);
  }

  const state = { lit: false, flare: 0, dipT: 0, phase: Math.random() * 10 };

  return {
    group,
    width,
    setLit(v) { state.lit = v; },
    flare() { state.flare = 1; state.lit = true; },
    update(t, dt, camera) {
      if (billboard) {
        group.rotation.y = Math.atan2(camera.position.x - group.position.x, camera.position.z - group.position.z);
      }
      mesh.position.y = Math.sin(t * 1.2 + state.phase) * 0.1;
      state.flare = Math.max(0, state.flare - dt * 0.8);

      // Occasional neon flicker; unlit signs sputter more.
      if (state.dipT > 0) state.dipT -= dt;
      else if (Math.random() < dt * (state.lit ? 0.06 : 0.5)) state.dipT = 0.05 + Math.random() * 0.2;
      const dip = state.dipT > 0 ? 0.35 + Math.random() * 0.3 : 1;

      const base = (state.lit ? 1 : 0.55) * dip;
      mat.opacity = base;
      mat.color.setScalar(1 + state.flare * 1.5);
      if (pl) pl.intensity = lightIntensity * base * (1 + state.flare * 2);
    },
  };
}
