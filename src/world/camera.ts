import { WORLD_WIDTH, WORLD_HEIGHT, type Vec } from './map';
export class Camera {
  x = 0;
  y = 0;
  width = 1000;
  height = 600;
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.clamp();
  }
  follow(target: Vec, dt: number, snap = false): void {
    const blend = snap ? 1 : 1 - Math.exp(-9 * dt);
    this.x += (target.x - this.width / 2 - this.x) * blend;
    this.y += (target.y - this.height / 2 - this.y) * blend;
    this.clamp();
  }
  private clamp(): void {
    this.x = Math.max(0, Math.min(Math.max(0, WORLD_WIDTH - this.width), this.x));
    this.y = Math.max(0, Math.min(Math.max(0, WORLD_HEIGHT - this.height), this.y));
  }
  worldToScreen(p: Vec): Vec {
    return { x: p.x - this.x, y: p.y - this.y };
  }
}
