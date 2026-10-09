import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { createNeonSign } from './neonSign.js';

const PX_W = 1920;
const PX_H = 1080;

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The YouTube player lives in a CSS3D layer *behind* the WebGL canvas. A plane with
// alpha 0 punches a hole in the canvas where the screen is, so the video shows
// through, while still writing depth so platforms and the player can cover it.
export function createJumbotron(scene, cssScene, {
  videoId,
  width = 300,
  center = new THREE.Vector3(0, 105, -480),
} = {}) {
  const height = (width * PX_H) / PX_W;

  // --- DOM side ---
  const el = document.createElement('div');
  el.className = 'jumbo';
  el.style.width = `${PX_W}px`;
  el.style.height = `${PX_H}px`;
  const mount = document.createElement('div');
  const fallback = document.createElement('div');
  fallback.className = 'jumbo-fallback';
  fallback.innerHTML = 'Video unavailable here.<br>Watch it on YouTube.';
  el.append(mount, fallback);
  const cssObj = new CSS3DObject(el);
  cssObj.position.copy(center);
  cssObj.scale.setScalar(width / PX_W);
  cssScene.add(cssObj);

  // --- WebGL side ---
  const hole = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, blending: THREE.NoBlending }),
  );
  hole.position.copy(center);
  scene.add(hole);

  const metal = new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.55, metalness: 0.8 });
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(width + 10, height + 10, 4), metal);
  bezel.position.set(center.x, center.y, center.z - 2.1);
  scene.add(bezel);

  // Light strips around the screen, slowly cycling hue.
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xff3df2, toneMapped: false });
  const e = 1.2;
  for (const sgn of [-1, 1]) {
    const hz = new THREE.Mesh(new THREE.BoxGeometry(width + 6, e, e), stripMat);
    hz.position.set(center.x, center.y + sgn * (height / 2 + 2.5), center.z + 0.2);
    const vt = new THREE.Mesh(new THREE.BoxGeometry(e, height + 6, e), stripMat);
    vt.position.set(center.x + sgn * (width / 2 + 2.5), center.y, center.z + 0.2);
    scene.add(hz, vt);
  }

  // Pillars dropping into the void.
  const pillarH = 320;
  for (const sgn of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(10, pillarH, 10), metal);
    pillar.position.set(center.x + sgn * width * 0.32, center.y - height / 2 - 5 - pillarH / 2, center.z - 3);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.8, pillarH, 0.8), stripMat);
    seam.position.set(pillar.position.x, pillar.position.y, pillar.position.z + 5.1);
    scene.add(pillar, seam);
  }

  // Soft halo behind the screen.
  const haloMat = new THREE.MeshBasicMaterial({
    map: glowTexture(), color: 0x7a4dff, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.9, height * 2.4), haloMat);
  halo.position.set(center.x, center.y, center.z - 6);
  scene.add(halo);

  const marquee = createNeonSign('The Future of Software', {
    color: '#39ff88', height: 26, light: false, billboard: false,
  });
  marquee.group.position.set(center.x, center.y + height / 2 + 22, center.z);
  marquee.setLit(true);
  scene.add(marquee.group);

  // --- YouTube player ---
  let player = null;
  let ready = false;
  let wantStart = false;
  let muted = false;

  const applyStart = () => {
    if (!muted) { player.unMute(); player.setVolume(100); }
    player.playVideo();
  };
  const showFallback = () => { fallback.style.display = 'flex'; };

  loadYouTubeAPI().then((YT) => {
    player = new YT.Player(mount, {
      width: PX_W,
      height: PX_H,
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: videoId,
        playsinline: 1, rel: 0, iv_load_policy: 3, disablekb: 1, modestbranding: 1,
      },
      events: {
        onReady: (e) => {
          ready = true;
          e.target.mute();
          e.target.playVideo();
          if (wantStart) applyStart();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) e.target.playVideo();
        },
        onError: showFallback,
      },
    });
  }).catch(showFallback);

  return {
    // Must be called from a user gesture so the browser allows sound.
    start() {
      wantStart = true;
      if (ready) applyStart();
    },
    toggleMute() {
      muted = !muted;
      if (ready) {
        if (muted) player.mute();
        else { player.unMute(); player.setVolume(100); }
      }
      return muted;
    },
    update(t, dt, camera) {
      stripMat.color.setHSL((t * 0.03) % 1, 1, 0.6);
      haloMat.color.setHSL((t * 0.03 + 0.5) % 1, 0.9, 0.55);
      marquee.update(t, dt, camera);
    },
  };
}
