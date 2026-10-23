import {
  ATTACKS,
  BALANCE,
  OPPONENTS,
  UPGRADES,
  type AttackKind,
  type UpgradeKind,
} from '../core/config';
import type { Fighter } from '../core/combat';
import { playerStats, upgradeCost } from '../core/economy';
import type { Progress } from '../core/save';
import { arrowIcon, eggIcon, featherIcon } from './icons';
export type Screen = 'menu' | 'fight' | 'results' | 'upgrades' | 'settings' | 'help';
export interface Result {
  win: boolean;
  reward: number;
  seconds: number;
  hp: number;
  combo: number;
  enemyEggs: number;
}
export class View {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  screen: Screen = 'menu';
  private content: HTMLElement;
  private overlay: HTMLElement;
  constructor(root: HTMLElement, onAction: (action: string) => void) {
    this.root = root;
    root.innerHTML = `<header class="topbar"><button class="brand" data-action="menu" aria-label="Main menu"><span class="brand-mark">${featherIcon}</span><span>CHICKEN<span class="brand-light"> SIMULATOR</span></span></button><span class="edition">THE PECKING ORDER <span> / </span> v0.1</span><nav><span class="wallet">${eggIcon}<b id="wallet">0</b><span> eggs</span></span><button class="icon-button" data-action="help" aria-label="How to play">?</button><button class="icon-button" data-action="settings" aria-label="Settings">⚙</button></nav></header><main id="stage"><canvas id="arena" aria-label="Animated chicken arena"></canvas><div id="content"></div><div id="overlay"></div></main><div id="toast" role="status"></div><div class="rotate-hint"><span>↻</span><b>A little more wing room</b><p>Rotate your phone to landscape to enter the arena.</p></div>`;
    this.canvas = root.querySelector('#arena')!;
    this.content = root.querySelector('#content')!;
    this.overlay = root.querySelector('#overlay')!;
    root.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (target && !(target instanceof HTMLButtonElement && target.disabled))
        onAction(target.dataset.action!);
    });
  }
  show(screen: Screen, p: Progress, result?: Result): void {
    this.screen = screen;
    this.root.dataset.screen = screen;
    this.overlay.innerHTML = '';
    const opponent = OPPONENTS[p.stage % 3];
    if (screen === 'menu')
      this.content.innerHTML = `<section class="hero"><div class="eyebrow"><span class="live-dot"></span> BIG DREAMS. SMALL WINGS.</div><h1>Rule the<br><em>roost.</em></h1><p>Step into the yard. Find your fighting spirit.<br>And yes, roosters lay eggs here.</p><div class="hero-actions"><button class="button primary" data-action="play">LET’S RUFFLE FEATHERS ${arrowIcon}</button><button class="button secondary" data-action="upgrades">${featherIcon} UPGRADES</button></div><button class="text-button" data-action="help"><span>ⓘ</span> First time in the yard? Learn the moves</button></section><div class="hero-caption"><span class="small-tag">MEET YOUR FIGHTER</span><b>Sir Clucks-a-Lot</b><span>100% feathers. 0% fear.</span></div><div class="menu-bottom"><div class="stat"><span>YOUR RECORD</span><b>${p.wins}<small> WINS</small><i> / </i>${p.losses}<small> LOSSES</small></b></div><div class="stat next-rival"><span>UP NEXT · ROUND ${p.stage + 1}</span><b>${opponent.name} ${arrowIcon}</b></div><button class="egg-card" data-action="egg"><span class="egg-card-icon">${eggIcon}</span><span><b>Make an egg. Make a living.</b><small id="menu-egg-label">One very questionable superpower.</small></span><span class="egg-pill" id="menu-egg-button">LAY EGG +1</span></button></div><span class="yard-label">BACKYARD ARENA <span>✦</span> EST. THIS MORNING</span>`;
    if (screen === 'fight')
      this.content.innerHTML = `<div class="fight-hud"><div class="fighter-status"><div class="fighter-label"><b>SIR CLUCKS-A-LOT</b><span id="player-hp-text"></span></div><div class="meter health"><i id="player-hp"></i></div><div class="meter stamina"><i id="player-stamina"></i></div><span class="stamina-label" id="stamina-text"></span></div><div class="round-info"><span>ROUND ${p.stage + 1}</span><b id="timer">00:00</b><button class="pause-button" data-action="pause" aria-label="Pause">Ⅱ</button></div><div class="fighter-status enemy-status"><div class="fighter-label"><b>${opponent.name.toUpperCase()}</b><span id="enemy-hp-text"></span></div><div class="meter enemy-health"><i id="enemy-hp"></i></div><span class="opponent-title">${opponent.title}</span></div></div><div class="fight-callout" id="fight-callout">READY? <em>RUFFLE!</em></div><div class="controls"><div class="movement"><button data-control="left" aria-label="Move left">←<small>A</small></button><button data-control="right" aria-label="Move right">→<small>D</small></button></div><button class="lay-button" data-action="egg">${eggIcon}<span id="egg-label">LAY EGG</span><small>V</small></button><div class="combat-buttons"><button data-control="block" class="block-control"><span>◈</span><b>BLOCK</b><small>SPACE</small></button>${(['peck', 'wing', 'kick'] as AttackKind[]).map((kind, i) => `<button data-control="${kind}" class="attack-control ${kind}"><span>${['➤', '≋', 'ϟ'][i]}</span><b>${['PECK', 'WING SLAP', 'POWER KICK'][i]}</b><small>${['J', 'K', 'L'][i]} · ${ATTACKS[kind].cost} SP</small><i class="cooldown-shade"></i></button>`).join('')}</div></div>`;
    if (screen === 'upgrades') {
      const stats = playerStats(p);
      this.content.innerHTML = `<section class="panel shop"><div class="panel-heading"><div><div class="eyebrow">A BETTER BIRD, ONE EGG AT A TIME</div><h2>The hen house<span>.</span></h2><p>A little investment. A lot of pecking potential.</p></div><button class="button secondary compact" data-action="menu">← BACK</button></div><div class="upgrade-grid">${(
        Object.keys(UPGRADES) as UpgradeKind[]
      )
        .map((key) => {
          const info = UPGRADES[key],
            level = p.upgrades[key],
            maxed = level >= BALANCE.maxLevel,
            cost = upgradeCost(p, key);
          return `<article class="upgrade-card"><span class="upgrade-icon ${key}">${info.icon}</span><span class="level">LEVEL ${level} / ${BALANCE.maxLevel}</span><h3>${info.title}</h3><p>${info.description}</p><div class="level-dots">${Array.from({ length: 5 }, (_, i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</div><button class="button ${p.eggs >= cost && !maxed ? 'primary' : 'secondary'} buy" data-action="buy:${key}" ${maxed || p.eggs < cost ? 'disabled' : ''}>${maxed ? 'MAX LEVEL' : `${eggIcon} ${cost} EGGS <span>UPGRADE +</span>`}</button></article>`;
        })
        .join(
          '',
        )}</div><div class="current-stats"><span>YOUR BIRD, CURRENTLY</span><b>${stats.maxHp} HP</b><b>${Math.round(stats.power * 100)}% POWER</b><b>${stats.maxStamina} STAMINA</b><b>${stats.eggCooldown}s / EGG</b></div></section>`;
    }
    if (screen === 'results' && result)
      this.content.innerHTML = `<section class="result-panel"><div class="eyebrow">${result.win ? 'ANOTHER DAY. ANOTHER FEATHER IN YOUR CAP.' : 'EVEN LEGENDS HAVE BAD FEATHER DAYS.'}</div><h2>${result.win ? 'Top of the <em>flock.</em>' : 'Well…<br><em>cluck.</em>'}</h2><p>${result.win ? 'The yard has a new champion. That’s you.' : 'Dust off those wings. Your upgrades are safe.'}</p><div class="result-stats"><span><small>REWARD</small><b>${eggIcon} +${result.reward}</b></span><span><small>FIGHT TIME</small><b>${result.seconds.toFixed(1)}s</b></span><span><small>BEST COMBO</small><b>${result.combo}×</b></span><span><small>HP LEFT</small><b>${Math.round(result.hp * 100)}%</b></span></div>${result.win ? `<p class="reward-detail">3 victory · ${result.seconds < 45 ? '1' : '0'} speed · ${result.hp >= 0.65 ? '1' : '0'} healthy · ${result.enemyEggs} rival eggs</p>` : ''}<div class="hero-actions"><button class="button primary" data-action="play">${result.win ? 'NEXT FIGHT' : 'TRY AGAIN'} ${arrowIcon}</button><button class="button secondary" data-action="upgrades">UPGRADES</button><button class="text-button" data-action="menu">Main menu</button></div></section>`;
    if (screen === 'settings')
      this.content.innerHTML = `<section class="panel small-panel"><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Yard rules<span>.</span></h2><div class="settings-row"><div><h3>Sound effects</h3><p>A little cluck goes a long way.</p></div><button class="toggle ${p.settings.sound ? 'on' : ''}" data-action="sound" role="switch" aria-checked="${p.settings.sound}" aria-label="Sound effects"><i></i></button></div><div class="settings-row"><div><h3>A fresh start</h3><p>Reset eggs, upgrades and your record.</p></div><button class="button danger compact" data-action="reset">RESET SAVE</button></div><button class="button primary" data-action="menu">BACK TO THE YARD ${arrowIcon}</button><p class="privacy-note">Saved on this browser. No account. No tracking.</p></section>`;
    if (screen === 'help')
      this.content.innerHTML = `<section class="panel help-panel"><div class="eyebrow">THE ART OF RUFFLING FEATHERS</div><h2>Know your moves<span>.</span></h2><div class="help-grid"><article><b>← → · MOVE</b><p>Left thumb moves. Right thumb fights.<br>Keyboard: A / D or arrow keys.</p></article><article><b>J · PECK</b><p>Quick and light. 8 base damage.<br>10 stamina · 0.46s cooldown.</p></article><article><b>K · WING SLAP</b><p>15 damage and a little personal space.<br>19 stamina · 0.95s cooldown.</p></article><article><b>L · POWER KICK</b><p>29 damage. Watch the windup!<br>34 stamina · 2.15s cooldown.</p></article><article><b>SPACE · HOLD BLOCK</b><p>Absorbs 78% of damage. Drains stamina.<br>Release to recover. Alternate hits for combos.</p></article><article><b>V · LAY EGG</b><p>One egg every 30 seconds. You’re vulnerable<br>while laying. Win fights to earn more.</p></article></div><p class="help-tip">Get close to land a hit. Back away to recover stamina. Escape pauses.</p><button class="button primary" data-action="menu">GOT IT. LET’S CLUCK. ${arrowIcon}</button></section>`;
    this.wallet(p);
  }
  wallet(p: Progress): void {
    this.root.querySelector('#wallet')!.textContent = String(p.eggs);
  }
  hud(player: Fighter, enemy: Fighter, seconds: number, p: Progress): void {
    const text = (id: string, value: string) => {
      const node = this.root.querySelector(`#${id}`);
      if (node) node.textContent = value;
    };
    const bar = (id: string, ratio: number) => {
      const node = this.root.querySelector<HTMLElement>(`#${id}`);
      if (node) node.style.width = `${Math.max(0, ratio * 100)}%`;
    };
    bar('player-hp', player.hp / player.maxHp);
    bar('enemy-hp', enemy.hp / enemy.maxHp);
    bar('player-stamina', player.stamina / player.maxStamina);
    text('player-hp-text', `${Math.ceil(player.hp)} / ${player.maxHp}`);
    text('enemy-hp-text', `${Math.ceil(enemy.hp)} / ${Math.round(enemy.maxHp)}`);
    text(
      'stamina-text',
      `${Math.floor(player.stamina)} SP${player.blockLock > 0 ? ' · GUARD RECOVERING' : ''}`,
    );
    text(
      'timer',
      `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}:${Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0')}`,
    );
    const callout = this.root.querySelector<HTMLElement>('#fight-callout');
    if (callout) callout.style.opacity = seconds < 1.5 ? '1' : '0';
    for (const kind of Object.keys(ATTACKS) as AttackKind[]) {
      const button = this.root.querySelector<HTMLElement>(`[data-control="${kind}"]`);
      if (button) {
        button.style.setProperty(
          '--cooldown',
          `${(player.cooldowns[kind] / ATTACKS[kind].cooldown) * 100}%`,
        );
        button.classList.toggle('tired', player.stamina < ATTACKS[kind].cost);
      }
    }
    this.eggTimer(p);
    this.wallet(p);
  }
  eggTimer(p: Progress): void {
    const left = Math.max(0, Math.ceil((p.eggReadyAt - Date.now()) / 1000));
    const label = this.root.querySelector('#egg-label');
    if (label) label.textContent = left ? `${left}s` : 'LAY EGG';
    const menu = this.root.querySelector('#menu-egg-button');
    if (menu) menu.textContent = left ? `READY IN ${left}s` : 'LAY EGG +1';
    this.root
      .querySelectorAll('[data-action="egg"]')
      .forEach((node) => node.classList.toggle('egg-wait', left > 0));
  }
  pause(confirmLeave = false): void {
    this.overlay.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div class="eyebrow">TAKE A BREATHER</div><h2 id="pause-title">${confirmLeave ? 'Leave the fight?' : 'On the perch.'}</h2><p>${confirmLeave ? 'This fight will count as a loss. Earned eggs and upgrades stay safe.' : 'Your feathers aren’t going anywhere.'}</p><button class="button primary" data-action="resume">RESUME FIGHT ${arrowIcon}</button><button class="button secondary" data-action="${confirmLeave ? 'forfeit' : 'leave'}">${confirmLeave ? 'LEAVE & KEEP PROGRESS' : 'BACK TO MENU'}</button></section></div>`;
    this.overlay.querySelector<HTMLButtonElement>('button')?.focus();
  }
  resetConfirm(): void {
    this.overlay.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><h2>Start from scratch?</h2><p>This removes all eggs, upgrades and your record from this browser.</p><button class="button danger" data-action="confirm-reset">YES, RESET EVERYTHING</button><button class="button secondary" data-action="cancel-reset">KEEP MY FLOCK</button></section></div>`;
    this.overlay.querySelector<HTMLButtonElement>('[data-action="cancel-reset"]')?.focus();
  }
  closeOverlay(): void {
    this.overlay.innerHTML = '';
  }
  toast(message: string): void {
    const node = this.root.querySelector<HTMLElement>('#toast')!;
    node.textContent = message;
    node.classList.remove('visible');
    void node.offsetWidth;
    node.classList.add('visible');
  }
}
