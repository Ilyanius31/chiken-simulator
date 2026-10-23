import { OPPONENTS } from '../core/config';
import type { Fighter, HitEvent } from '../core/combat';
import { drawRooster, HERO } from './rooster';
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; text?: string; egg?: boolean }
export class ArenaRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 1200;
  private height = 600;
  private shake = 0;
  private particles: Particle[] = [];
  private observer: ResizeObserver;
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
  }
  private resize(): void {
    const box = this.canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(box.width * dpr); this.canvas.height = Math.round(box.height * dpr);
    this.width = 1200; this.height = Math.max(280, box.height / Math.max(1, box.width) * 1200);
  }
  get ground(): number { return this.height * .81; }
  hit(event: HitEvent): void {
    this.shake = event.blocked ? 2 : event.strong ? 8 : 4;
    this.particles.push({ x: event.x, y: this.ground - 120 * this.birdScale, vx: 0, vy: -45, life: 1, maxLife: 1, color: event.blocked ? '#458a8a' : '#b34d37', text: event.blocked ? `GUARD −${event.damage}` : event.combo > 1 ? `−${event.damage} · ${event.combo}×` : `−${event.damage}` });
    for (let i = 0; i < 9; i++) this.particles.push({ x: event.x, y: this.ground - 85 * this.birdScale, vx: (Math.random() - .5) * 260, vy: -Math.random() * 180, life: .35 + Math.random() * .2, maxLife: .55, color: event.blocked ? '#8cc9c5' : ['#fff8d9','#efb545','#e77951'][i % 3] });
  }
  egg(x: number): void { this.particles.push({ x: x - 28, y: this.ground - 10, vx: -14, vy: -155, life: 1.25, maxLife: 1.25, color: '#fff9e7', egg: true }); }
  clear(): void { this.particles = []; }
  private get birdScale(): number { return Math.min(1.2, this.height / 430); }
  draw(player: Fighter, enemy: Fighter | null, index: number, time: number, dt: number, menu = false, winner: 'win' | 'loss' | null = null): void {
    const c = this.ctx, w = this.width, h = this.height, ground = this.ground;
    c.setTransform(this.canvas.width / w, 0, 0, this.canvas.height / h, 0, 0);
    c.clearRect(0, 0, w, h); c.save();
    if (this.shake > 0) { c.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake); this.shake = Math.max(0, this.shake - dt * 32); }
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#e4eee3'); sky.addColorStop(1, '#f8f1d7'); c.fillStyle = sky; c.fillRect(-10, -10, w + 20, h + 20);
    c.fillStyle = '#f9d888'; c.beginPath(); c.arc(menu ? 940 : 970, h * .23, 43, 0, Math.PI * 2); c.fill();
    // Slow cloud ribbons and rolling orchard hills.
    c.fillStyle = '#ffffff70';
    for (let i = 0; i < 4; i++) { const x = (i * 370 + time * 4) % 1500 - 130; c.beginPath(); c.ellipse(x, h * (.15 + (i % 2) * .1), 72, 12, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#b8cead'; c.beginPath(); c.moveTo(0, h * .59); c.bezierCurveTo(200, h * .24, 310, h * .77, 560, h * .49); c.bezierCurveTo(850, h * .23, 1040, h * .57, 1200, h * .42); c.lineTo(w, ground); c.lineTo(0, ground); c.fill();
    c.fillStyle = '#8fae8a'; c.beginPath(); c.moveTo(0, h * .67); c.bezierCurveTo(330, h * .4, 540, h * .83, 800, h * .57); c.quadraticCurveTo(1070, h * .43, 1200, h * .68); c.lineTo(w, ground); c.lineTo(0, ground); c.fill();
    // The little coop is an original vector illustration.
    c.save(); c.translate(menu ? 160 : 1035, ground - 82); c.scale(.9, .9);
    c.fillStyle = '#a77451'; c.fillRect(-65, -67, 126, 93); c.fillStyle = '#82543e'; c.beginPath(); c.moveTo(-84, -64); c.lineTo(-9, -118); c.lineTo(78, -64); c.closePath(); c.fill();
    c.strokeStyle = '#ffffff20'; c.lineWidth = 3; for (let x = -54; x < 60; x += 21) { c.beginPath(); c.moveTo(x, -61); c.lineTo(x, 24); c.stroke(); }
    c.fillStyle = '#403f31'; c.beginPath(); c.roundRect(-28, -38, 40, 64, [19, 19, 0, 0]); c.fill(); c.fillStyle = '#f5d477'; c.fillRect(24, -43, 22, 23); c.restore();
    c.strokeStyle = '#e4d6ad'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, ground - 39); c.lineTo(w, ground - 39); c.moveTo(0, ground - 16); c.lineTo(w, ground - 16); c.stroke();
    for (let x = 32; x < w; x += 88) { c.fillStyle = '#f1e2bb'; c.beginPath(); c.roundRect(x, ground - 66, 10, 76, [4,4,0,0]); c.fill(); }
    c.fillStyle = '#ddc391'; c.fillRect(0, ground, w, h - ground); c.fillStyle = '#c2b580'; c.fillRect(0, ground - 3, w, 7);
    for (let i = 0; i < 44; i++) { const x = (i * 137) % 1200, y = ground + 15 + ((i * 43) % Math.max(20, h - ground - 22)); c.fillStyle = i % 3 ? '#bba47750' : '#fff3ca80'; c.beginPath(); c.ellipse(x, y, 3 + i % 4, 1.5, 0, 0, Math.PI * 2); c.fill(); }
    const scale = menu ? Math.min(1.9, h / 220) : this.birdScale;
    drawRooster(c, player, ground, time, HERO, scale, winner === 'win');
    if (enemy) drawRooster(c, enemy, ground, time, OPPONENTS[index], this.birdScale, winner === 'loss');
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.egg) { p.vy += 470 * dt; if (p.y > ground - 12) { p.y = ground - 12; p.vy = -Math.abs(p.vy) * .45; } } else if (!p.text) p.vy += 330 * dt;
      c.globalAlpha = Math.min(1, Math.max(0, p.life * 3)); c.fillStyle = p.color;
      if (p.text) { c.font = '800 22px system-ui'; c.textAlign = 'center'; c.fillText(p.text, p.x, p.y); }
      else if (p.egg) { c.strokeStyle = '#c9a86a'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, 10, 14, -.2, 0, Math.PI * 2); c.fill(); c.stroke(); }
      else { c.save(); c.translate(p.x, p.y); c.rotate(p.life * 8); c.fillRect(-4, -2, 8, 4); c.restore(); }
    }
    this.particles = this.particles.filter(p => p.life > 0); c.globalAlpha = 1; c.restore();
  }
}
