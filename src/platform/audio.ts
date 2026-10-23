export type Sound = 'click' | 'hit' | 'block' | 'win' | 'loss' | 'egg' | 'buy';
export class AudioManager {
  enabled = true;
  private context: AudioContext | null = null;
  unlock(): void {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Silent mode remains playable. */
    }
  }
  play(sound: Sound): void {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context;
    const notes: Record<Sound, number[]> = {
      click: [540],
      hit: [160, 80],
      block: [270, 220],
      win: [392, 494, 587, 784],
      loss: [330, 262, 196],
      egg: [420, 660, 880],
      buy: [600, 800, 1000],
    };
    notes[sound].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + i * 0.085;
      oscillator.type = sound === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.65, at + 0.11);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.09, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.17);
    });
  }
}
