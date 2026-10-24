import type { Vec } from '../world/map';
export type Action = 'peck' | 'wing' | 'kick' | 'block';
const keyMap: Record<string, Action> = { KeyJ: 'peck', KeyK: 'wing', KeyL: 'kick', Space: 'block' };
export class Input {
  enabled = false;
  vector: Vec = { x: 0, y: 0 };
  private pointers = new Map<number, Action>();
  private keys = new Set<string>();
  private joystick: number | null = null;
  private origin: Vec = { x: 0, y: 0 };
  constructor(
    private root: HTMLElement,
    onPause: () => void,
    onInteract: () => void,
    onEgg: () => void,
  ) {
    root.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-control]');
      if (!button) return;
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      if (button.dataset.control === 'joystick') {
        if (this.joystick !== null) return;
        this.joystick = e.pointerId;
        const box = button.getBoundingClientRect();
        this.origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        this.moveStick(e);
      } else this.pointers.set(e.pointerId, button.dataset.control as Action);
      this.sync();
    });
    root.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joystick) {
        e.preventDefault();
        this.moveStick(e);
      }
    });
    const release = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (e.pointerId === this.joystick) {
        this.joystick = null;
        this.vector = { x: 0, y: 0 };
        this.stick(0, 0);
      }
      this.sync();
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('lostpointercapture', release);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !e.repeat) {
        onPause();
        return;
      }
      if (!this.enabled) return;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'KeyJ',
          'KeyK',
          'KeyL',
          'Space',
          'KeyE',
          'KeyV',
        ].includes(e.code)
      ) {
        e.preventDefault();
        this.keys.add(e.code);
        this.sync();
      }
      if (e.code === 'KeyE' && !e.repeat) onInteract();
      if (e.code === 'KeyV' && !e.repeat) onEgg();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.sync();
    });
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clear();
    });
  }
  movement(): Vec {
    const x =
        Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
        Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')),
      y =
        Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) -
        Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    if (x || y) {
      const n = Math.hypot(x, y);
      return { x: x / n, y: y / n };
    }
    return this.vector;
  }
  down(action: Action): boolean {
    return (
      [...this.pointers.values()].includes(action) ||
      [...this.keys].some((key) => keyMap[key] === action)
    );
  }
  clear(): void {
    this.keys.clear();
    this.pointers.clear();
    this.joystick = null;
    this.vector = { x: 0, y: 0 };
    this.stick(0, 0);
    this.sync();
  }
  private moveStick(e: PointerEvent): void {
    const dx = e.clientX - this.origin.x,
      dy = e.clientY - this.origin.y,
      d = Math.hypot(dx, dy),
      radius = 36;
    this.vector =
      d < 6 ? { x: 0, y: 0 } : { x: dx / Math.max(radius, d), y: dy / Math.max(radius, d) };
    this.stick(this.vector.x * radius, this.vector.y * radius);
  }
  private stick(x: number, y: number): void {
    const node = this.root.querySelector<HTMLElement>('.stick-knob');
    if (node) node.style.transform = `translate(${x}px,${y}px)`;
  }
  private sync(): void {
    this.root
      .querySelectorAll<HTMLElement>('[data-control]')
      .forEach((node) => node.classList.toggle('held', this.down(node.dataset.control as Action)));
  }
}
