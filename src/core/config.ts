import { t } from '../localization';
export type AttackKind = 'peck' | 'wing' | 'kick';
export type UpgradeKind = 'attack' | 'health' | 'stamina' | 'production';
export const ATTACKS = {
  peck: {
    name: t.attacks.peck.name,
    damage: 9,
    cost: 9,
    cooldown: 0.42,
    windup: 0.12,
    active: 0.12,
    recovery: 0.13,
    range: 67,
    arc: 1.45,
    knockback: 16,
  },
  wing: {
    name: t.attacks.wing.name,
    damage: 17,
    cost: 19,
    cooldown: 0.95,
    windup: 0.23,
    active: 0.16,
    recovery: 0.24,
    range: 86,
    arc: 3.2,
    knockback: 65,
  },
  kick: {
    name: t.attacks.kick.name,
    damage: 32,
    cost: 31,
    cooldown: 1.95,
    windup: 0.48,
    active: 0.14,
    recovery: 0.36,
    range: 94,
    arc: 1.3,
    knockback: 110,
  },
} as const;
export const BALANCE = {
  health: 200,
  stamina: 100,
  speed: 220,
  regen: 23,
  blockDrain: 19,
  blockReduction: 0.78,
  radius: 20,
  maxStep: 1 / 60,
  comboWindow: 1.25,
  maxLevel: 5,
};
export const UPGRADES: Record<
  UpgradeKind,
  { title: string; description: string; icon: string; baseCost: number }
> = {
  attack: {
    title: t.upgrades.attack.title,
    description: t.upgrades.attack.description,
    icon: '✦',
    baseCost: 8,
  },
  health: {
    title: t.upgrades.health.title,
    description: t.upgrades.health.description,
    icon: '♥',
    baseCost: 8,
  },
  stamina: {
    title: t.upgrades.stamina.title,
    description: t.upgrades.stamina.description,
    icon: 'ϟ',
    baseCost: 8,
  },
  production: {
    title: t.upgrades.production.title,
    description: t.upgrades.production.description,
    icon: '◒',
    baseCost: 10,
  },
};
export type EnemyKind = 'rookie' | 'speedy' | 'bramble' | 'champion';
export const ENEMIES = {
  rookie: {
    name: t.enemies.rookie,
    hp: 48,
    speed: 123,
    power: 0.7,
    reward: 3,
    reaction: 0.85,
    color: '#e6a65a',
    tail: '#a16142',
    detection: 300,
  },
  speedy: {
    name: t.enemies.speedy,
    hp: 42,
    speed: 205,
    power: 0.75,
    reward: 4,
    reaction: 0.55,
    color: '#85c6cb',
    tail: '#406e96',
    detection: 320,
  },
  bramble: {
    name: t.enemies.bramble,
    hp: 82,
    speed: 135,
    power: 1.15,
    reward: 5,
    reaction: 0.8,
    color: '#b6b485',
    tail: '#626c4e',
    detection: 290,
  },
  champion: {
    name: t.enemies.champion,
    hp: 260,
    speed: 160,
    power: 1.3,
    reward: 25,
    reaction: 0.66,
    color: '#c8a1e9',
    tail: '#795794',
    detection: 560,
  },
} as const;
