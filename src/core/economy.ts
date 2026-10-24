import { BALANCE, UPGRADES, type UpgradeKind } from './config';
import type { Progress } from './save';
export const playerStats = (p: Progress) => ({
  maxHp: BALANCE.health + p.upgrades.health * 25,
  maxStamina: BALANCE.stamina + p.upgrades.stamina * 15,
  power: 1 + p.upgrades.attack * 0.1,
  eggCooldown: 30 - p.upgrades.production * 4,
});
export const upgradeCost = (p: Progress, key: UpgradeKind) =>
  Math.ceil(UPGRADES[key].baseCost * 1.65 ** p.upgrades[key]);
export function purchase(p: Progress, key: UpgradeKind): boolean {
  const price = upgradeCost(p, key);
  if (p.upgrades[key] >= BALANCE.maxLevel || p.eggs < price) return false;
  p.eggs -= price;
  p.upgrades[key]++;
  return true;
}
export function awardEggs(p: Progress, amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) return;
  p.eggs += amount;
  p.world.earned += amount;
}
export function claimEgg(p: Progress, now: number): boolean {
  if (now < p.eggReadyAt) return false;
  awardEggs(p, 1);
  p.eggReadyAt = now + playerStats(p).eggCooldown * 1000;
  return true;
}
