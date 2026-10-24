import { ATTACKS, UPGRADES, type AttackKind, type UpgradeKind } from '../core/config';
import { playerStats, upgradeCost } from '../core/economy';
import type { Progress } from '../core/save';
import { objectives } from '../world/interactions';
import { ZONES } from '../world/map';
import type { WorldSimulation } from '../world/simulation';
import { eggIcon, featherIcon, arrowIcon } from './icons';
export type Overlay =
  | 'none'
  | 'menu'
  | 'pause'
  | 'shop'
  | 'settings'
  | 'help'
  | 'map'
  | 'dialogue'
  | 'defeat'
  | 'victory'
  | 'reset';
export class View {
  canvas: HTMLCanvasElement;
  overlay: Overlay = 'menu';
  private panel: HTMLElement;
  constructor(
    public root: HTMLElement,
    onAction: (action: string) => void,
  ) {
    root.innerHTML = `<canvas id="world" aria-label="Top-down Roostlands world"></canvas><div class="vignette"></div><div id="hud"><div class="player-card"><div class="portrait">${featherIcon}</div><div class="vitals"><div class="player-name">SIR CLUCKS-A-LOT <span id="hp-label"></span></div><div class="bar hp"><i id="hp-fill"></i></div><div class="bar stamina"><i id="stamina-fill"></i></div></div><div class="egg-wallet">${eggIcon}<b id="eggs">0</b></div></div><div class="location"><span class="location-kicker">THE ROOSTLANDS</span><h2 id="zone-name">Chicken Village</h2><button id="objective" data-action="map" aria-label="Objectives and world map"></button></div><div class="map-corner"><button class="map-button" data-action="map" aria-label="Open world map"><canvas class="minimap" width="240" height="180"></canvas><span>MAP <kbd>M</kbd></span></button><button class="pause-button" data-action="pause" aria-label="Pause game">Ⅱ</button></div><div id="boss-bar" hidden><span>LORD CLUCKINGTON</span><div class="bar boss"><i></i></div></div></div><div id="controls"><div class="joystick-wrap"><div class="joystick" data-control="joystick" role="group" aria-label="Movement joystick"><span class="stick-guide">✥</span><span class="stick-knob"></span></div><small>MOVE <kbd>W A S D</kbd></small></div><div class="actions"><div class="utility-row"><button class="utility egg-ability" data-action="egg" aria-label="Lay egg">${eggIcon}<span id="egg-cooldown">LAY EGG</span><kbd>V</kbd></button><button class="utility interact" data-action="interact" aria-label="Interact"><span>✋</span><b>INTERACT</b><kbd>E</kbd></button></div><div class="attack-row"><button class="ability block" data-control="block" aria-label="Block"><span>◈</span><b>BLOCK</b><kbd>SPACE</kbd></button>${(['peck', 'wing', 'kick'] as AttackKind[]).map((kind, i) => `<button class="ability ${kind}" data-control="${kind}" aria-label="${ATTACKS[kind].name}"><span>${['➤', '≋', 'ϟ'][i]}</span><b>${['PECK', 'WING', 'KICK'][i]}</b><kbd>${['J', 'K', 'L'][i]}</kbd><i class="cooldown-cover"></i></button>`).join('')}</div></div><div id="interaction-prompt"></div></div><div id="overlay"></div><div id="toast" role="status"></div><div class="rotate-prompt"><span>↻</span><h2>A wider world awaits.</h2><p>Turn your phone sideways to explore the Roostlands.</p></div>`;
    this.canvas = root.querySelector('#world')!;
    this.panel = root.querySelector('#overlay')!;
    root.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (target && !target.disabled) onAction(target.dataset.action!);
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  show(overlay: Overlay, p: Progress, detail = ''): void {
    this.overlay = overlay;
    this.root.dataset.overlay = overlay;
    this.root.dataset.playing = String(overlay !== 'menu');
    let html = '';
    const close =
      '<button class="close-button" data-action="resume" aria-label="Close panel">×</button>';
    if (overlay === 'menu')
      html = `<div class="menu-scene"><div class="game-logo">${featherIcon}<span>CHICKEN SIMULATOR<small>A VERY QUESTIONABLE ADVENTURE</small></span></div><div class="title-card"><div class="tag">EXPLORE THE ROOSTLANDS · v0.2</div><h1>Small wings.<br><em>Big world.</em></h1><p>Wander off the beaten path. Pick a fight.<br>Lay an egg. Become a backyard legend.</p><button class="big-play" data-action="play">${p.world.visited.length > 1 ? 'CONTINUE ADVENTURE' : 'ENTER THE ROOSTLANDS'} ${arrowIcon}</button><div class="menu-links"><button data-action="help">FIELD GUIDE</button><span>✦</span><button data-action="settings">SETTINGS</button></div><div class="save-note">${eggIcon} ${p.eggs} eggs <span>·</span> ${p.wins} rivals defeated <span>·</span> saved on this browser</div></div><div class="world-stamp"><span>01 — 04</span> A WHOLE LITTLE WORLD<br><small>Village · Fields · Forest · Arena</small></div></div>`;
    if (overlay === 'pause')
      html = `<section class="modal compact-modal">${close}<div class="tag">TAKE A BREATHER</div><h2>On the perch.</h2><p>The world can wait. Your progress is saved.</p><button class="button primary" data-action="resume">RESUME ADVENTURE ${arrowIcon}</button><div class="two-buttons"><button class="button" data-action="help">FIELD GUIDE</button><button class="button" data-action="settings">SETTINGS</button></div><button class="text-button" data-action="menu">SAVE & RETURN TO TITLE</button></section>`;
    if (overlay === 'shop') {
      const stats = playerStats(p);
      html = `<section class="modal shop-modal">${close}<div class="panel-heading"><div><div class="tag">CHICKEN VILLAGE · MARKETPLACE</div><h2>The Feather Forge</h2><p>Invest in yourself. Preferably with eggs.</p></div><span class="shop-wallet">${eggIcon}<b>${p.eggs}</b></span></div><div class="upgrade-grid">${(
        Object.keys(UPGRADES) as UpgradeKind[]
      )
        .map((key) => {
          const u = UPGRADES[key],
            lv = p.upgrades[key],
            cost = upgradeCost(p, key);
          return `<article class="upgrade-card"><div class="upgrade-top"><span class="upgrade-symbol ${key}">${u.icon}</span><small>LEVEL ${lv} / 5</small></div><h3>${u.title}</h3><p>${u.description}</p><div class="level-dots">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < lv ? 'filled' : ''}"></i>`).join('')}</div><button class="button buy" data-action="buy:${key}" ${lv >= 5 || p.eggs < cost ? 'disabled' : ''}>${lv >= 5 ? 'MAXED OUT' : `${eggIcon} ${cost} EGGS <span>UPGRADE</span>`}</button></article>`;
        })
        .join(
          '',
        )}</div><div class="stats-strip"><b>${stats.maxHp} HP</b><b>${Math.round(stats.power * 100)}% POWER</b><b>${stats.maxStamina} STAMINA</b><b>${stats.eggCooldown}s / EGG</b></div></section>`;
    }
    if (overlay === 'settings')
      html = `<section class="modal compact-modal">${close}<div class="tag">A LITTLE HOUSEKEEPING</div><h2>Yard rules.</h2><div class="settings-row"><div><b>Sound effects</b><p>Original clucks, thumps and little victories.</p></div><button class="toggle ${p.settings.sound ? 'on' : ''}" data-action="sound" role="switch" aria-label="Sound effects" aria-checked="${p.settings.sound}"><i></i></button></div><div class="settings-row"><div><b>A fresh nest</b><p>Reset all progress, including the old save.</p></div><button class="button danger" data-action="reset">RESET</button></div><button class="button primary" data-action="resume">DONE</button></section>`;
    if (overlay === 'reset')
      html = `<section class="modal compact-modal"><h2>Start from scratch?</h2><p>This erases your eggs, upgrades, exploration and legacy v0.1 save on this browser.</p><button class="button danger" data-action="confirm-reset">YES, RESET EVERYTHING</button><button class="button primary" data-action="settings">KEEP MY PROGRESS</button></section>`;
    if (overlay === 'help')
      html = `<section class="modal guide-modal">${close}<div class="tag">THE ART OF RUFFLING FEATHERS</div><h2>Your field guide.</h2><div class="guide-grid"><article><b>01 / WANDER</b><p>Left joystick: move in any direction.<br>Keyboard: WASD or arrow keys. Follow the paths and the golden minimap marker.</p></article><article><b>02 / RUFFLE</b><p>J: fast peck. K: wide wing slap.<br>L: heavy kick. Face your target. Alternate hits for combos. Red arcs warn of enemy attacks.</p></article><article><b>03 / SURVIVE</b><p>Hold Block / Space to absorb damage.<br>Release attacks to recover stamina. Keep moving to dodge. The village restores your health.</p></article><article><b>04 / INTERACT</b><p>Approach glowing objects. Tap Interact / E.<br>Collect nests, open crates, talk to Pip, practice on the dummy and visit the striped shop.</p></article><article><b>05 / MAKE A LIVING</b><p>Lay Egg / V: one egg every 30 seconds.<br>You’re vulnerable while laying. Spend eggs at the village shop; nests refill after a minute.</p></article><article><b>06 / BECOME A LEGEND</b><p>Explore the southern forest, then go east.<br>Ring the arena bell to challenge the Champion. Defeat never takes away your eggs.</p></article></div><button class="button primary" data-action="resume">GOT IT. LET’S CLUCK.</button></section>`;
    if (overlay === 'map')
      html = `<section class="modal atlas-modal">${close}<div class="tag">A SMALL WORLD. A BIG PECKING ORDER.</div><h2>The Roostlands</h2><div class="atlas-layout"><div class="atlas-map"><canvas class="minimap" width="640" height="480"></canvas><span class="zone-label village">CHICKEN VILLAGE</span><span class="zone-label fields">SUNNY FIELDS</span><span class="zone-label forest">DARK FOREST</span><span class="zone-label arena">CHAMPION’S ARENA</span></div><div class="objectives-list"><h3>YOUR ADVENTURE</h3>${objectives(
        p,
      )
        .map(
          (o) =>
            `<p class="${o.done ? 'done' : ''}"><span>${o.done ? '✓' : '○'}</span>${o.label}</p>`,
        )
        .join(
          '',
        )}<small>White dot: you · Gold dot: next objective<br>${p.world.visited.length} / 4 zones explored</small></div></div></section>`;
    if (overlay === 'dialogue') {
      const [name, text] = detail.split('|');
      html = `<section class="modal dialogue-modal">${close}<div class="dialogue-avatar">${featherIcon}</div><div><div class="tag">A WORD FROM THE YARD</div><h2>${name}</h2><p>${text}</p><button class="button primary" data-action="resume">ON MY WAY ${arrowIcon}</button></div></section>`;
    }
    if (overlay === 'defeat' || overlay === 'victory')
      html = `<section class="modal compact-modal result-modal"><div class="result-emblem">${overlay === 'victory' ? '♛' : '✦'}</div><div class="tag">${overlay === 'victory' ? 'GOLDEN COMB EARNED' : 'EVEN LEGENDS HAVE BAD FEATHER DAYS'}</div><h2>${overlay === 'victory' ? 'Top of the flock.' : 'Well… cluck.'}</h2><p>${detail}</p><div class="result-eggs">${eggIcon} ${p.eggs} eggs safely in your nest</div><button class="button primary" data-action="${overlay === 'defeat' ? 'respawn' : 'resume'}">${overlay === 'defeat' ? 'WAKE UP IN THE VILLAGE' : 'KEEP EXPLORING'} ${arrowIcon}</button></section>`;
    this.panel.innerHTML = html;
    this.panel
      .querySelector<HTMLButtonElement>('.primary,.big-play')
      ?.focus({ preventScroll: true });
  }
  hud(world: WorldSimulation): void {
    const p = world.player,
      progress = world.progress;
    this.canvas.dataset.player = JSON.stringify({
      x: p.x,
      y: p.y,
      hp: p.hp,
      stamina: p.stamina,
      angle: p.angle,
    });
    this.canvas.dataset.enemies = JSON.stringify(
      world.enemies
        .filter((e) => e.active)
        .map((e) => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, kind: e.kind })),
    );
    this.canvas.dataset.zone = world.zone;
    const text = (id: string, value: string) => {
      const el = this.root.querySelector('#' + id);
      if (el && el.textContent !== value) el.textContent = value;
    };
    text('hp-label', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    text('eggs', String(progress.eggs));
    text('zone-name', ZONES.find((z) => z.id === world.zone)!.name);
    this.root.querySelector<HTMLElement>('#hp-fill')!.style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.root.querySelector<HTMLElement>('#stamina-fill')!.style.width =
      `${(p.stamina / p.maxStamina) * 100}%`;
    const objective = objectives(progress).find((o) => !o.done);
    text('objective', objective ? `◇ ${objective.label}` : '♛ Golden Comb earned · Keep exploring');
    const eggLeft = Math.max(0, Math.ceil((progress.eggReadyAt - Date.now()) / 1000));
    text('egg-cooldown', eggLeft ? `${eggLeft}s` : 'LAY EGG');
    this.root.querySelector('.egg-ability')!.classList.toggle('waiting', eggLeft > 0);
    for (const kind of Object.keys(ATTACKS) as AttackKind[]) {
      const b = this.root.querySelector<HTMLElement>(`[data-control="${kind}"]`)!;
      b.style.setProperty('--cooldown', `${(p.cooldowns[kind] / ATTACKS[kind].cooldown) * 100}%`);
      b.classList.toggle('tired', p.stamina < ATTACKS[kind].cost);
    }
    const nearby = world.nearest(Date.now());
    text('interaction-prompt', nearby ? `${nearby.label}  ·  E / INTERACT` : '');
    this.root.querySelector<HTMLButtonElement>('[data-action="interact"]')!.disabled = !nearby;
    const boss = world.enemies.find((e) => e.kind === 'champion')!,
      bar = this.root.querySelector<HTMLElement>('#boss-bar')!;
    bar.hidden = !world.bossActive;
    bar.querySelector<HTMLElement>('i')!.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  }
  toast(message: string): void {
    const node = this.root.querySelector<HTMLElement>('#toast')!;
    node.textContent = message;
    node.classList.remove('visible');
    void node.offsetWidth;
    node.classList.add('visible');
  }
}
