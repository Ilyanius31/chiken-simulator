export type Action = 'left' | 'right' | 'peck' | 'wing' | 'kick' | 'block';
const keyMap: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyJ: 'peck',
  KeyK: 'wing',
  KeyL: 'kick',
  Space: 'block',
};
export class Input {
  private pointers = new Map<number, Action>();
  private keys = new Set<string>();
  private pressed = new Set<Action>();
  enabled = false;
  constructor(root: HTMLElement, onPause: () => void) {
    root.addEventListener('pointerdown', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-control]');
      if (!button || !this.enabled) return;
      event.preventDefault();
      const action = button.dataset.control as Action;
      button.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, action);
      this.pressed.add(action);
      button.classList.add('held');
    });
    const release = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      this.sync(root);
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('lostpointercapture', release);
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && !event.repeat) onPause();
      const action = keyMap[event.code];
      if (!this.enabled || !action || event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      if (!this.keys.has(event.code)) this.pressed.add(action);
      this.keys.add(event.code);
      this.sync(root);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      this.sync(root);
    });
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clear();
    });
  }
  down(action: Action): boolean {
    return (
      [...this.pointers.values()].includes(action) ||
      [...this.keys].some((key) => keyMap[key] === action)
    );
  }
  take(action: Action): boolean {
    const pressed = this.pressed.has(action);
    this.pressed.delete(action);
    return pressed;
  }
  clear(): void {
    this.pointers.clear();
    this.keys.clear();
    this.pressed.clear();
    document.querySelectorAll('.held').forEach((node) => node.classList.remove('held'));
  }
  private sync(root: HTMLElement): void {
    root
      .querySelectorAll<HTMLButtonElement>('[data-control]')
      .forEach((button) =>
        button.classList.toggle('held', this.down(button.dataset.control as Action)),
      );
  }
}
