import { ATTACKS, ENEMIES, type AttackKind, type UpgradeKind } from '../core/config';
import { createEnemy, updateAI, type Enemy } from '../core/ai';
import {
  inAttackArc,
  makeFighter,
  moveFighter,
  resolveHit,
  separateFighters,
  setBlock,
  startAttack,
  tickFighter,
  type Fighter,
  type HitEvent,
} from '../core/combat';
import { awardEggs, claimEgg, playerStats, purchase } from '../core/economy';
import type { Progress } from '../core/save';
import { collides, distance, lineOfSight } from './collision';
import { available, collectObject, nearestInteraction } from './interactions';
import {
  ENEMY_SPAWNS,
  OBJECTS,
  SPAWN,
  zoneAt,
  type Vec,
  type WorldObject,
  type ZoneId,
} from './map';
export interface WorldEvent extends Vec {
  type: 'hit' | 'egg' | 'notice' | 'zone' | 'defeat' | 'victory' | 'shop' | 'dialogue';
  text?: string;
  hit?: HitEvent;
  amount?: number;
}
export interface Controls {
  move: Vec;
  block: boolean;
  attack: AttackKind | null;
}
export class WorldSimulation {
  player: Fighter;
  enemies: Enemy[];
  objects = OBJECTS;
  events: WorldEvent[] = [];
  inactive = new Set<string>();
  zone: ZoneId;
  bossActive = false;
  elapsed = 0;
  dirty = false;
  constructor(public progress: Progress) {
    const stats = playerStats(progress);
    this.player = makeFighter(
      'player',
      progress.world.x,
      progress.world.y,
      stats.maxHp,
      stats.maxStamina,
      stats.power,
    );
    this.refreshInactive(Date.now());
    if (collides(this.player, 20, this.objects, this.inactive)) Object.assign(this.player, SPAWN);
    this.enemies = ENEMY_SPAWNS.map(createEnemy);
    for (const enemy of this.enemies) {
      if (collides(enemy, 20, this.objects)) {
        const origin = { ...enemy };
        for (let r = 32; r <= 160; r += 32) {
          let found = false;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            const point = { x: origin.x + Math.cos(a) * r, y: origin.y + Math.sin(a) * r };
            if (!collides(point, 20, this.objects)) {
              Object.assign(enemy, point);
              enemy.home = { ...point };
              enemy.destination = { ...point };
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }
    this.zone = zoneAt(this.player);
    this.refreshInactive(Date.now());
  }
  private emit(
    type: WorldEvent['type'],
    text?: string,
    pos: Vec = this.player,
    amount?: number,
  ): void {
    this.events.push({ type, ...pos, text, amount });
  }
  refreshInactive(now: number): void {
    this.inactive.clear();
    for (const o of this.objects)
      if (o.kind === 'crate' && !available(o, this.progress, now)) this.inactive.add(o.id);
  }
  update(dt: number, controls: Controls, now: number, random = Math.random): void {
    if (this.player.hp <= 0) return;
    this.elapsed += dt;
    this.refreshInactive(now);
    tickFighter(this.player, dt);
    setBlock(this.player, controls.block);
    moveFighter(this.player, controls.move, dt, this.objects, this.inactive);
    if (controls.attack) {
      // Assist within a modest facing cone; never turn around or hit through cover.
      if (!this.player.attack && !this.player.blocking) {
        const target = this.enemies
          .filter(
            (e) =>
              e.active &&
              e.hp > 0 &&
              distance(e, this.player) < 125 &&
              Math.cos(Math.atan2(e.y - this.player.y, e.x - this.player.x) - this.player.angle) >
                0.45 &&
              lineOfSight(this.player, e, this.objects, this.inactive),
          )
          .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
        if (target)
          this.player.angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      }
      startAttack(this.player, controls.attack);
    }
    const nextZone = zoneAt(this.player);
    if (nextZone !== this.zone) {
      this.zone = nextZone;
      if (!this.progress.world.visited.includes(nextZone))
        this.progress.world.visited.push(nextZone);
      this.emit('zone', nextZone);
      this.dirty = true;
    }
    if (this.zone === 'village')
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 12 * dt);
    if (this.bossActive && this.zone !== 'arena') {
      const boss = this.enemies.find((e) => e.kind === 'champion')!;
      boss.active = false;
      boss.hp = boss.maxHp;
      boss.attack = null;
      Object.assign(boss, boss.home);
      this.bossActive = false;
      this.emit('notice', 'Challenge paused. Ring the arena bell to try again.');
    }
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (enemy.hp <= 0) {
        enemy.deadFor += dt;
        if (
          enemy.kind !== 'champion' &&
          enemy.deadFor > 75 &&
          distance(enemy.home, this.player) > 550
        ) {
          const fresh = createEnemy({ ...enemy.home, id: enemy.id, kind: enemy.kind });
          Object.assign(enemy, fresh);
        }
        continue;
      }
      tickFighter(enemy, dt);
      if (updateAI(enemy, this.player, dt, this.objects, this.inactive, random))
        this.emit('egg', undefined, enemy, 0);
      separateFighters(this.player, enemy, this.objects, this.inactive);
      if (
        distance(this.player, enemy) < 125 &&
        lineOfSight(this.player, enemy, this.objects, this.inactive)
      ) {
        const hit = resolveHit(this.player, enemy, this.objects, this.inactive);
        if (hit) {
          this.events.push({ type: 'hit', ...hit, hit });
          this.progress.bestCombo = Math.max(this.progress.bestCombo, hit.combo);
          if (enemy.hp <= 0) this.enemyDefeated(enemy);
        }
        const incoming = resolveHit(enemy, this.player, this.objects, this.inactive);
        if (incoming) this.events.push({ type: 'hit', ...incoming, hit: incoming });
      }
      if (this.player.hp <= 0) {
        this.progress.losses++;
        this.bossActive = false;
        this.emit('defeat', 'A bad feather day. Your eggs and upgrades are safe.');
        this.dirty = true;
        break;
      }
    }
    this.hitObjects(now);
    this.progress.world.x = this.player.x;
    this.progress.world.y = this.player.y;
  }
  private enemyDefeated(e: Enemy): void {
    e.attack = null;
    e.moving = false;
    this.progress.wins++;
    this.progress.stage++;
    if (e.kind === 'rookie') this.progress.world.rookies++;
    const amount =
      (e.kind === 'champion' && this.progress.world.champion ? 10 : ENEMIES[e.kind].reward) +
      e.bonusEggs;
    awardEggs(this.progress, amount);
    this.emit('egg', `+${amount} eggs`, e, amount);
    if (e.kind === 'champion') {
      this.progress.world.champion = true;
      this.bossActive = false;
      this.emit('victory', 'The Golden Comb is yours! The Roostlands salute you.');
    }
    this.dirty = true;
  }
  private hitObjects(now: number): void {
    const attack = this.player.attack;
    if (!attack) return;
    const cfg = ATTACKS[attack.kind];
    if (attack.time < cfg.windup || attack.time > cfg.windup + cfg.active) return;
    for (const object of this.objects) {
      if (
        !['dummy', 'crate'].includes(object.kind) ||
        attack.hits.has(object.id) ||
        !available(object, this.progress, now) ||
        !inAttackArc(this.player, object, object.radius)
      )
        continue;
      if (
        !lineOfSight(
          this.player,
          object,
          this.objects.filter((o) => o.id !== object.id),
          this.inactive,
        )
      )
        continue;
      attack.hits.add(object.id);
      const hit: HitEvent = {
        ...object,
        damage: Math.round(cfg.damage * this.player.power),
        blocked: false,
        kind: attack.kind,
        combo: 1,
        targetId: object.id,
      };
      this.events.push({ type: 'hit', ...hit, hit });
      if (object.kind === 'crate') {
        const amount = collectObject(object, this.progress, now);
        this.emit('egg', amount ? `+${amount} eggs` : 'Just packing straw!', object, amount);
        this.dirty = true;
      }
    }
  }
  nearest(now: number): WorldObject | null {
    return nearestInteraction(this.player, this.objects, this.progress, now);
  }
  interact(now: number): void {
    const o = this.nearest(now);
    if (!o) return;
    if (['nest', 'crate', 'stash'].includes(o.kind)) {
      if (!available(o, this.progress, now)) {
        this.emit(
          'notice',
          `Fresh eggs in ${Math.ceil((this.progress.world.objects[o.id] - now) / 1000)}s.`,
        );
        return;
      }
      const amount = collectObject(o, this.progress, now);
      this.emit('egg', amount ? `+${amount} eggs` : 'Just straw. The crate is cleared.', o, amount);
      this.dirty = true;
    } else if (o.kind === 'shop') this.emit('shop');
    else if (o.kind === 'bell') {
      if (this.bossActive) {
        this.emit('notice', 'The Champion is already waiting in the ring.');
        return;
      }
      const boss = this.enemies.find((e) => e.kind === 'champion')!;
      Object.assign(boss, createEnemy({ ...boss.home, id: 'champion', kind: 'champion' }));
      boss.active = true;
      boss.state = 'chase';
      this.bossActive = true;
      this.emit('notice', 'LORD CLUCKINGTON · Challenge begun!');
    } else {
      if (o.id === 'pip') {
        this.progress.world.talked = true;
        this.dirty = true;
      }
      this.emit('dialogue', `${o.label}|${o.dialogue}`);
    }
  }
  layEgg(now: number): boolean {
    const p = this.player;
    if (p.hp <= 0 || p.lay > 0 || p.attack || p.stun > 0) return false;
    if (!claimEgg(this.progress, now)) {
      this.emit('notice', 'Good eggs take time. Check the cooldown.');
      return false;
    }
    p.lay = 1.15;
    p.blocking = false;
    this.emit('egg', '+1 freshly laid egg', p, 1);
    this.dirty = true;
    return true;
  }
  buy(key: UpgradeKind): boolean {
    if (!purchase(this.progress, key)) return false;
    const stats = playerStats(this.progress);
    this.player.hp += stats.maxHp - this.player.maxHp;
    this.player.maxHp = stats.maxHp;
    this.player.maxStamina = stats.maxStamina;
    this.player.power = stats.power;
    this.dirty = true;
    return true;
  }
  respawn(): void {
    const stats = playerStats(this.progress);
    this.player = makeFighter(
      'player',
      SPAWN.x,
      SPAWN.y,
      stats.maxHp,
      stats.maxStamina,
      stats.power,
    );
    this.player.invulnerable = 2;
    this.zone = 'village';
    this.progress.world.x = SPAWN.x;
    this.progress.world.y = SPAWN.y;
    for (const e of this.enemies)
      Object.assign(e, createEnemy({ ...e.home, id: e.id, kind: e.kind }));
    this.bossActive = false;
    this.dirty = true;
  }
}
