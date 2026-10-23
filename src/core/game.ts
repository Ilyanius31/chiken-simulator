import { BALANCE, type AttackKind, type UpgradeKind } from './config';
import {
  createCombat,
  endAttack,
  makeFighter,
  outcome,
  resolveHit,
  separate,
  setBlock,
  startAttack,
  updateFighter,
  type Fighter,
} from './combat';
import { RoosterAI } from './ai';
import { claimEgg, finishFight, purchase } from './economy';
import { SaveStore, type Progress } from './save';
import { Input } from '../platform/input';
import { AudioManager } from '../platform/audio';
import { ArenaRenderer } from '../render/arena';
import { View, type Result, type Screen } from '../ui/view';
export class Game {
  private store: SaveStore;
  private progress: Progress;
  private view: View;
  private input: Input;
  private audio = new AudioManager();
  private renderer: ArenaRenderer;
  private player: Fighter = makeFighter(875, 200, 100, 1, 235, 1);
  private enemy: Fighter | null = null;
  private ai = new RoosterAI(0);
  private paused = false;
  private elapsed = 0;
  private animationTime = 0;
  private winner: 'win' | 'loss' | null = null;
  private resultDelay = 0;
  private enemyEggs = 0;
  private bestCombo = 0;
  private eggAnimations: { timer: number; x: number }[] = [];
  private result?: Result;
  private lastFrame = 0;
  private accumulator = 0;
  private hudClock = 0;
  constructor(root: HTMLElement) {
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      storage = {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage unavailable');
        },
        removeItem: () => {},
      } as unknown as Storage;
    }
    this.store = new SaveStore(storage);
    this.progress = this.store.load();
    this.audio.enabled = this.progress.settings.sound;
    this.view = new View(root, (action) => this.action(action));
    this.renderer = new ArenaRenderer(this.view.canvas);
    this.input = new Input(root, () => this.togglePause());
    root.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    window.addEventListener('keydown', (event) => {
      this.audio.unlock();
      if (
        event.code === 'KeyV' &&
        !event.repeat &&
        (this.view.screen === 'menu' || (this.view.screen === 'fight' && !this.paused))
      )
        this.layEgg();
    });
    window.addEventListener('blur', () => this.autoPause());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.autoPause();
        this.persist();
      }
    });
    window.addEventListener('pagehide', () => this.persist());
    window.addEventListener('resize', () => {
      if (window.innerHeight > window.innerWidth && window.innerWidth < 900) this.autoPause();
    });
    this.navigate('menu');
    if (this.store.warning) this.view.toast(this.store.warning);
    requestAnimationFrame((time) => this.frame(time));
  }
  private persist(): void {
    if (!this.store.save(this.progress) && this.store.warning) this.view.toast(this.store.warning);
  }
  private navigate(screen: Screen): void {
    this.input.clear();
    this.input.enabled = screen === 'fight' && !this.paused && !this.winner;
    if (screen !== 'fight') {
      this.enemy = null;
      this.player.move = 0;
      this.player.attack = null;
      this.player.blocking = false;
      this.player.hp = 200;
      this.player.x = screen === 'menu' ? 875 : 960;
    }
    this.view.show(screen, this.progress, this.result);
    this.view.eggTimer(this.progress);
  }
  private action(action: string): void {
    this.audio.unlock();
    this.audio.play('click');
    if (action === 'pause') {
      this.togglePause();
      return;
    }
    if (action === 'resume') {
      this.paused = false;
      this.input.clear();
      this.input.enabled = !this.winner;
      this.view.closeOverlay();
      this.lastFrame = 0;
      return;
    }
    if (action === 'leave') {
      this.view.pause(true);
      return;
    }
    if (action === 'forfeit') {
      if (!this.winner) {
        finishFight(this.progress, false, this.elapsed, 0, 0, this.bestCombo);
        this.persist();
      }
      this.paused = false;
      this.winner = null;
      this.navigate('menu');
      return;
    }
    if (this.view.screen === 'fight' && action !== 'egg') {
      this.autoPause();
      return;
    }
    if (action === 'play') {
      this.startFight();
      return;
    }
    if (action === 'egg') {
      this.layEgg();
      return;
    }
    if (action === 'sound') {
      this.progress.settings.sound = !this.progress.settings.sound;
      this.audio.enabled = this.progress.settings.sound;
      this.persist();
      this.navigate('settings');
      return;
    }
    if (action === 'reset') {
      this.view.resetConfirm();
      return;
    }
    if (action === 'cancel-reset') {
      this.view.closeOverlay();
      return;
    }
    if (action === 'confirm-reset') {
      this.progress = this.store.reset();
      this.audio.enabled = this.progress.settings.sound;
      this.navigate('settings');
      this.view.toast('A fresh nest. A fresh start.');
      return;
    }
    if (action.startsWith('buy:')) {
      const key = action.slice(4) as UpgradeKind;
      if (purchase(this.progress, key)) {
        this.persist();
        this.audio.play('buy');
        this.navigate('upgrades');
        this.view.toast('UPGRADED! Your bird just got better.');
      }
      return;
    }
    if (['menu', 'upgrades', 'settings', 'help'].includes(action)) this.navigate(action as Screen);
  }
  private startFight(): void {
    const fighters = createCombat(this.progress);
    this.player = fighters.player;
    this.enemy = fighters.enemy;
    this.ai = new RoosterAI(this.progress.stage % 3);
    this.elapsed = 0;
    this.winner = null;
    this.paused = false;
    this.resultDelay = 0;
    this.enemyEggs = 0;
    this.bestCombo = 0;
    this.eggAnimations = [];
    this.renderer.clear();
    this.navigate('fight');
    this.input.enabled = true;
    this.lastFrame = 0;
    this.accumulator = 0;
    this.view.hud(this.player, this.enemy, 0, this.progress);
    if (window.innerHeight > window.innerWidth && window.innerWidth < 900) this.autoPause();
  }
  private layEgg(): void {
    if (
      !['menu', 'fight'].includes(this.view.screen) ||
      this.paused ||
      (this.view.screen === 'fight' && this.winner) ||
      this.player.lay > 0 ||
      this.player.attack ||
      this.player.stun > 0
    )
      return;
    if (!claimEgg(this.progress, Date.now())) {
      this.view.toast('Good eggs take time. Let this one recharge.');
      return;
    }
    this.player.blocking = false;
    this.player.lay = 1.15;
    this.eggAnimations.push({ timer: 0.55, x: this.player.x });
    this.audio.play('egg');
    this.persist();
    this.view.wallet(this.progress);
    this.view.eggTimer(this.progress);
  }
  private togglePause(): void {
    if (this.view.screen !== 'fight' || this.winner) return;
    if (this.paused) this.action('resume');
    else this.autoPause();
  }
  private autoPause(): void {
    if (this.view.screen === 'fight' && !this.winner && !this.paused) {
      this.paused = true;
      this.input.enabled = false;
      this.input.clear();
      this.player.blocking = false;
      this.player.move = 0;
      this.view.pause();
    }
  }
  private update(dt: number): void {
    if (this.paused) return;
    for (const egg of this.eggAnimations) {
      egg.timer -= dt;
      if (egg.timer <= 0) this.renderer.egg(egg.x);
    }
    this.eggAnimations = this.eggAnimations.filter((egg) => egg.timer > 0);
    if (this.view.screen !== 'fight' || !this.enemy) {
      this.player.lay = Math.max(0, this.player.lay - dt);
      return;
    }
    if (this.winner) {
      this.resultDelay += dt;
      if (this.resultDelay > 1.35) this.navigate('results');
      return;
    }
    this.elapsed += dt;
    this.player.move = Number(this.input.down('right')) - Number(this.input.down('left'));
    setBlock(this.player, this.input.down('block'));
    for (const kind of ['kick', 'wing', 'peck'] as AttackKind[]) {
      const press = this.input.take(kind);
      if (press || this.input.down(kind)) startAttack(this.player, kind);
    }
    if (this.ai.update(this.enemy, this.player, dt)) {
      this.enemyEggs++;
      this.eggAnimations.push({ timer: 0.55, x: this.enemy.x });
    }
    updateFighter(this.player, dt);
    updateFighter(this.enemy, dt);
    separate(this.player, this.enemy);
    const first = resolveHit(this.player, this.enemy, true),
      second = resolveHit(this.enemy, this.player, false);
    for (const hit of [first, second])
      if (hit) {
        this.renderer.hit(hit);
        this.audio.play(hit.blocked ? 'block' : 'hit');
        if (hit.player) this.bestCombo = Math.max(this.bestCombo, hit.combo);
      }
    separate(this.player, this.enemy);
    endAttack(this.player);
    endAttack(this.enemy);
    this.winner = outcome(this.player, this.enemy);
    if (this.winner) {
      const win = this.winner === 'win',
        hp = this.player.hp / this.player.maxHp;
      const amount = finishFight(
        this.progress,
        win,
        this.elapsed,
        hp,
        this.enemyEggs,
        this.bestCombo,
      );
      this.result = {
        win,
        reward: amount,
        seconds: this.elapsed,
        hp,
        combo: this.bestCombo,
        enemyEggs: this.enemyEggs,
      };
      this.player.move = 0;
      this.enemy.move = 0;
      this.player.blocking = false;
      this.enemy.blocking = false;
      this.input.enabled = false;
      this.input.clear();
      this.persist();
      this.audio.play(win ? 'win' : 'loss');
    }
  }
  private frame(time: number): void {
    const elapsed = this.lastFrame ? Math.min(0.1, (time - this.lastFrame) / 1000) : 0;
    this.lastFrame = time;
    if (!this.paused) this.animationTime += elapsed;
    this.accumulator += elapsed;
    while (this.accumulator >= 1 / 60) {
      this.update(Math.min(BALANCE.maxStep, 1 / 60));
      this.accumulator -= 1 / 60;
    }
    const menu = this.view.screen !== 'fight';
    // Keep the defeated opponent's appearance while the next stage is already saved.
    const opponentIndex =
      this.winner === 'win' && !menu ? (this.progress.stage - 1) % 3 : this.progress.stage % 3;
    this.renderer.draw(
      this.player,
      this.enemy,
      opponentIndex,
      this.animationTime,
      this.paused ? 0 : elapsed,
      menu,
      this.view.screen === 'results' ? (this.result?.win ? 'win' : 'loss') : this.winner,
    );
    this.hudClock += elapsed;
    if (this.hudClock >= 0.06) {
      this.hudClock = 0;
      if (this.view.screen === 'fight' && this.enemy)
        this.view.hud(this.player, this.enemy, this.elapsed, this.progress);
      else this.view.eggTimer(this.progress);
    }
    requestAnimationFrame((next) => this.frame(next));
  }
}
