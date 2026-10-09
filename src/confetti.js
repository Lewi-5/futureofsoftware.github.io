import * as THREE from 'three';

const PALETTE = ['#ffd23f', '#ff3df2', '#2ef2ff', '#39ff88', '#ffffff'];

export class Confetti {
  constructor(scene, count = 500) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.2, 0.11),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }),
      count,
    );
    this.mesh.frustumCulled = false;
    this.parts = [];
    this.dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.mesh.setColorAt(i, c.set(PALETTE[i % PALETTE.length]));
      this.parts.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), life: 0 });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    scene.add(this.mesh);
    this.next = 0;
  }

  burst(pos, n = 260) {
    for (let i = 0; i < n; i++) {
      const pt = this.parts[this.next];
      this.next = (this.next + 1) % this.parts.length;
      pt.p.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2));
      pt.v.set((Math.random() - 0.5) * 12, 7 + Math.random() * 11, (Math.random() - 0.5) * 12);
      pt.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      pt.life = 3 + Math.random() * 2;
    }
  }

  update(dt) {
    const d = this.dummy;
    this.parts.forEach((pt, i) => {
      if (pt.life <= 0) return;
      pt.life -= dt;
      pt.v.y -= 12 * dt;
      pt.v.multiplyScalar(1 - 1.4 * dt);
      pt.p.addScaledVector(pt.v, dt);
      pt.r.x += dt * 5; pt.r.y += dt * 3;
      d.position.copy(pt.p);
      d.rotation.copy(pt.r);
      d.scale.setScalar(pt.life > 0 ? Math.min(1, pt.life) : 0);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
