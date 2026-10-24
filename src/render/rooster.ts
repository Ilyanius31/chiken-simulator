import type { Fighter } from '../core/combat';
import { ATTACKS } from '../core/config';
export interface Plumage {
  body: string;
  tail: string;
  comb?: number;
  scale?: number;
}
export const HERO: Plumage = { body: '#fff0c6', tail: '#34796c', comb: 3 };
export function drawRooster(
  c: CanvasRenderingContext2D,
  f: Pick<Fighter, 'x' | 'y' | 'angle' | 'moving' | 'hp' | 'hurt' | 'lay' | 'blocking' | 'attack'>,
  time: number,
  plumage: Plumage = HERO,
  victory = false,
): void {
  c.save();
  c.translate(f.x, f.y);
  const scale = plumage.scale ?? 1;
  c.scale(scale, scale);
  c.fillStyle = '#193f3433';
  c.beginPath();
  c.ellipse(3, 8, 25, 24, 0, 0, Math.PI * 2);
  c.fill();
  c.rotate(f.angle + Math.PI / 2);
  const dead = f.hp <= 0;
  if (dead) {
    c.rotate(0.9);
    c.globalAlpha = 0.7;
    c.scale(1.15, 0.7);
  }
  const walk = f.moving ? Math.sin(time * 17) : Math.sin(time * 3) * 0.15;
  c.translate(walk * 1.2, victory ? -Math.abs(Math.sin(time * 7)) * 5 : 0);
  if (f.lay > 0) c.scale(1 + Math.sin(time * 24) * 0.06, 0.9);
  const stroke = '#294738';
  c.lineWidth = 2;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const path = (d: string, color: string) => {
    const p = new Path2D(d);
    c.fillStyle = color;
    c.fill(p);
    c.strokeStyle = stroke;
    c.stroke(p);
  };
  // Seen from above: fan tail behind the body, feet at the sides, head toward the facing vector.
  c.save();
  c.translate(0, 15);
  c.rotate(walk * 0.08);
  for (let i = -1; i <= 1; i++) {
    c.save();
    c.rotate(i * 0.4);
    path('M -6 1 Q -18 24 -9 38 Q 0 44 9 35 Q 16 13 6 0 Z', i === 0 ? plumage.tail : '#509689');
    c.strokeStyle = '#ffffff33';
    c.beginPath();
    c.moveTo(0, 8);
    c.lineTo(0, 31);
    c.stroke();
    c.restore();
  }
  c.restore();
  c.strokeStyle = '#e8a546';
  c.lineWidth = 4;
  for (const side of [-1, 1]) {
    const stride = walk * 5 * side;
    c.beginPath();
    c.moveTo(side * 11, 7);
    c.lineTo(side * 21, 12 + stride);
    c.lineTo(side * 24, 6 + stride);
    c.moveTo(side * 21, 12 + stride);
    c.lineTo(side * 28, 12 + stride);
    c.stroke();
  }
  const attack = f.attack,
    cfg = attack && ATTACKS[attack.kind],
    strike = attack && cfg && attack.time >= cfg.windup;
  if (strike && attack.kind === 'kick') {
    c.strokeStyle = '#f3b642';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(12, 0);
    c.lineTo(14, -49);
    c.lineTo(23, -53);
    c.stroke();
  }
  c.fillStyle = f.hurt > 0 ? '#fffdf2' : plumage.body;
  c.strokeStyle = stroke;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(0, 1, 21, 27, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff35';
  c.beginPath();
  c.ellipse(-5, -3, 10, 17, -0.2, 0, Math.PI * 2);
  c.fill();
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 16, 0);
    c.rotate(side * (f.blocking ? -1.15 : strike && attack?.kind === 'wing' ? -1.4 : walk * 0.08));
    c.scale(side, 1);
    path(
      'M 0 -15 Q 19 -13 16 9 Q 11 20 -1 16 Q 6 4 0 -15 Z',
      plumage === HERO ? '#dfb970' : plumage.tail,
    );
    c.strokeStyle = '#8b793b66';
    c.beginPath();
    c.moveTo(6, -4);
    c.lineTo(8, 12);
    c.stroke();
    c.restore();
  }
  c.save();
  c.translate(0, strike && attack?.kind === 'peck' ? -9 : attack && !strike ? 4 : 0);
  path('M -8 -30 L 0 -46 L 8 -30 Z', '#f5ba40');
  c.fillStyle = f.hurt > 0 ? '#fffefa' : plumage.body;
  c.strokeStyle = stroke;
  c.beginPath();
  c.ellipse(0, -22, 16, 16, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  for (const side of [-1, 1]) {
    c.fillStyle = '#fffdf3';
    c.beginPath();
    c.ellipse(side * 10, -26, 5, 6, side * 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#243e32';
    c.beginPath();
    c.arc(side * 10, -28, 2.6, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#e46850';
  c.strokeStyle = '#ad4c3b';
  c.lineWidth = 1.5;
  for (let i = 0; i < (plumage.comb ?? 3); i++) {
    c.beginPath();
    c.ellipse(0, -30 + i * 7, 4.8, 7, 0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.restore();
  if (f.blocking) {
    c.strokeStyle = '#9ee6e1';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, 36, -Math.PI * 0.9, -Math.PI * 0.1);
    c.stroke();
  }
  if (dead) {
    c.fillStyle = '#f5d575';
    c.font = '18px sans-serif';
    c.fillText('✦', -8, -42);
  }
  c.restore();
}
