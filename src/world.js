import * as THREE from 'three';
import { createNeonSign } from './neonSign.js';
import { COLORS, PLATFORMS } from './levels.js';

let gridTex = null;
function gridTexture() {
  if (gridTex) return gridTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#fff';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 125, 125);
  g.globalAlpha = 0.3;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(64, 0); g.lineTo(64, 128);
  g.moveTo(0, 64); g.lineTo(128, 64);
  g.stroke();
  gridTex = new THREE.CanvasTexture(c);
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.colorSpace = THREE.SRGBColorSpace;
  return gridTex;
}

const sideMat = new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.5, metalness: 0.7 });

function buildPlatform(p) {
  const color = new THREE.Color(p.goal ? COLORS.goal : COLORS[p.branch]);
  const [x, y, z] = p.pos;
  const s = p.size;
  const T = p.thickness;
  const group = new THREE.Group();

  const tex = gridTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(s / 2.5, s / 2.5);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x151a26, roughness: 0.35, metalness: 0.6,
    emissive: color, emissiveMap: tex, emissiveIntensity: 0.45,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(s, T, s), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  box.position.set(x, y - T / 2, z);
  group.add(box);

  // Neon edge strips, bright on top and dim underneath.
  const e = 0.12;
  const topStrip = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const lowStrip = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(0.35), toneMapped: false });
  for (const [mat, sy] of [[topStrip, y - e / 2], [lowStrip, y - T + e / 2]]) {
    for (const sgn of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(s + e, e, e), mat);
      a.position.set(x, sy, z + sgn * s / 2);
      const b = new THREE.Mesh(new THREE.BoxGeometry(e, e, s + e), mat);
      b.position.set(x + sgn * s / 2, sy, z);
      group.add(a, b);
    }
  }

  let trophy = null;
  if (p.goal) {
    trophy = new THREE.Group();
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7),
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa800, emissiveIntensity: 0.7, metalness: 1, roughness: 0.25 }),
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.05, 8, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.goal, toneMapped: false }),
    );
    ring.rotation.x = Math.PI / 2;
    trophy.add(gem, ring);
    trophy.position.set(x, y + 1.9, z);
    group.add(trophy);
  }

  const collider = {
    min: new THREE.Vector3(x - s / 2, y - T, z - s / 2),
    max: new THREE.Vector3(x + s / 2, y, z + s / 2),
    data: p,
  };
  return { group, collider, trophy };
}

function buildStars() {
  const n = 4000;
  const pos = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.randomDirection().multiplyScalar(1200 + Math.random() * 400);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8,
  }));
}

// Faint motes drifting up out of the void, to give the blackness some depth.
function buildMotes() {
  const n = 700;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos.set([(Math.random() - 0.5) * 180, -8 - Math.random() * 70, 40 - Math.random() * 140], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x5a6cff, size: 0.22, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pts.userData.update = (dt) => {
    const a = geo.attributes.position;
    for (let i = 0; i < n; i++) {
      let y = a.getY(i) + dt * 0.8;
      if (y > -6) y = -78;
      a.setY(i, y);
    }
    a.needsUpdate = true;
  };
  return pts;
}

export function buildWorld(scene) {
  const colliders = [];
  const signs = new Map();
  const trophies = [];

  for (const p of PLATFORMS) {
    const built = buildPlatform(p);
    scene.add(built.group);
    colliders.push(built.collider);
    if (built.trophy) trophies.push(built.trophy);

    const isBig = p.id === 'center' || p.goal;
    const sign = createNeonSign(p.label, {
      color: p.goal ? COLORS.goal : COLORS[p.branch],
      height: isBig ? 1.9 : 1.5,
      lightIntensity: isBig ? 40 : 22,
      lightDistance: isBig ? 18 : 14,
    });
    sign.group.position.set(p.pos[0], p.pos[1] + (p.id === 'center' ? 4.6 : 4.2), p.pos[2]);
    scene.add(sign.group);
    signs.set(p.id, sign);
  }
  signs.get('center').setLit(true);

  scene.add(buildStars());
  const motes = buildMotes();
  scene.add(motes);

  return {
    colliders,
    signs,
    update(t, dt, camera) {
      for (const s of signs.values()) s.update(t, dt, camera);
      for (const tr of trophies) {
        tr.rotation.y += dt * 1.2;
        tr.children[0].position.y = Math.sin(t * 2) * 0.2;
      }
      motes.userData.update(dt);
    },
  };
}
