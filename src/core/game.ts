import { t } from '../localization';
import { SaveStore, type Progress, type StorageLike } from './save';
import type { AttackKind, UpgradeKind } from './config';
import { WorldSimulation } from '../world/simulation';
import { WorldRenderer } from '../render/world-renderer';
import { View, type Overlay } from '../ui/view';
import { Input } from '../platform/input';
import { AudioManager } from '../platform/audio';
import { ZONES } from '../world/map';
export class Game {
  private store: SaveStore;
  private progress: Progress;
  private world: WorldSimulation;
  private view: View;
  private renderer: WorldRenderer;
  private input: Input;
  private audio = new AudioManager();
  private last = 0;
  private accumulator = 0;
  private time = 0;
  private hudTimer = 0;
  private saveTimer = 0;
  private started = false;
  constructor(root: HTMLElement) {
    let storage: StorageLike;
    try {
      storage = localStorage;
    } catch {
      storage = {
        getItem: () => null,
        setItem: () => {
          throw Error('Storage blocked');
        },
        removeItem: () => {},
      };
    }
    this.store = new SaveStore(storage);
    this.progress = this.store.load();
    this.world = new WorldSimulation(this.progress);
    this.audio.enabled = this.progress.settings.sound;
    this.view = new View(root, (action) => this.action(action));
    this.renderer = new WorldRenderer(this.view.canvas);
    this.renderer.camera.follow(this.world.player, 0, true);
    this.input = new Input(
      root,
      () => this.pause(),
      () => this.action('interact'),
      () => this.action('egg'),
    );
    root.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    window.addEventListener('keydown', (e) => {
      this.audio.unlock();
      if (e.code === 'KeyM' && !e.repeat && this.started)
        this.action(this.view.overlay === 'map' ? 'resume' : 'map');
    });
    window.addEventListener('blur', () => {
      if (this.view.overlay === 'none') this.pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.view.overlay === 'none') this.pause();
        this.persist();
      }
    });
    window.addEventListener('pagehide', () => this.persist());
    window.addEventListener('resize', () => {
      if (innerHeight > innerWidth && innerWidth < 950 && this.view.overlay === 'none')
        this.pause();
    });
    this.open('menu');
    this.view.hud(this.world);
    if (this.store.warning) this.view.toast(this.store.warning);
    requestAnimationFrame((t) => this.frame(t));
  }
  private open(overlay: Overlay, detail = ''): void {
    this.input.clear();
    this.input.enabled = overlay === 'none';
    this.world.player.blocking = false;
    this.world.player.moving = false;
    this.view.show(overlay, this.progress, detail);
    this.persist();
  }
  private pause(): void {
    if (!this.started) return;
    if (this.view.overlay === 'none') this.open('pause');
    else if (['pause', 'map', 'help', 'settings'].includes(this.view.overlay)) this.open('none');
  }
  private action(action: string): void {
    this.audio.unlock();
    if (action !== 'egg' && action !== 'interact') this.audio.play('click');
    if (action === 'play') {
      this.started = true;
      this.open('none');
      if (innerHeight > innerWidth && innerWidth < 950) this.open('pause');
      return;
    }
    if (action === 'pause') {
      this.pause();
      return;
    }
    if (action === 'resume') {
      this.open(this.started ? 'none' : 'menu');
      return;
    }
    if (action === 'menu') {
      this.started = false;
      this.open('menu');
      return;
    }
    if (action === 'respawn') {
      this.world.respawn();
      this.renderer.camera.follow(this.world.player, 0, true);
      this.open('none');
      return;
    }
    if (action === 'interact' && this.view.overlay === 'none') {
      this.world.interact(Date.now());
      this.consumeEvents();
      return;
    }
    if (action === 'egg' && this.view.overlay === 'none') {
      this.world.layEgg(Date.now());
      this.consumeEvents();
      return;
    }
    if (action.startsWith('buy:') && this.view.overlay === 'shop') {
      if (this.world.buy(action.slice(4) as UpgradeKind)) {
        this.audio.play('buy');
        this.open('shop');
        this.view.toast(t.notices.upgrade);
      }
      return;
    }
    if (action === 'sound') {
      this.progress.settings.sound = !this.progress.settings.sound;
      this.audio.enabled = this.progress.settings.sound;
      this.open('settings');
      return;
    }
    if (action === 'confirm-reset') {
      this.progress = this.store.reset();
      this.world = new WorldSimulation(this.progress);
      this.renderer.camera.follow(this.world.player, 0, true);
      this.audio.enabled = this.progress.settings.sound;
      this.started = false;
      this.open('menu');
      return;
    }
    if (['help', 'settings', 'map', 'reset'].includes(action)) this.open(action as Overlay);
  }
  private consumeEvents(): void {
    for (const event of this.world.events) {
      this.renderer.event(event);
      if (event.type === 'hit') this.audio.play(event.hit?.blocked ? 'block' : 'hit');
      if (event.type === 'egg') {
        this.audio.play('egg');
        if (event.text) this.view.toast(event.text);
      }
      if (event.type === 'notice') this.view.toast(event.text!);
      if (event.type === 'zone')
        this.view.toast(
          ZONES.find((z) => z.id === event.text)!.name +
            ' · ' +
            ZONES.find((z) => z.id === event.text)!.subtitle,
        );
      if (event.type === 'shop') this.open('shop');
      if (event.type === 'dialogue') this.open('dialogue', event.text);
      if (event.type === 'defeat') {
        this.audio.play('loss');
        this.open('defeat', event.text);
      }
      if (event.type === 'victory') {
        this.audio.play('win');
        this.open('victory', event.text);
      }
    }
    this.world.events = [];
    if (this.world.dirty) {
      this.persist();
      this.world.dirty = false;
    }
    this.view.hud(this.world);
  }
  private persist(): void {
    if (!this.store.save(this.progress) && this.store.warning) this.view.toast(this.store.warning);
  }
  private frame(t: number): void {
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    this.last = t;
    this.time += dt;
    if (this.view.overlay === 'none') {
      this.accumulator += dt;
      while (this.accumulator >= 1 / 60) {
        const attack =
          (['kick', 'wing', 'peck'] as AttackKind[]).find((k) => this.input.down(k)) ?? null;
        this.world.update(
          1 / 60,
          { move: this.input.movement(), block: this.input.down('block'), attack },
          Date.now(),
        );
        this.accumulator -= 1 / 60;
        this.consumeEvents();
        if (this.view.overlay !== 'none') {
          this.accumulator = 0;
          break;
        }
      }
    } else this.accumulator = 0;
    this.renderer.draw(
      this.world,
      this.time,
      this.view.overlay === 'none' || this.view.overlay === 'menu' ? dt : 0,
      this.view.overlay === 'menu',
    );
    this.hudTimer += dt;
    this.saveTimer += dt;
    if (this.hudTimer > 0.1) {
      this.view.hud(this.world);
      this.hudTimer = 0;
    }
    if (this.saveTimer > 5) {
      this.persist();
      this.saveTimer = 0;
    }
    requestAnimationFrame((next) => this.frame(next));
  }
}
