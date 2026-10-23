import { ATTACKS, BALANCE, OPPONENTS, type AttackKind } from './config';
import type { Progress } from './save';
import { playerStats } from './economy';
export interface Attack { kind: AttackKind; time: number; hit: boolean }
export interface Fighter {
  x: number; hp: number; maxHp: number; stamina: number; maxStamina: number; power: number; speed: number; facing: 1 | -1;
  move: number; blocking: boolean; blockLock: number; invulnerable: number; stun: number; hurt: number; lay: number;
  attack: Attack | null; cooldowns: Record<AttackKind, number>; combo: number; comboTime: number; lastKind: AttackKind | null;
}
export interface HitEvent { x: number; damage: number; blocked: boolean; combo: number; strong: boolean; player: boolean }
export const makeFighter = (x: number, hp: number, stamina: number, power: number, speed: number, facing: 1 | -1): Fighter => ({ x, hp, maxHp: hp, stamina, maxStamina: stamina, power, speed, facing, move: 0, blocking: false, blockLock: 0, invulnerable: 0, stun: 0, hurt: 0, lay: 0, attack: null, cooldowns: { peck: 0, wing: 0, kick: 0 }, combo: 0, comboTime: 0, lastKind: null });
export function damageFor(kind: AttackKind, power: number, blocked: boolean, combo = 1): number {
  return Math.max(1, Math.round(ATTACKS[kind].damage * power * (1 + Math.min(3, Math.max(0, combo - 1)) * .1) * (blocked ? 1 - BALANCE.blockReduction : 1)));
}
export function startAttack(f: Fighter, kind: AttackKind): boolean {
  const a = ATTACKS[kind];
  if (f.hp <= 0 || f.attack || f.blocking || f.stun > 0 || f.lay > 0 || f.cooldowns[kind] > 0 || f.stamina < a.cost) return false;
  f.stamina -= a.cost; f.cooldowns[kind] = a.cooldown; f.attack = { kind, time: 0, hit: false }; return true;
}
export function setBlock(f: Fighter, requested: boolean): void {
  f.blocking = requested && f.hp > 0 && !f.attack && f.stun <= 0 && f.lay <= 0 && f.blockLock <= 0 && f.stamina > 4;
}
export function updateFighter(f: Fighter, dt: number): void {
  for (const key of Object.keys(f.cooldowns) as AttackKind[]) f.cooldowns[key] = Math.max(0, f.cooldowns[key] - dt);
  for (const key of ['invulnerable','stun','hurt','lay','blockLock','comboTime'] as const) f[key] = Math.max(0, f[key] - dt);
  if (!f.comboTime) { f.combo = 0; f.lastKind = null; }
  if (f.blocking) { f.stamina = Math.max(0, f.stamina - BALANCE.blockDrain * dt); if (f.stamina <= 4) { f.blocking = false; f.blockLock = 1.1; } }
  else f.stamina = Math.min(f.maxStamina, f.stamina + BALANCE.regen * (f.attack ? .25 : 1) * dt);
  if (f.attack) f.attack.time += dt;
  if (f.hp > 0 && f.stun <= 0 && f.lay <= 0) f.x += f.move * f.speed * (f.attack ? .26 : f.blocking ? .35 : 1) * dt;
  f.x = Math.max(70, Math.min(1130, f.x));
}
export function resolveHit(attacker: Fighter, target: Fighter, player: boolean): HitEvent | null {
  const a = attacker.attack;
  if (!a || a.hit || attacker.hp <= 0 || target.hp <= 0) return null;
  const cfg = ATTACKS[a.kind];
  if (a.time < cfg.windup || a.time > cfg.windup + cfg.active || target.invulnerable > 0 || Math.abs(attacker.x - target.x) > cfg.range) return null;
  a.hit = true;
  attacker.combo = attacker.comboTime > 0 && attacker.lastKind !== a.kind ? Math.min(4, attacker.combo + 1) : 1;
  attacker.lastKind = a.kind; attacker.comboTime = BALANCE.comboWindow;
  const blocked = target.blocking && target.stamina >= 8;
  const damage = damageFor(a.kind, attacker.power, blocked, attacker.combo);
  target.hp = Math.max(0, target.hp - damage); target.hurt = .22; target.invulnerable = .18;
  target.stun = blocked ? .06 : a.kind === 'kick' ? .32 : .13;
  if (blocked) { target.stamina = Math.max(0, target.stamina - cfg.cost * .65); if (target.stamina < 8) { target.blockLock = 1.1; target.blocking = false; } }
  else { target.attack = null; target.blocking = false; }
  target.x = Math.max(70, Math.min(1130, target.x + attacker.facing * cfg.knockback * (blocked ? .3 : 1)));
  return { x: target.x, damage, blocked, combo: attacker.combo, strong: a.kind === 'kick', player };
}
export function endAttack(f: Fighter): void {
  if (f.attack) { const cfg = ATTACKS[f.attack.kind]; if (f.attack.time >= cfg.windup + cfg.active + cfg.recovery) f.attack = null; }
}
export function separate(a: Fighter, b: Fighter): void {
  // Side order is invariant, even at a wall or after a large movement step.
  const gap = BALANCE.radius * 2;
  if (b.x - a.x < gap) { const center = Math.max(70 + gap / 2, Math.min(1130 - gap / 2, (a.x + b.x) / 2)); a.x = center - gap / 2; b.x = center + gap / 2; }
  a.facing = 1; b.facing = -1;
}
export const outcome = (player: Fighter, enemy: Fighter): 'win' | 'loss' | null => player.hp <= 0 ? 'loss' : enemy.hp <= 0 ? 'win' : null;
export function createCombat(p: Progress): { player: Fighter; enemy: Fighter } {
  const stats = playerStats(p), index = p.stage % 3, enemy = OPPONENTS[index], scale = 1 + Math.floor(p.stage / 3) * .08;
  return { player: makeFighter(320, stats.maxHp, stats.maxStamina, stats.power, BALANCE.speed, 1), enemy: makeFighter(870, enemy.hp * scale, 100, enemy.power * scale, enemy.speed, -1) };
}
