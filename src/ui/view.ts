import { t } from '../localization';
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
    root.innerHTML = `<canvas id="world" aria-label="${t.hud.worldCanvas}"></canvas><div class="vignette"></div><div id="hud"><div class="player-card"><div class="portrait">${featherIcon}</div><div class="vitals"><div class="player-name">${t.game.hero} <span id="hp-label"></span></div><div class="bar hp" role="meter" aria-label="${t.hud.health}"><i id="hp-fill"></i></div><div class="bar stamina" role="meter" aria-label="${t.hud.stamina}"><i id="stamina-fill"></i></div></div><div class="egg-wallet" aria-label="${t.hud.eggs}">${eggIcon}<b id="eggs">0</b></div></div><div class="location"><span class="location-kicker">${t.game.world}</span><h2 id="zone-name">${t.zones.village.name}</h2><button id="objective" data-action="map" aria-label="${t.actions.objectives}"></button></div><div class="map-corner"><button class="map-button" data-action="map" aria-label="${t.actions.openMap}"><canvas class="minimap" width="240" height="180"></canvas><span>${t.actions.map} <kbd>M</kbd></span></button><button class="pause-button" data-action="pause" aria-label="${t.actions.pause}">Ⅱ</button></div><div id="boss-bar" hidden><span>${t.game.champion}</span><div class="bar boss"><i></i></div></div></div><div id="controls"><div class="joystick-wrap"><div class="joystick" data-control="joystick" role="group" aria-label="${t.actions.joystick}"><span class="stick-guide">✥</span><span class="stick-knob"></span></div><small>${t.actions.move} <kbd>W A S D</kbd></small></div><div class="actions"><div class="utility-row"><button class="utility egg-ability" data-action="egg" aria-label="${t.actions.lay}">${eggIcon}<span id="egg-cooldown">${t.actions.lay}</span><kbd>V</kbd></button><button class="utility interact" data-action="interact" aria-label="${t.actions.interact}"><span>✋</span><b>${t.actions.interactShort}</b><kbd>E</kbd></button></div><div class="attack-row"><button class="ability block" data-control="block" aria-label="${t.actions.block}"><span>◈</span><b>${t.actions.block}</b><kbd>${t.actions.space}</kbd></button>${(['peck', 'wing', 'kick'] as AttackKind[]).map((kind, i) => `<button class="ability ${kind}" data-control="${kind}" aria-label="${ATTACKS[kind].name}" title="${t.attacks[kind].description}"><span>${['➤', '≋', 'ϟ'][i]}</span><b>${t.attacks[kind].short}</b><kbd>${['J', 'K', 'L'][i]}</kbd><i class="cooldown-cover"></i></button>`).join('')}</div></div><div id="interaction-prompt"></div></div><div id="overlay"></div><div id="toast" role="status"></div><div class="rotate-prompt"><span>↻</span><h2>${t.hud.rotationTitle}</h2><p>${t.hud.rotationBody}</p></div>`;
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
    const close = `<button class="close-button" data-action="resume" aria-label="${t.actions.close}">×</button>`;
    if (overlay === 'menu')
      html = `<div class="menu-scene"><div class="game-logo">${featherIcon}<span>${t.game.title}<small>${t.game.tagline}</small></span></div><div class="title-card"><div class="tag">${t.game.explore}</div><h1>${t.game.titleFirst}<br><em>${t.game.titleSecond}</em></h1><p>${t.game.intro}</p><button class="big-play" data-action="play">${p.world.visited.length > 1 ? t.actions.continue : t.actions.play} ${arrowIcon}</button><div class="menu-links"><button data-action="help">${t.actions.guide}</button><span>✦</span><button data-action="settings">${t.actions.settings}</button></div><div class="save-note">${eggIcon} ${t.hud.eggCount(p.eggs)} <span>·</span> ${t.menu.defeats(p.wins)} <span>·</span> ${t.menu.saved}</div></div><div class="world-stamp"><span>01 — 04</span> ${t.game.worldStamp}<br><small>${t.game.zoneList}</small></div></div>`;
    if (overlay === 'pause')
      html = `<section class="modal compact-modal">${close}<div class="tag">${t.pause.tag}</div><h2>${t.pause.title}</h2><p>${t.pause.body}</p><button class="button primary" data-action="resume">${t.actions.resume} ${arrowIcon}</button><div class="two-buttons"><button class="button" data-action="help">${t.actions.guide}</button><button class="button" data-action="settings">${t.actions.settings}</button></div><button class="text-button" data-action="menu">${t.actions.menu}</button></section>`;
    if (overlay === 'shop') {
      const stats = playerStats(p);
      html = `<section class="modal shop-modal">${close}<div class="panel-heading"><div><div class="tag">${t.shop.tag}</div><h2>${t.objects.shop}</h2><p>${t.shop.intro}</p></div><span class="shop-wallet">${eggIcon}<b>${p.eggs}</b></span></div><div class="upgrade-grid">${(
        Object.keys(UPGRADES) as UpgradeKind[]
      )
        .map((key) => {
          const u = UPGRADES[key],
            lv = p.upgrades[key],
            cost = upgradeCost(p, key);
          return `<article class="upgrade-card"><div class="upgrade-top"><span class="upgrade-symbol ${key}">${u.icon}</span><small>${t.shop.level(lv)}</small></div><h3>${u.title}</h3><p>${u.description}</p><div class="level-dots">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < lv ? 'filled' : ''}"></i>`).join('')}</div><button class="button buy" data-action="buy:${key}" ${lv >= 5 || p.eggs < cost ? 'disabled' : ''}>${lv >= 5 ? t.shop.maxed : `${eggIcon} ${t.hud.eggCount(cost)} <span>${t.shop.buy}</span>`}</button></article>`;
        })
        .join(
          '',
        )}</div><div class="stats-strip"><b>${t.shop.health(stats.maxHp)}</b><b>${t.shop.power(Math.round(stats.power * 100))}</b><b>${t.shop.stamina(stats.maxStamina)}</b><b>${t.shop.production(stats.eggCooldown)}</b></div></section>`;
    }
    if (overlay === 'settings')
      html = `<section class="modal compact-modal">${close}<div class="tag">${t.settings.tag}</div><h2>${t.settings.title}</h2><div class="settings-row"><div><b>${t.settings.sound}</b><p>${t.settings.soundBody}</p></div><button class="toggle ${p.settings.sound ? 'on' : ''}" data-action="sound" role="switch" aria-label="${t.settings.sound}" aria-checked="${p.settings.sound}"><i></i></button></div><div class="settings-row"><div><b>${t.settings.fresh}</b><p>${t.settings.freshBody}</p></div><button class="button danger" data-action="reset">${t.actions.reset}</button></div><button class="button primary" data-action="resume">${t.actions.done}</button></section>`;
    if (overlay === 'reset')
      html = `<section class="modal compact-modal"><h2>${t.settings.resetTitle}</h2><p>${t.settings.resetBody}</p><button class="button danger" data-action="confirm-reset">${t.actions.resetConfirm}</button><button class="button primary" data-action="settings">${t.actions.resetCancel}</button></section>`;
    if (overlay === 'help')
      html = `<section class="modal guide-modal">${close}<div class="tag">${t.guide.tag}</div><h2>${t.guide.title}</h2><div class="guide-grid">${t.guide.sections.map((section) => `<article><b>${section.title}</b><p>${section.body}</p></article>`).join('')}</div><button class="button primary" data-action="resume">${t.actions.understood}</button></section>`;
    if (overlay === 'map')
      html = `<section class="modal atlas-modal">${close}<div class="tag">${t.atlas.tag}</div><h2>${t.game.world}</h2><div class="atlas-layout"><div class="atlas-map"><canvas class="minimap" width="640" height="480"></canvas><span class="zone-label village">${t.zones.village.name}</span><span class="zone-label fields">${t.zones.fields.name}</span><span class="zone-label forest">${t.zones.forest.name}</span><span class="zone-label arena">${t.zones.arena.name}</span></div><div class="objectives-list"><h3>${t.atlas.adventure}</h3>${objectives(
        p,
      )
        .map(
          (o) =>
            `<p class="${o.done ? 'done' : ''}"><span>${o.done ? '✓' : '○'}</span>${o.label}</p>`,
        )
        .join(
          '',
        )}<small>${t.atlas.legend}<br>${t.atlas.explored(p.world.visited.length)}</small></div></div></section>`;
    if (overlay === 'dialogue') {
      const [name, text] = detail.split('|');
      html = `<section class="modal dialogue-modal">${close}<div class="dialogue-avatar">${featherIcon}</div><div><div class="tag">${t.conversation.tag}</div><h2>${name}</h2><p>${text}</p><button class="button primary" data-action="resume">${t.actions.onMyWay} ${arrowIcon}</button></div></section>`;
    }
    if (overlay === 'defeat' || overlay === 'victory')
      html = `<section class="modal compact-modal result-modal"><div class="result-emblem">${overlay === 'victory' ? '♛' : '✦'}</div><div class="tag">${overlay === 'victory' ? t.result.victoryTag : t.result.defeatTag}</div><h2>${overlay === 'victory' ? t.result.victory : t.result.defeat}</h2><p>${detail}</p><div class="result-eggs">${eggIcon} ${t.result.wallet(p.eggs)}</div><button class="button primary" data-action="${overlay === 'defeat' ? 'respawn' : 'resume'}">${overlay === 'defeat' ? t.actions.respawn : t.actions.keepExploring} ${arrowIcon}</button></section>`;
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
    for (const [selector, value, max] of [
      ['.bar.hp', p.hp, p.maxHp],
      ['.bar.stamina', p.stamina, p.maxStamina],
    ] as const) {
      const meter = this.root.querySelector(selector)!;
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', String(max));
      meter.setAttribute('aria-valuenow', String(Math.ceil(value)));
    }
    text('zone-name', ZONES.find((z) => z.id === world.zone)!.name);
    this.root.querySelector<HTMLElement>('#hp-fill')!.style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.root.querySelector<HTMLElement>('#stamina-fill')!.style.width =
      `${(p.stamina / p.maxStamina) * 100}%`;
    const objective = objectives(progress).find((o) => !o.done);
    text('objective', objective ? `◇ ${objective.label}` : t.objectives.completed);
    const eggLeft = Math.max(0, Math.ceil((progress.eggReadyAt - Date.now()) / 1000));
    text('egg-cooldown', eggLeft ? t.hud.seconds(eggLeft) : t.actions.lay);
    this.root.querySelector('.egg-ability')!.classList.toggle('waiting', eggLeft > 0);
    for (const kind of Object.keys(ATTACKS) as AttackKind[]) {
      const b = this.root.querySelector<HTMLElement>(`[data-control="${kind}"]`)!;
      b.style.setProperty('--cooldown', `${(p.cooldowns[kind] / ATTACKS[kind].cooldown) * 100}%`);
      b.classList.toggle('tired', p.stamina < ATTACKS[kind].cost);
    }
    const nearby = world.nearest(Date.now());
    text('interaction-prompt', nearby ? t.hud.interaction(nearby.label ?? '') : '');
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
