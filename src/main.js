import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { CENTER, COLORS, MASTER, PATHS, VIDEO_ID, checkReach } from './levels.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { CameraRig } from './cameraRig.js';
import { createJumbotron } from './jumbotron.js';
import { Hud } from './hud.js';
import { Confetti } from './confetti.js';
import { createNeonSign, loadNeonFont } from './neonSign.js';

const FALL_LIMIT = -35;

checkReach();
await loadNeonFont();

// --- Renderers: CSS3D (video) underneath, WebGL on top with a hole cut for the screen ---
const cssRenderer = new CSS3DRenderer();
document.getElementById('css3d').appendChild(cssRenderer.domElement);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.domElement.id = 'gl';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const cssScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3500);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  cssRenderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// --- Lighting ---
scene.add(new THREE.AmbientLight(0x404a70, 0.8));
scene.add(new THREE.HemisphereLight(0x6070ff, 0x080810, 0.7));
const screenLight = new THREE.DirectionalLight(0xb9b0ff, 0.9);
screenLight.position.set(0, 60, -100);
scene.add(screenLight);
const backLight = new THREE.DirectionalLight(0x8899ff, 0.6);
backLight.position.set(20, 30, 40);
scene.add(backLight);

// --- World ---
const world = buildWorld(scene);
const jumbo = createJumbotron(scene, cssScene, { videoId: VIDEO_ID });
const player = new Player(scene);
const rig = new CameraRig(camera, renderer.domElement);
const hud = new Hud();
const confetti = new Confetti(scene);

// Beam of light over the center platform while floating back down.
const beamMat = new THREE.MeshBasicMaterial({
  color: COLORS.center, transparent: true, opacity: 0, depthWrite: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
});
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 34, 24, 1, true), beamMat);
beam.position.set(0, 17, 0);
scene.add(beam);

// --- Game state ---
let state = 'intro'; // 'intro' | 'playing'
let lastTopic = null;
let respawning = false;
const done = { design: false, systems: false };
let masterSign = null;

const colorFor = (p) => (p.goal ? COLORS.goal : COLORS[p.branch]);

function handleLand(p) {
  if (p.id !== lastTopic) {
    lastTopic = p.id;
    hud.showTopic(p, colorFor(p));
    world.signs.get(p.id).flare();
  }
  if (p.goal && !done[p.branch]) {
    done[p.branch] = true;
    hud.setPathDone(p.branch);
    confetti.burst(new THREE.Vector3(...p.pos).setY(p.pos[1] + 1.5));
    const name = p.branch === 'design' ? 'Design' : 'Systems';
    if (done.design && done.systems) {
      unlockMaster();
    } else {
      hud.showBanner(`${name} path complete ✓<small>Fall off to float back to the center, then take the other path.</small>`, 6000);
    }
  }
}

function unlockMaster() {
  masterSign = createNeonSign(MASTER.label, { color: COLORS.goal, height: 2.4, lightIntensity: 60, lightDistance: 20 });
  masterSign.group.position.set(0, CENTER.pos[1] + 9.5, 0);
  scene.add(masterSign.group);
  masterSign.flare();
  confetti.burst(new THREE.Vector3(0, 3, 0), 400);
  hud.showBanner(`Both domains crossed: you're a Master ✓<small>${MASTER.blurb}</small>`, 9000);
}

player.onLand = handleLand;

function respawn() {
  if (respawning) return;
  respawning = true;
  const fade = document.getElementById('fade');
  fade.classList.add('on');
  setTimeout(() => {
    player.startFloat(CENTER.pos[1]);
    fade.classList.remove('on');
    respawning = false;
  }, 350);
}

// --- Input ---
const keys = new Set();
let jumpPressed = false;
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (state !== 'playing') return;
  if (e.code === 'Space') jumpPressed = true;
  if (e.code === 'KeyM') hud.setMuted(jumbo.toggleMute());
  if (e.code === 'KeyR' && player.mode === 'normal') respawn();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const input = { dir: new THREE.Vector3(), jumpPressed: false, jumpHeld: false };
function readInput() {
  const k = (...codes) => (codes.some((c) => keys.has(c)) ? 1 : 0);
  const fwd = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
  const side = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
  rig.forward(_f);
  rig.right(_r);
  input.dir.copy(_f).multiplyScalar(fwd).addScaledVector(_r, side);
  if (input.dir.lengthSq() > 1) input.dir.normalize();
  input.jumpPressed = jumpPressed;
  input.jumpHeld = keys.has('Space');
  jumpPressed = false;
  return input;
}

hud.muteBtn.addEventListener('click', () => hud.setMuted(jumbo.toggleMute()));

document.getElementById('start-btn').addEventListener('click', () => {
  jumbo.start();
  document.getElementById('start').classList.add('hidden');
  document.getElementById('hud').classList.remove('idle');
  state = 'playing';
  rig.yaw = 0;
  handleLand(CENTER);
});

// --- Loop ---
const clock = new THREE.Clock();
let t = 0;
rig.update(1, player.pos);

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  if (state === 'playing') {
    const inp = readInput();
    rig.yaw += dt * 2 * ((keys.has('KeyQ') ? 1 : 0) - (keys.has('KeyE') ? 1 : 0));
    if (player.mode === 'normal') {
      player.update(dt, inp, world.colliders);
      if (player.pos.y < FALL_LIMIT) respawn();
    }
  } else {
    rig.yaw = Math.sin(t * 0.15) * 0.35; // gentle sway behind the start screen
  }

  if (player.mode === 'float' && player.updateFloat(dt, t)) handleLand(CENTER);
  beamMat.opacity += ((player.mode === 'float' ? 0.12 : 0) - beamMat.opacity) * Math.min(1, dt * 3);
  beam.visible = beamMat.opacity > 0.003;

  player.animate(dt, t);
  player.updateShadow(world.colliders);
  rig.update(dt, player.pos);
  world.update(t, dt, camera);
  masterSign?.update(t, dt, camera);
  jumbo.update(t, dt, camera);
  confetti.update(dt);

  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}
frame();

// Exposed for debugging in the console.
window.__game = { player, rig, world, PATHS, respawn };
