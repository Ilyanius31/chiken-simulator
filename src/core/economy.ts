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
export function claimEgg(p: Progress, now: number): boolean {
  if (now < p.eggReadyAt) return false;
  p.eggs++;
  p.eggReadyAt = now + playerStats(p).eggCooldown * 1000;
  return true;
}
export function reward(
  win: boolean,
  seconds: number,
  healthRatio: number,
  enemyEggs: number,
): number {
  return win ? 3 + (seconds < 45 ? 1 : 0) + (healthRatio >= 0.65 ? 1 : 0) + enemyEggs : 0;
}
export function finishFight(
  p: Progress,
  win: boolean,
  seconds: number,
  healthRatio: number,
  enemyEggs: number,
  combo: number,
): number {
  const amount = reward(win, seconds, healthRatio, enemyEggs);
  p.eggs += amount;
  p.bestCombo = Math.max(p.bestCombo, combo);
  if (win) {
    p.wins++;
    p.stage++;
    p.unlocked = Math.min(3, Math.max(p.unlocked, p.stage + 1));
    p.bestTime = p.bestTime === null ? seconds : Math.min(p.bestTime, seconds);
  } else p.losses++;
  return amount;
}
