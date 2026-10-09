import * as THREE from 'three';

// Third-person orbit camera that follows the player. Drag to orbit, scroll to zoom.
export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.yaw = 0; // 0 = camera behind the player, looking toward -z
    this.pitch = 0.2;
    this.dist = 10;
    this.target = new THREE.Vector3(0, 1.2, 0);
    this._focus = new THREE.Vector3();
    this._look = new THREE.Vector3();

    let dragging = false;
    dom.addEventListener('pointerdown', (e) => {
      dragging = true;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointerup', (e) => {
      dragging = false;
      dom.releasePointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.yaw -= e.movementX * 0.005;
      this.pitch = THREE.MathUtils.clamp(this.pitch + e.movementY * 0.004, -0.25, 1.3);
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = THREE.MathUtils.clamp(this.dist * (1 + Math.sign(e.deltaY) * 0.1), 4, 24);
    }, { passive: false });
  }

  forward(out) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  right(out) { return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }

  update(dt, playerPos) {
    this._focus.copy(playerPos).y += 1.2;
    this.target.lerp(this._focus, 1 - Math.exp(-dt * 7));
    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + Math.sin(this.pitch) * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist,
    );
    this.camera.lookAt(this._look.copy(this.target).setY(this.target.y + 1.6));
  }
}
