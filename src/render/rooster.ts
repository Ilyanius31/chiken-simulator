import { ATTACKS } from '../core/config';
import type { Fighter } from '../core/combat';
export interface Plumage { color: string; dark: string; comb: number; scale: number }
export const HERO: Plumage = { color: '#fff0c5', dark: '#1d6258', comb: 3, scale: 1 };
export function drawRooster(ctx: CanvasRenderingContext2D, f: Fighter, y: number, time: number, plumage: Plumage, scale = 1, victory = false): void {
  const attack = f.attack, cfg = attack && ATTACKS[attack.kind];
  const windup = attack && cfg ? Math.min(1, attack.time / cfg.windup) : 0;
  const strike = attack && cfg && attack.time >= cfg.windup && attack.time < cfg.windup + cfg.active + .12;
  const walking = Math.abs(f.move) > 0 && !attack && f.hp > 0;
  const bob = walking ? Math.sin(time * 18) * 5 : Math.sin(time * 3.5) * 2;
  ctx.save(); ctx.translate(f.x, y); ctx.scale(scale * plumage.scale, scale * plumage.scale);
  ctx.fillStyle = '#173b2c25'; ctx.beginPath(); ctx.ellipse(0, 2, 72, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(f.facing, 1);
  if (f.hp <= 0) { ctx.translate(0, -22); ctx.rotate(-1.2); ctx.globalAlpha = .8; }
  else { ctx.translate(0, bob - (victory ? Math.abs(Math.sin(time * 6)) * 22 : 0)); ctx.rotate(f.hurt > 0 ? -.15 : f.lay > 0 ? Math.sin(time * 28) * .07 : attack && !strike ? -.1 * windup : strike ? .16 : 0); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const shape = (path: string, fill: string, stroke = '#263e34', width = 3) => { const p = new Path2D(path); ctx.fillStyle = fill; ctx.fill(p); if (width) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(p); } };
  // Broad, individually curved tail feathers give each bird a readable silhouette.
  ctx.save(); ctx.translate(-30, -65); ctx.rotate(Math.sin(time * 3) * .04);
  shape('M 5 16 C -28 -2 -93 -34 -90 -86 C -63 -99 -26 -53 -8 -11 Z', plumage.dark);
  shape('M -2 14 C -43 6 -109 -4 -112 -51 C -93 -75 -39 -43 1 -8 Z', '#328879');
  shape('M 4 19 C -42 29 -97 16 -104 -18 C -80 -45 -36 -16 8 0 Z', plumage.dark);
  ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-78, -67); ctx.quadraticCurveTo(-56, -30, -12, 3); ctx.stroke(); ctx.restore();
  // Legs, toes, and the extended kick.
  ctx.strokeStyle = '#de9a38'; ctx.lineWidth = 8;
  for (let leg = 0; leg < 2; leg++) {
    const dx = leg ? 20 : -17, stride = walking ? Math.sin(time * 18 + leg * Math.PI) * 16 : 0;
    ctx.beginPath(); ctx.moveTo(dx, -36); ctx.lineTo(dx + stride, -10);
    if (strike && attack?.kind === 'kick' && leg) { ctx.lineTo(94, -54); ctx.lineTo(109, -57); }
    else { ctx.lineTo(dx + stride + 8, -4); ctx.lineTo(dx + stride + 24, -4); ctx.moveTo(dx + stride + 8, -4); ctx.lineTo(dx + stride - 5, 0); }
    ctx.stroke();
  }
  const body = f.hurt > 0 && !f.blocking ? '#fff8e8' : plumage.color;
  shape('M -49 -92 C -50 -124 -9 -139 25 -120 C 56 -104 61 -66 37 -43 C 19 -24 -25 -25 -44 -49 C -53 -62 -56 -77 -49 -92 Z', body);
  shape('M 4 -110 C 20 -130 13 -154 31 -165 C 53 -177 72 -162 71 -144 L 64 -102 C 55 -79 35 -77 13 -87 Z', body);
  // Neck ruff.
  shape('M 17 -117 L 23 -97 L 30 -104 L 35 -90 L 42 -102 L 48 -91 L 57 -111', '#edb854', '#b9843c', 2);
  // A distinctive scalloped comb, varied for opponents.
  ctx.save(); ctx.translate(33, -165);
  let comb = 'M -12 7 Q -24 -7 -14 -17';
  for (let i = 0; i < plumage.comb; i++) { const x = -14 + i * 12; comb += ` Q ${x - 1} ${-34 - (i % 2) * 7} ${x + 8} -20`; }
  comb += ' Q 44 -9 27 6 Z'; shape(comb, '#e7684e'); ctx.restore();
  shape('M 55 -132 Q 70 -133 68 -116 Q 60 -104 54 -116 Z', '#dc5949');
  // Beak lunges on a peck; eyebrow communicates windup.
  ctx.save(); ctx.translate(strike && attack?.kind === 'peck' ? 25 : 0, 0);
  shape('M 68 -148 L 94 -137 L 68 -129 Z', '#f5bd45');
  ctx.strokeStyle = '#ad722a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(70, -137); ctx.lineTo(89, -137); ctx.stroke();
  ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.ellipse(56, -149, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#203a31'; ctx.beginPath(); ctx.ellipse(60, -148, 4.3, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(61, -151, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#273f34'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(46, -162); ctx.lineTo(66, -158 + (attack ? 4 : 0)); ctx.stroke(); ctx.restore();
  // Articulated wing doubles as the visible block pose.
  ctx.save(); ctx.translate(-7, -85);
  ctx.rotate(f.blocking ? -1.5 : strike && attack?.kind === 'wing' ? -1.1 : attack?.kind === 'wing' ? .5 * windup : Math.sin(time * 3) * .05);
  shape('M -24 -11 C -8 -28 22 -18 34 1 C 39 15 20 31 -2 24 L -19 12 L -28 -2 Z', plumage === HERO ? '#e3be76' : plumage.dark);
  ctx.strokeStyle = '#263e3438'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 9, 1); ctx.lineTo(6 + i * 7, 17); ctx.stroke(); } ctx.restore();
  if (f.blocking) { ctx.strokeStyle = '#86c4c5'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(68, -94, 18, 56, -.12, -1.4, 1.4); ctx.stroke(); }
  if (attack?.kind === 'kick' && !strike) { ctx.fillStyle = '#f8cf65'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('!', 75, -190); }
  if (f.hp <= 0) { ctx.fillStyle = '#f4bd44'; ctx.font = '26px sans-serif'; ctx.fillText('✦', 49, -190 + Math.sin(time * 4) * 5); }
  ctx.restore();
}
