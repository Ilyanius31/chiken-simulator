import { OPPONENTS, type AttackKind } from './config';
import { setBlock, startAttack, type Fighter } from './combat';
export class RoosterAI {
  private decisionIn = .8;
  private blockFor = 0;
  constructor(private index: number, private random = Math.random) {}
  update(f: Fighter, target: Fighter, dt: number): boolean {
    const cfg = OPPONENTS[this.index];
    this.decisionIn -= dt; this.blockFor = Math.max(0, this.blockFor - dt);
    setBlock(f, this.blockFor > 0);
    const distance = Math.abs(f.x - target.x);
    f.move = distance > 137 ? -1 : distance < 103 ? 1 : 0;
    if (f.attack || f.lay > 0 || f.stun > 0) { f.move = 0; return false; }
    if (this.decisionIn > 0) return false;
    this.decisionIn = cfg.reaction * (.8 + this.random() * .65);
    if (distance < 200 && this.random() < cfg.block) { this.blockFor = .4 + this.random() * .4; setBlock(f, true); return false; }
    if (distance > 220 && this.random() < .035) { f.lay = 1.15; f.move = 0; return true; }
    if (distance < 178 && this.random() > .12) {
      const roll = this.random();
      const kind: AttackKind = this.index === 0 ? roll < .82 ? 'peck' : 'wing' : this.index === 1 ? roll < .75 ? 'peck' : 'wing' : roll < .38 ? 'kick' : roll < .72 ? 'wing' : 'peck';
      setBlock(f, false); startAttack(f, kind);
    }
    return false;
  }
}
