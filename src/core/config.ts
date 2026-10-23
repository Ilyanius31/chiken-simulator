export type AttackKind = 'peck' | 'wing' | 'kick';
export type UpgradeKind = 'attack' | 'health' | 'stamina' | 'production';
export const ATTACKS = {
  peck: { name: 'Peck', damage: 8, cost: 10, cooldown: .46, windup: .13, active: .1, recovery: .16, range: 148, knockback: 16 },
  wing: { name: 'Wing slap', damage: 15, cost: 19, cooldown: .95, windup: .25, active: .12, recovery: .28, range: 164, knockback: 52 },
  kick: { name: 'Power kick', damage: 29, cost: 34, cooldown: 2.15, windup: .53, active: .12, recovery: .48, range: 182, knockback: 94 },
} as const;
export const BALANCE = { health: 200, stamina: 100, speed: 235, regen: 19, blockDrain: 22, blockReduction: .78, radius: 44, arenaWidth: 1200, maxStep: 1 / 30, comboWindow: 1.35, maxLevel: 5 };
export const UPGRADES: Record<UpgradeKind, { title: string; description: string; icon: string; baseCost: number }> = {
  attack: { title: 'Attack power', description: '+10% damage per level. Make every peck count.', icon: '✦', baseCost: 8 },
  health: { title: 'Max health', description: '+25 HP per level. A little more fluff, a lot more fight.', icon: '♥', baseCost: 8 },
  stamina: { title: 'Stamina', description: '+15 stamina per level. Keep those wings swinging.', icon: 'ϟ', baseCost: 8 },
  production: { title: 'Egg production', description: '4 seconds less per level. Biology is just a suggestion.', icon: '◒', baseCost: 10 },
};
export const OPPONENTS = [
  { name: 'Rookie Rooster', title: 'The backyard beginner', color: '#c77b43', dark: '#78503c', comb: 3, scale: .93, hp: 180, speed: 155, power: .82, reaction: .78, block: .08 },
  { name: 'Speedy Rooster', title: 'Fast feet. Faster beak.', color: '#5e98a0', dark: '#285c6a', comb: 5, scale: .88, hp: 165, speed: 280, power: .9, reaction: .44, block: .12 },
  { name: 'Champion Rooster', title: 'The reigning egg-end', color: '#9368ac', dark: '#493e70', comb: 4, scale: 1.1, hp: 235, speed: 205, power: 1.12, reaction: .6, block: .32 },
] as const;
