import * as THREE from 'three';

const SPEED = 7.5;
const JUMP = 11.5;
const GRAVITY = 32;
const R = 0.28; // half-width of the collision box
const H = 1.6; // collision height
const STEP = 1 / 120;

function buildFigure() {
  const M = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
  const hoodie = M(0x2fbf4a);
  const hoodieDark = M(0x1f8a35);
  const hat = M(0x27a844, 0.7);
  const skin = M(0xf1c7a3, 0.6);
  const pants = M(0x2b3442);
  const shoe = M(0xeeeeee, 0.5);
  const black = M(0x111111, 0.3);
  const white = M(0xffffff, 0.6);

  const root = new THREE.Group(); // feet at origin, facing +z
  const body = new THREE.Group(); // squash/stretch and bob
  root.add(body);
  const parts = {};

  // Legs pivot at the hips.
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0.62, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.38, 4, 8), pants);
    leg.position.y = -0.27;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.27), shoe);
    foot.position.set(0, -0.56, 0.04);
    hip.add(leg, foot);
    body.add(hip);
    parts[side < 0 ? 'legL' : 'legR'] = hip;
  }

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.3, 6, 12), hoodie);
  torso.scale.set(1.05, 1, 0.75);
  torso.position.y = 0.94;
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 16), hoodieDark);
  hem.scale.z = 0.76;
  hem.position.y = 0.7;
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), hoodieDark);
  pocket.position.set(0, 0.83, 0.175);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), hoodieDark);
  hood.scale.set(1.15, 0.8, 0.8);
  hood.position.set(0, 1.26, -0.13);
  body.add(torso, hem, pocket, hood);
  for (const side of [-1, 1]) {
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 6), white);
    string.position.set(side * 0.05, 1.11, 0.18);
    body.add(string);
  }

  const head = new THREE.Group();
  head.position.y = 1.42;
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), skin));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), black);
    eye.position.set(side * 0.07, 0.02, 0.18);
    head.add(eye);
  }
  // Green cap: dome, forward brim, button.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.215, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hat);
  dome.position.y = 0.04;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 20), hat);
  brim.position.set(0, 0.06, 0.18);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), hoodieDark);
  button.position.y = 0.255;
  head.add(dome, brim, button);
  body.add(head);
  parts.head = head;

  // Arms pivot at the shoulders.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.31, 1.13, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), hoodie);
    sleeve.position.y = -0.2;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), hoodieDark);
    cuff.position.y = -0.39;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skin);
    hand.position.y = -0.45;
    shoulder.add(sleeve, cuff, hand);
    body.add(shoulder);
    parts[side < 0 ? 'armL' : 'armR'] = shoulder;
  }

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, body, parts };
}

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const lerp = (a, b, k) => a + (b - a) * k;

export class Player {
  constructor(scene) {
    const fig = buildFigure();
    this.mesh = fig.root;
    this.body = fig.body;
    this.parts = fig.parts;
    scene.add(this.mesh);

    // A little fill light so the figure reads against the dark.
    const fill = new THREE.PointLight(0xffffff, 3, 6, 1.5);
    fill.position.set(0, 2.4, 1.6);
    this.mesh.add(fill);

    // Bubble shown while floating back down.
    this.bubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0x39ff88, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.bubble.position.y = 0.85;
    this.mesh.add(this.bubble);

    // Blob shadow, for judging landings.
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mode = 'normal'; // 'normal' | 'float'
    this.onGround = true;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.facing = Math.PI; // face -z, toward the jumbotron
    this.walkPhase = 0;
    this.squash = 0;
    this.onLand = null;
  }

  update(dt, input, colliders) {
    const wish = input.dir;
    const accel = this.onGround ? 55 : 20;
    const tx = wish.x * SPEED;
    const tz = wish.z * SPEED;
    const dx = tx - this.vel.x;
    const dz = tz - this.vel.z;
    const len = Math.hypot(dx, dz);
    const step = accel * dt;
    if (len <= step) { this.vel.x = tx; this.vel.z = tz; } else { this.vel.x += (dx / len) * step; this.vel.z += (dz / len) * step; }

    this.coyote = this.onGround ? 0.1 : this.coyote - dt;
    this.jumpBuffer = input.jumpPressed ? 0.12 : this.jumpBuffer - dt;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vel.y = JUMP;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.onGround = false;
    }

    // Shorter hop when jump is released early.
    const g = this.vel.y > 0 && !input.jumpHeld ? GRAVITY * 2 : GRAVITY;

    const wasGround = this.onGround;
    let landedOn = null;
    for (let left = dt; left > 1e-6; left -= STEP) {
      const h = Math.min(STEP, left);
      this.vel.y = Math.max(this.vel.y - g * h, -40);
      this.moveAxis('x', this.vel.x * h, colliders);
      this.moveAxis('z', this.vel.z * h, colliders);
      const hit = this.moveY(this.vel.y * h, colliders);
      if (hit) landedOn = hit;
    }
    if (this.onGround && !wasGround) {
      this.squash = 1;
      if (landedOn && this.onLand) this.onLand(landedOn.data);
    }
  }

  overlaps(c) {
    const p = this.pos;
    return p.x + R > c.min.x && p.x - R < c.max.x && p.z + R > c.min.z && p.z - R < c.max.z
      && p.y + H > c.min.y && p.y < c.max.y;
  }

  moveAxis(axis, d, colliders) {
    if (d === 0) return;
    this.pos[axis] += d;
    for (const c of colliders) {
      if (!this.overlaps(c)) continue;
      if (this.pos.y > c.max.y - 0.25) {
        this.pos.y = c.max.y; // small step up onto the ledge
      } else {
        this.pos[axis] = d > 0 ? c.min[axis] - R : c.max[axis] + R;
        this.vel[axis] = 0;
      }
    }
  }

  moveY(d, colliders) {
    const prevY = this.pos.y;
    this.pos.y += d;
    this.onGround = false;
    let ground = null;
    for (const c of colliders) {
      if (!this.overlaps(c)) continue;
      if (d <= 0 && prevY >= c.max.y - 0.05) {
        this.pos.y = c.max.y;
        this.vel.y = 0;
        this.onGround = true;
        ground = c;
      } else if (d > 0 && prevY + H <= c.min.y + 0.05) {
        this.pos.y = c.min.y - H;
        this.vel.y = 0;
      }
    }
    return ground;
  }

  startFloat(groundY) {
    this.mode = 'float';
    this.floatGround = groundY;
    this.pos.set(0, groundY + 20, 0);
    this.vel.set(0, 0, 0);
    this.onGround = false;
  }

  // Drift gently down onto the center platform. Returns true on touchdown.
  updateFloat(dt, t) {
    this.pos.y -= 3.2 * dt;
    const k = Math.min(1, (this.pos.y - this.floatGround) / 8);
    this.pos.x = Math.sin(t * 1.1) * 0.7 * k;
    this.pos.z = Math.cos(t * 0.9) * 0.5 * k;
    this.facing += dt * 0.6;
    if (this.pos.y <= this.floatGround) {
      this.pos.set(0, this.floatGround, 0);
      this.mode = 'normal';
      this.onGround = true;
      this.squash = 0.6;
      return true;
    }
    return false;
  }

  animate(dt, t) {
    const k = Math.min(1, dt * 14);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.mode === 'normal' && hs > 0.4) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, dt * 12);
    }

    const P = this.parts;
    const pose = { legL: 0, legR: 0, armL: 0, armR: 0, armLz: 0, armRz: 0, bob: 0, head: 0 };
    if (this.mode === 'float') {
      pose.armLz = -1.25 + Math.sin(t * 2) * 0.15;
      pose.armRz = 1.25 - Math.sin(t * 2) * 0.15;
      pose.legL = 0.25; pose.legR = -0.15;
      pose.bob = Math.sin(t * 2.4) * 0.05;
    } else if (!this.onGround) {
      pose.armL = -2.5; pose.armR = -2.5;
      pose.armLz = -0.3; pose.armRz = 0.3;
      pose.legL = -0.6; pose.legR = 0.35;
    } else if (hs > 0.4) {
      this.walkPhase += hs * dt * 1.9;
      const amp = Math.min(hs / SPEED, 1);
      const s = Math.sin(this.walkPhase);
      pose.legL = s * 0.85 * amp; pose.legR = -s * 0.85 * amp;
      pose.armL = -s * 0.9 * amp; pose.armR = s * 0.9 * amp;
      pose.armLz = -0.08; pose.armRz = 0.08;
      pose.bob = Math.abs(Math.cos(this.walkPhase)) * 0.06 * amp;
    } else {
      pose.bob = Math.sin(t * 2) * 0.012;
      pose.armLz = -0.06; pose.armRz = 0.06;
      pose.head = Math.sin(t * 0.7) * 0.15;
    }

    P.legL.rotation.x = lerp(P.legL.rotation.x, pose.legL, k);
    P.legR.rotation.x = lerp(P.legR.rotation.x, pose.legR, k);
    P.armL.rotation.x = lerp(P.armL.rotation.x, pose.armL, k);
    P.armR.rotation.x = lerp(P.armR.rotation.x, pose.armR, k);
    P.armL.rotation.z = lerp(P.armL.rotation.z, pose.armLz, k);
    P.armR.rotation.z = lerp(P.armR.rotation.z, pose.armRz, k);
    P.head.rotation.y = lerp(P.head.rotation.y, pose.head, k * 0.3);

    this.squash = Math.max(0, this.squash - dt * 5);
    const sq = Math.sin(this.squash * Math.PI) * 0.18;
    this.body.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    this.body.position.y = pose.bob;

    const bub = this.bubble.material;
    bub.opacity = lerp(bub.opacity, this.mode === 'float' ? 0.16 + Math.sin(t * 3) * 0.04 : 0, Math.min(1, dt * 4));
    this.bubble.visible = bub.opacity > 0.005;

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.facing;
  }

  updateShadow(colliders) {
    let top = -Infinity;
    for (const c of colliders) {
      if (this.pos.x > c.min.x && this.pos.x < c.max.x && this.pos.z > c.min.z && this.pos.z < c.max.z
        && c.max.y <= this.pos.y + 0.01 && c.max.y > top) top = c.max.y;
    }
    if (top === -Infinity) { this.shadow.visible = false; return; }
    const h = this.pos.y - top;
    this.shadow.visible = true;
    this.shadow.position.set(this.pos.x, top + 0.02, this.pos.z);
    const s = Math.max(0.5, 1.1 - h * 0.05);
    this.shadow.scale.set(s, s, 1);
    this.shadow.material.opacity = Math.max(0.2, 1 - h * 0.06);
  }
}
