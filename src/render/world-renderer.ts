import { Camera } from '../world/camera';
import { WORLD_WIDTH, WORLD_HEIGHT, ZONES, PONDS, TILE, zoneAt, type Vec } from '../world/map';
import { available, objectives } from '../world/interactions';
import type { WorldSimulation, WorldEvent } from '../world/simulation';
import { ATTACKS, ENEMIES } from '../core/config';
import { drawRooster, HERO } from './rooster';
import { drawObject } from './environment';
interface Particle extends Vec {
  life: number;
  max: number;
  vx: number;
  vy: number;
  text?: string;
  color: string;
  egg?: boolean;
}
export class WorldRenderer {
  camera = new Camera();
  private c: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement;
  private scale = 1;
  private shake = 0;
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  constructor(private canvas: HTMLCanvasElement) {
    this.c = canvas.getContext('2d')!;
    this.terrain = this.createTerrain();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  private resize(): void {
    const b = this.canvas.getBoundingClientRect(),
      dpr = Math.min(2, devicePixelRatio || 1);
    this.width = b.width;
    this.height = b.height;
    this.canvas.width = b.width * dpr;
    this.canvas.height = b.height * dpr;
    this.scale = Math.max(0.85, Math.min(1.3, b.height / 620));
    this.camera.resize(b.width / this.scale, b.height / this.scale);
  }
  private createTerrain(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_WIDTH;
    canvas.height = WORLD_HEIGHT;
    const c = canvas.getContext('2d')!;
    for (const z of ZONES) {
      c.fillStyle = z.color;
      c.fillRect(z.x, z.y, z.w, z.h);
    }
    // Seeded-looking ground grain is cached once, never regenerated per frame.
    for (let y = 0; y < WORLD_HEIGHT; y += TILE)
      for (let x = 0; x < WORLD_WIDTH; x += TILE) {
        const hash = ((x * 71 + y * 139) >>> 2) % 13;
        c.fillStyle = hash < 6 ? '#fff2b709' : '#315b3607';
        c.fillRect(x, y, 64, 64);
        for (let i = 0; i < 4; i++) {
          const px = x + ((hash * 11 + i * 19) % 64),
            py = y + ((hash * 17 + i * 13) % 64);
          c.strokeStyle = zoneAt({ x, y }) === 'forest' ? '#a6c69a20' : '#436c3826';
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(px - 2, py);
          c.lineTo(px, py - 4);
          c.lineTo(px + 3, py);
          c.stroke();
        }
      }
    const paths = [
      [
        [240, 672],
        [2816, 672],
      ],
      [
        [704, 448],
        [704, 1792],
        [2304, 1792],
        [2304, 672],
      ],
      [
        [576, 464],
        [576, 672],
      ],
    ];
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const width of [118, 104, 88]) {
      c.lineWidth = width;
      c.strokeStyle = width === 118 ? '#809851' : width === 104 ? '#d8be82' : '#e8ce95';
      for (const points of paths) {
        c.beginPath();
        points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.stroke();
      }
    }
    c.fillStyle = '#d5bd85';
    c.beginPath();
    c.ellipse(2304, 1830, 335, 300, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#f2dfaa';
    c.lineWidth = 7;
    c.beginPath();
    c.ellipse(2304, 1830, 300, 268, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#bfa577';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(2304, 1830, 85, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#b79b6945';
    c.font = 'bold 92px Georgia';
    c.textAlign = 'center';
    c.fillText('♛', 2304, 1860);
    for (const p of PONDS) {
      c.fillStyle = '#cfce95';
      c.beginPath();
      c.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 12, p.h / 2 + 12, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6bb1b0';
      c.beginPath();
      c.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#bdd9ad';
      c.lineWidth = 5;
      c.stroke();
    }
    // Zone edges are softened by mottled vegetation rather than a wall or a loading screen.
    for (let i = 0; i < 160; i++) {
      const x = 1536 + Math.sin(i * 5) * 27,
        y = i * 15;
      c.fillStyle = i % 2 ? '#91ad6519' : '#d5d88d18';
      c.beginPath();
      c.ellipse(x, y, 30, 16, 0, 0, Math.PI * 2);
      c.fill();
    }
    return canvas;
  }
  event(e: WorldEvent): void {
    if (e.type === 'hit' && e.hit) {
      this.shake = e.hit.kind === 'kick' ? 5 : 2;
      this.particles.push({
        x: e.x,
        y: e.y - 28,
        life: 0.85,
        max: 0.85,
        vx: 0,
        vy: -35,
        text: e.hit.blocked
          ? `GUARD ${e.hit.damage}`
          : `−${e.hit.damage}${e.hit.combo > 1 ? ` · ${e.hit.combo}×` : ''}`,
        color: e.hit.targetId === 'player' ? '#ffdac0' : '#fff5c7',
      });
      for (let i = 0; i < 7; i++)
        this.particles.push({
          x: e.x,
          y: e.y,
          life: 0.4,
          max: 0.4,
          vx: Math.cos(i) * 90,
          vy: Math.sin(i) * 90,
          color: i % 2 ? '#fce4a1' : '#eef4dc',
        });
    }
    if (e.type === 'egg') {
      for (let i = 0; i < Math.min(5, Math.max(1, e.amount ?? 1)); i++)
        this.particles.push({
          x: e.x + (i - 2) * 9,
          y: e.y + 12,
          life: 1.3,
          max: 1.3,
          vx: (i - 2) * 8,
          vy: -52,
          color: '#fff0c4',
          egg: true,
        });
    }
  }
  draw(world: WorldSimulation, time: number, dt: number, menu = false): void {
    this.camera.follow(world.player, dt);
    const c = this.c,
      cam = this.camera,
      dpr = this.canvas.width / Math.max(1, this.width);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    c.save();
    c.scale(this.scale, this.scale);
    c.translate(-cam.x, -cam.y);
    if (this.shake > 0 && dt > 0) {
      c.translate(Math.sin(time * 111) * this.shake, Math.cos(time * 121) * this.shake);
      this.shake = Math.max(0, this.shake - dt * 28);
    }
    c.drawImage(this.terrain, 0, 0);
    const visible = (p: Vec, margin = 120) =>
      p.x > cam.x - margin &&
      p.x < cam.x + cam.width + margin &&
      p.y > cam.y - margin &&
      p.y < cam.y + cam.height + margin;
    for (const p of PONDS)
      if (visible({ x: p.x + p.w / 2, y: p.y + p.h / 2 }, 200)) {
        c.strokeStyle = '#e3f5d980';
        c.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const x = p.x + 40 + i * 37,
            y = p.y + p.h / 2 + Math.sin(i * 2 + time) * 25;
          c.beginPath();
          c.ellipse(x, y, 12 + Math.sin(time + i) * 4, 3, 0, 0, Math.PI);
          c.stroke();
        }
      }
    const nearby = world.nearest(Date.now());
    const drawables: { y: number; draw: () => void }[] = [];
    for (const o of world.objects) {
      if (
        !visible(o) ||
        world.inactive.has(o.id) ||
        (o.kind === 'stash' && !available(o, world.progress, Date.now()))
      )
        continue;
      drawables.push({
        y: o.y + (o.kind === 'tree' ? 35 : 0),
        draw: () => {
          if (o.kind === 'npc')
            drawRooster(
              c,
              {
                ...o,
                angle: Math.sin(o.x + time * 0.3) * 0.5 + Math.PI / 2,
                moving: false,
                hp: 1,
                hurt: 0,
                lay: 0,
                blocking: false,
                attack: null,
              },
              time,
              { body: ['#f4e4b3', '#cdb9a4', '#f0d3a4'][o.variant], tail: '#8c9e7b', scale: 0.78 },
            );
          else
            drawObject(
              c,
              o,
              time,
              !available(o, world.progress, Date.now()),
              !menu && nearby?.id === o.id,
            );
          if (!menu && nearby?.id === o.id) {
            c.fillStyle = '#fff3bf';
            c.beginPath();
            c.arc(o.x, o.y - 55 + Math.sin(time * 3) * 3, 4, 0, Math.PI * 2);
            c.fill();
          }
        },
      });
    }
    for (const enemy of world.enemies) {
      if (!enemy.active || !visible(enemy) || (enemy.hp <= 0 && enemy.deadFor > 1.2)) continue;
      const cfg = ENEMIES[enemy.kind];
      drawables.push({
        y: enemy.y,
        draw: () => {
          if (enemy.attack) {
            const a = ATTACKS[enemy.attack.kind];
            c.save();
            c.translate(enemy.x, enemy.y);
            c.rotate(enemy.attack.angle);
            c.fillStyle = enemy.attack.time < a.windup ? '#e77a5145' : '#fff1b955';
            c.strokeStyle = '#e47955';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(0, 0);
            c.arc(0, 0, a.range, -a.arc / 2, a.arc / 2);
            c.closePath();
            c.fill();
            c.stroke();
            c.restore();
          }
          drawRooster(c, enemy, time, {
            body: cfg.color,
            tail: cfg.tail,
            comb: enemy.kind === 'champion' ? 4 : 3,
            scale: enemy.kind === 'champion' ? 1.3 : 1,
          });
          if ((enemy.hp < enemy.maxHp && enemy.hp > 0) || enemy.kind === 'champion') {
            c.fillStyle = '#294f3b';
            c.fillRect(enemy.x - 25, enemy.y - 54, 50, 5);
            c.fillStyle = '#efb06d';
            c.fillRect(enemy.x - 25, enemy.y - 54, 50 * Math.max(0, enemy.hp / enemy.maxHp), 5);
          }
          if (enemy.state === 'chase' && enemy.hp > 0) {
            c.fillStyle = '#fff0b5';
            c.font = 'bold 12px system-ui';
            c.textAlign = 'center';
            c.fillText('!', enemy.x, enemy.y - 63);
          }
        },
      });
    }
    drawables.push({
      y: world.player.y,
      draw: () => {
        const a = world.player.attack;
        if (a) {
          const cfg = ATTACKS[a.kind];
          c.save();
          c.translate(world.player.x, world.player.y);
          c.rotate(a.angle);
          c.strokeStyle = a.time < cfg.windup ? '#fff5c970' : '#fff2b9';
          c.lineWidth = a.time < cfg.windup ? 2 : 5;
          c.beginPath();
          c.arc(0, 0, cfg.range, -cfg.arc / 2, cfg.arc / 2);
          c.stroke();
          c.restore();
        }
        c.strokeStyle = '#fff4b45c';
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(world.player.x, world.player.y + 3, 30, 28, 0, 0, Math.PI * 2);
        c.stroke();
        drawRooster(c, world.player, time, HERO, world.progress.world.champion && menu);
      },
    });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      c.globalAlpha = Math.min(1, Math.max(0, p.life * 3));
      c.fillStyle = p.color;
      if (p.text) {
        c.font = '800 15px system-ui';
        c.textAlign = 'center';
        c.strokeStyle = '#384a32';
        c.lineWidth = 3;
        c.strokeText(p.text, p.x, p.y);
        c.fillText(p.text, p.x, p.y);
      } else if (p.egg) {
        c.beginPath();
        c.ellipse(p.x, p.y + Math.abs(Math.sin(p.life * 8)) * 8, 6, 9, -0.15, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#b89b56';
        c.lineWidth = 1;
        c.stroke();
      } else c.fillRect(p.x, p.y, 4, 4);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    c.globalAlpha = 1;
    if (world.zone === 'forest') {
      c.fillStyle = '#163c3d1c';
      c.fillRect(cam.x, cam.y, cam.width, cam.height);
      for (let i = 0; i < 12; i++) {
        const x = cam.x + ((i * 137 + time * 6) % cam.width),
          y = cam.y + ((i * 71 + Math.sin(time + i) * 8) % cam.height);
        c.fillStyle = '#ebedb777';
        c.beginPath();
        c.arc(x, y, 1.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
    document
      .querySelectorAll<HTMLCanvasElement>('.minimap')
      .forEach((map) => this.drawMinimap(map, world));
  }
  drawMinimap(canvas: HTMLCanvasElement, world: WorldSimulation): void {
    const c = canvas.getContext('2d')!,
      w = canvas.width,
      h = canvas.height,
      sx = w / WORLD_WIDTH,
      sy = h / WORLD_HEIGHT;
    c.clearRect(0, 0, w, h);
    c.save();
    c.scale(sx, sy);
    c.drawImage(this.terrain, 0, 0);
    c.strokeStyle = '#f4e6ab';
    c.lineWidth = 14;
    c.strokeRect(this.camera.x, this.camera.y, this.camera.width, this.camera.height);
    for (const o of world.objects)
      if (['house', 'shop', 'bell'].includes(o.kind)) {
        c.fillStyle = o.kind === 'shop' ? '#c86d4c' : '#8c6e46';
        c.fillRect(o.x - 36, o.y - 32, 72, 64);
      }
    const goal = objectives(world.progress).find((o) => !o.done);
    if (goal) {
      c.fillStyle = '#fff0a2';
      c.beginPath();
      c.arc(goal.target.x, goal.target.y, 40, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#faffec';
    c.strokeStyle = '#2b5646';
    c.lineWidth = 13;
    c.beginPath();
    c.arc(world.player.x, world.player.y, 34, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  }
}
