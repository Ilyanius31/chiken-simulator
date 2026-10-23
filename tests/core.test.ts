import { describe, expect, it } from 'vitest';
import { ATTACKS } from '../src/core/config';
import { createCombat, damageFor, endAttack, makeFighter, outcome, resolveHit, separate, setBlock, startAttack, updateFighter } from '../src/core/combat';
import { claimEgg, finishFight, playerStats, purchase, reward, upgradeCost } from '../src/core/economy';
import { freshProgress, SAVE_KEY, SaveStore, validateProgress, type StorageLike } from '../src/core/save';
import { RoosterAI } from '../src/core/ai';
const fighter = (x = 300) => makeFighter(x, 200, 100, 1, 235, x < 400 ? 1 : -1);
const storage = (): StorageLike & { data: Map<string,string> } => { const data = new Map<string,string>(); return { data, getItem: key => data.get(key) ?? null, setItem: (key,value) => {data.set(key,value);}, removeItem: key => {data.delete(key);} }; };
describe('Combat rules', () => {
  it('balances damage, block reduction, upgrades and bounded mixed combos', () => {
    expect(damageFor('peck',1,false)).toBe(8);
    expect(damageFor('kick',1,false)).toBe(29);
    expect(damageFor('kick',1,true)).toBe(6);
    expect(damageFor('wing',1.5,false,3)).toBe(27);
    expect(damageFor('wing',1,false,99)).toBe(damageFor('wing',1,false,4));
  });
  it('requires a readable windup, range, and one hit per attack', () => {
    const a = fighter(), b = fighter(430);
    startAttack(a,'peck'); expect(resolveHit(a,b,true)).toBeNull();
    updateFighter(a,.14); expect(resolveHit(a,b,true)?.damage).toBe(8); expect(b.hp).toBe(192);
    b.invulnerable = 0; expect(resolveHit(a,b,true)).toBeNull();
    const distant = fighter(800); a.attack!.hit = false; expect(resolveHit(a,distant,true)).toBeNull();
  });
  it('invulnerability prevents overlapping attacks from damaging twice', () => {
    const a = fighter(), b = fighter(430); startAttack(a,'wing'); updateFighter(a,.26); b.invulnerable = .1;
    expect(resolveHit(a,b,true)).toBeNull(); expect(b.hp).toBe(200);
  });
  it('honors individual cooldowns and the entire recovery window', () => {
    const a = fighter(); expect(startAttack(a,'kick')).toBe(true); expect(startAttack(a,'peck')).toBe(false);
    updateFighter(a,1.2); endAttack(a); expect(a.attack).toBeNull(); expect(startAttack(a,'kick')).toBe(false);
    updateFighter(a,1); expect(startAttack(a,'kick')).toBe(true);
  });
  it('cannot attack while blocking, laying, stunned, exhausted or defeated', () => {
    for (const state of ['block','lay','stun','tired','dead']) {
      const a = fighter(); if (state === 'block') setBlock(a,true); if (state === 'lay') a.lay = 1; if (state === 'stun') a.stun = 1; if (state === 'tired') a.stamina = 9; if (state === 'dead') a.hp = 0;
      expect(startAttack(a,'peck')).toBe(false);
    }
  });
  it('drains block stamina, breaks guard and caps regeneration', () => {
    const a = fighter(); a.stamina = 5; setBlock(a,true); updateFighter(a,.1);
    expect(a.blocking).toBe(false); expect(a.blockLock).toBeGreaterThan(0); expect(a.stamina).toBeGreaterThanOrEqual(0);
    setBlock(a,true); expect(a.blocking).toBe(false); updateFighter(a,100); expect(a.stamina).toBe(a.maxStamina);
  });
  it('reduces blocked damage and applies kick knockback with boundaries', () => {
    const a = fighter(), b = fighter(430); setBlock(b,true); startAttack(a,'kick'); updateFighter(a,.54);
    const hit = resolveHit(a,b,true); expect(hit?.blocked).toBe(true); expect(b.hp).toBe(194); expect(b.x).toBeGreaterThan(430);
  });
  it('keeps characters ordered and separated, including at both walls', () => {
    for (const [x,y] of [[300,301],[1130,1130],[70,70],[800,200]]) { const a = fighter(x),b = fighter(y); separate(a,b); expect(b.x-a.x).toBeGreaterThanOrEqual(88); expect(a.x).toBeGreaterThanOrEqual(70); expect(b.x).toBeLessThanOrEqual(1130); }
  });
  it('detects victory, defeat and simultaneous KO deterministically', () => {
    const a = fighter(), b = fighter(430); expect(outcome(a,b)).toBeNull(); b.hp = 0; expect(outcome(a,b)).toBe('win'); a.hp = 0; expect(outcome(a,b)).toBe('loss');
  });
  it('increments combos only for connected alternating attacks', () => {
    const a = fighter(), b = fighter(430); startAttack(a,'peck'); updateFighter(a,.14); resolveHit(a,b,true);
    a.attack = null; b.invulnerable = 0; b.x = 430; startAttack(a,'wing'); updateFighter(a,.26);
    expect(resolveHit(a,b,true)?.combo).toBe(2);
    updateFighter(a,2); expect(a.combo).toBe(0);
  });
  it('cycles opponents and scales each circuit gently', () => {
    const p = freshProgress(); const base = createCombat(p); p.stage = 3; const next = createCombat(p);
    expect(next.enemy.maxHp / base.enemy.maxHp).toBeCloseTo(1.08); p.upgrades.health = 2; expect(createCombat(p).player.maxHp).toBe(250);
  });
});
describe('Economy and progression', () => {
  it('claims exactly one egg per real-time cooldown', () => {
    const p = freshProgress(); expect(claimEgg(p,1000)).toBe(true); expect(p.eggs).toBe(1); expect(claimEgg(p,30_999)).toBe(false); expect(claimEgg(p,31_000)).toBe(true); expect(p.eggs).toBe(2);
  });
  it('production upgrades reduce the next cooldown without negative values', () => {
    const p = freshProgress(); p.upgrades.production = 5; claimEgg(p,1000); expect(p.eggReadyAt).toBe(11_000); expect(playerStats(p).eggCooldown).toBe(10);
  });
  it('purchases atomically, raises prices, applies stats and limits levels', () => {
    const p = freshProgress(); expect(purchase(p,'attack')).toBe(false); expect(p.eggs).toBe(0);
    p.eggs = 8; expect(purchase(p,'attack')).toBe(true); expect(p.eggs).toBe(0); expect(playerStats(p).power).toBe(1.1); expect(upgradeCost(p,'attack')).toBeGreaterThan(8);
    p.upgrades.attack = 5; p.eggs = 999; expect(purchase(p,'attack')).toBe(false); expect(p.eggs).toBe(999);
  });
  it('awards victory, speed, health and rival eggs; losses keep progression', () => {
    expect(reward(true,30,.8,2)).toBe(7); expect(reward(true,60,.3,0)).toBe(3); expect(reward(false,20,0,5)).toBe(0);
    const p = freshProgress(); p.upgrades.attack = 1; expect(finishFight(p,true,40,.7,1,3)).toBe(6); expect(p.stage).toBe(1); expect(p.unlocked).toBe(2); expect(p.bestTime).toBe(40);
    finishFight(p,false,50,0,0,1); expect(p.losses).toBe(1); expect(p.eggs).toBe(6); expect(p.upgrades.attack).toBe(1); expect(p.bestCombo).toBe(3);
  });
});
describe('Durable versioned saves', () => {
  it('round trips eggs, upgrades, results and settings', () => {
    const mem = storage(), store = new SaveStore(mem), p = freshProgress(); p.eggs = 19; p.upgrades.stamina = 3; p.settings.sound = false; p.wins = 2; p.bestTime = 35.4;
    expect(store.save(p)).toBe(true); expect(store.load()).toEqual(p);
  });
  it('repairs individual invalid fields while preserving valid progress', () => {
    const p = validateProgress({ eggs: 22, wins: 9, losses: -8, bestTime: 'oops', upgrades: {attack: 300, health: -1, stamina: 2}, settings: {sound:false} });
    expect(p.eggs).toBe(22); expect(p.wins).toBe(9); expect(p.losses).toBe(0); expect(p.upgrades.attack).toBe(5); expect(p.upgrades.stamina).toBe(2); expect(p.bestTime).toBeNull(); expect(p.settings.sound).toBe(false);
  });
  it('recovers a healthy backup after JSON corruption', () => {
    const mem = storage(), store = new SaveStore(mem), p = freshProgress(); p.eggs = 8; store.save(p); p.eggs = 9; store.save(p);
    mem.setItem(SAVE_KEY,'{broken'); expect(store.load().eggs).toBe(8); expect(store.warning).toBeTruthy();
  });
  it('uses safe defaults with no save and handles denied storage', () => {
    expect(new SaveStore(storage()).load()).toEqual(freshProgress());
    const denied = new SaveStore({getItem:()=>{throw Error();},setItem:()=>{throw Error();},removeItem:()=>{throw Error();}});
    expect(denied.load().eggs).toBe(0); expect(denied.save(freshProgress())).toBe(false); expect(denied.reset().eggs).toBe(0);
  });
  it('does not overwrite future save versions; explicit reset clears backups', () => {
    const mem = storage(); mem.setItem(SAVE_KEY,JSON.stringify({version:2,eggs:500})); const store = new SaveStore(mem); store.load(); expect(store.save(freshProgress())).toBe(false); expect(JSON.parse(mem.getItem(SAVE_KEY)!).eggs).toBe(500);
    store.reset(); expect(store.load().eggs).toBe(0); expect(mem.getItem(`${SAVE_KEY}:backup`)).toBeNull();
  });
});
describe('AI and complete combat simulations', () => {
  it('approaches, reacts with delays, and obeys attack resource rules', () => {
    const ai = new RoosterAI(0,()=>.5), a = fighter(800), b = fighter(300); ai.update(a,b,.1); expect(a.move).toBe(-1); expect(a.attack).toBeNull();
    a.x=430; ai.update(a,b,1); expect(a.attack?.kind).toBe('peck'); expect(a.stamina).toBe(90);
    const previous=a.attack; ai.update(a,b,.1); expect(a.attack).toBe(previous);
  });
  it('finishes every matchup without a soft lock and lets a starter defeat Rookie', () => {
    for (let index=0;index<3;index++) {
      const p = freshProgress(); p.stage=index; const {player:a,enemy:b} = createCombat(p); let seed=42;
      const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const ai=new RoosterAI(index,random); let seconds=0;
      while(!outcome(a,b) && seconds<100) {
        const dt=1/60; seconds+=dt; a.move=1;
        if (Math.abs(a.x-b.x)<148) startAttack(a,'peck');
        ai.update(b,a,dt); updateFighter(a,dt); updateFighter(b,dt); separate(a,b); resolveHit(a,b,true); resolveHit(b,a,false); separate(a,b); endAttack(a); endAttack(b);
      }
      expect(outcome(a,b)).not.toBeNull(); expect(seconds).toBeLessThan(100);
      if(index===0) expect(outcome(a,b)).toBe('win');
    }
  });
  it('keeps attack definitions valid and more powerful strikes more expensive', () => {
    expect(ATTACKS.kick.cost).toBeGreaterThan(ATTACKS.wing.cost); expect(ATTACKS.kick.cooldown).toBeGreaterThan(ATTACKS.peck.cooldown);
  });
});
