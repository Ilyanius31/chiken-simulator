import { t } from '../localization';
import type { WorldObject } from '../world/map';
export function drawObject(
  c: CanvasRenderingContext2D,
  o: WorldObject,
  time: number,
  depleted = false,
  highlight = false,
): void {
  c.save();
  c.translate(o.x, o.y);
  const kind = o.kind,
    v = o.variant;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = 2;
  c.strokeStyle = '#3c5743';
  const shape = (d: string, fill: string, stroke = true) => {
    const p = new Path2D(d);
    c.fillStyle = fill;
    c.fill(p);
    if (stroke) c.stroke(p);
  };
  const ellipse = (x: number, y: number, rx: number, ry: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  };
  const box = (x: number, y: number, w: number, h: number, fill: string, r = 5) => {
    c.fillStyle = fill;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fill();
    c.stroke();
  };
  if (highlight) {
    c.strokeStyle = '#fff2a9';
    c.lineWidth = 2;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.ellipse(
      0,
      7,
      Math.max(30, (o.width ?? o.radius * 2) / 2 + 10),
      Math.max(25, (o.height ?? o.radius * 2) / 2 + 10),
      0,
      0,
      Math.PI * 2,
    );
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = '#3c5743';
  }
  if (kind === 'tree') {
    ellipse(7, 12, 47, 35, '#193e382c');
    box(-8, -5, 16, 32, '#96744c', 4);
    c.save();
    c.rotate(Math.sin(time * 1.6 + o.x) * 0.018);
    const colors = [
      ['#427e56', '#5a9d65', '#83b86b'],
      ['#477963', '#679c72', '#91b87c'],
      ['#677e4c', '#8c9d57', '#afbb70'],
    ][v];
    shape(
      'M -41 4 Q -58 -20 -29 -33 Q -20 -59 4 -45 Q 31 -55 41 -28 Q 64 -5 39 14 Q 23 35 1 22 Q -31 38 -41 4 Z',
      colors[0],
    );
    shape(
      'M -35 -5 Q -42 -27 -17 -28 Q -9 -48 10 -36 Q 36 -39 35 -15 Q 51 5 24 11 Q 7 25 -7 9 Q -29 22 -35 -5 Z',
      colors[1],
      false,
    );
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4;
      ellipse(Math.cos(a) * 24, Math.sin(a) * 20 - 13, 7, 3, colors[2]);
    }
    c.restore();
  } else if (kind === 'house') {
    const w = o.width ?? 140,
      h = o.height ?? 120;
    ellipse(6, 14, w * 0.56, h * 0.55, '#244a3026');
    box(-w / 2, -h / 2, w, h, '#eed3a0', 9);
    box(-w / 2 + 6, -h / 2 + 6, w - 12, h - 22, ['#cc7953', '#c99059', '#789597'][v], 6);
    for (let y = -h / 2 + 20; y < h / 2 - 16; y += 17) {
      c.strokeStyle = '#ffffff30';
      c.beginPath();
      c.moveTo(-w / 2 + 10, y);
      c.lineTo(w / 2 - 10, y);
      c.stroke();
    }
    c.strokeStyle = '#835b3d';
    shape(
      `M ${-w / 2 - 9} -7 L 0 ${-h / 2 - 15} L ${w / 2 + 9} -7 L ${w / 2 + 9} 5 L 0 ${-h / 2 - 2} L ${-w / 2 - 9} 5 Z`,
      '#e6aa6b',
    );
    box(-19, h / 2 - 20, 38, 28, '#554f3d', 5);
    box(w / 2 - 37, h / 2 - 32, 22, 17, '#f9d777', 3);
    box(-w / 2 + 15, h / 2 - 32, 22, 17, '#f9d777', 3);
    ellipse(-w / 2 + 5, h / 2 + 8, 15, 9, '#749b52');
    ellipse(w / 2, h / 2 + 4, 17, 11, '#84aa61');
  } else if (kind === 'shop') {
    ellipse(4, 11, 87, 59, '#29473225');
    box(-70, -45, 140, 95, '#8e6647', 5);
    box(-74, -49, 148, 65, '#f5e3b7', 7);
    for (let x = -70; x < 70; x += 28) {
      c.fillStyle = '#ce7755';
      c.fillRect(x, -46, 14, 59);
    }
    c.strokeStyle = '#74543c';
    box(-77, 7, 154, 22, '#f1d8a0', 4);
    for (let i = 0; i < 3; i++) {
      ellipse(-44 + i * 43, 41, 17, 9, '#6b5035');
      ellipse(-44 + i * 43, 36, 7, 10, '#fff0c8');
    }
    c.fillStyle = '#fef2d5';
    c.font = 'bold 10px system-ui';
    c.textAlign = 'center';
    c.fillText(t.objects.shop, 0, -59, 140);
  } else if (kind === 'fence') {
    const w = o.width ?? 50;
    ellipse(0, 7, w / 2 + 4, 9, '#33533325');
    c.strokeStyle = '#785b3d';
    box(-w / 2, -7, w, 13, '#be9460', 2);
    box(-w / 2, -14, 9, 30, '#e4bf80', 3);
    box(w / 2 - 9, -14, 9, 30, '#e4bf80', 3);
  } else if (kind === 'nest') {
    ellipse(2, 4, 30, 22, '#3f57352a');
    ellipse(0, 0, 27, 20, '#9a7343');
    ellipse(0, -2, 21, 13, '#6d5935');
    c.strokeStyle = '#ddbe70';
    c.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      c.beginPath();
      c.moveTo(Math.cos(a) * 24, Math.sin(a) * 17);
      c.lineTo(Math.cos(a + 0.4) * 26, Math.sin(a + 0.4) * 20);
      c.stroke();
    }
    if (!depleted)
      for (let i = 0; i < 3; i++) {
        ellipse((i - 1) * 10, -3 - Math.sin(time * 2 + i), 7, 10, '#fff2cb');
        ellipse((i - 1) * 10 - 2, -6, 2, 3, '#fffbed');
      }
  } else if (kind === 'crate') {
    ellipse(3, 8, 30, 24, '#31503628');
    c.strokeStyle = '#85603f';
    box(-23, -23, 46, 46, '#c6945d', 4);
    box(-17, -17, 34, 34, '#a9794c', 2);
    c.strokeStyle = '#e4b778';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-18, -18);
    c.lineTo(18, 18);
    c.moveTo(18, -18);
    c.lineTo(-18, 18);
    c.stroke();
  } else if (kind === 'dummy') {
    ellipse(3, 8, 27, 23, '#3d53322b');
    c.strokeStyle = '#795f40';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(-32, -5);
    c.lineTo(32, -5);
    c.moveTo(0, -24);
    c.lineTo(0, 29);
    c.stroke();
    ellipse(0, 0, 21, 25, '#d7b46d');
    c.strokeStyle = '#927045';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 13, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 5, 0, Math.PI * 2);
    c.stroke();
    shape('M -11 -25 L -15 -39 L -4 -34 L 3 -44 L 11 -28 Z', '#d26b4a');
  } else if (kind === 'rock') {
    ellipse(5, 7, 27, 21, '#293e3928');
    shape(
      'M -26 8 L -19 -15 L 3 -24 L 22 -11 L 28 10 L 9 23 L -13 19 Z',
      ['#9aa69a', '#a7ac9d', '#82958c'][v],
    );
    shape('M -19 -15 L 3 -24 L 22 -11 L 8 1 L -9 -2 Z', '#bec6b0', false);
    c.strokeStyle = '#70867a';
    c.beginPath();
    c.moveTo(8, 1);
    c.lineTo(9, 17);
    c.stroke();
  } else if (kind === 'bush') {
    const sway = Math.sin(time * 2 + o.y) * 2;
    ellipse(3, 5, 21, 13, '#38654024');
    shape(
      `M -24 4 Q -30 -12 -12 -15 Q -4 -31 9 -15 Q 29 -15 24 4 Q 13 18 0 10 Q -13 19 -24 4 Z`,
      ['#82ab58', '#799e54', '#6e9c68'][v],
    );
    ellipse(-8 + sway, -10, 7, 3, '#acc66c');
  } else if (kind === 'log') {
    c.strokeStyle = '#634c35';
    box(-50, -16, 100, 32, '#96744d', 14);
    ellipse(-43, 0, 9, 16, '#d2b076');
    ellipse(43, 0, 9, 16, '#d2b076');
    c.strokeStyle = '#bb925b';
    c.beginPath();
    c.moveTo(-30, -8);
    c.lineTo(30, -8);
    c.moveTo(-34, 5);
    c.lineTo(33, 5);
    c.stroke();
  } else if (kind === 'hay') {
    c.strokeStyle = '#b9914b';
    box(-38, -26, 76, 52, '#dfc16e', 10);
    c.strokeStyle = '#eedc91';
    c.lineWidth = 2;
    for (let y = -18; y < 24; y += 8) {
      c.beginPath();
      c.moveTo(-30, y);
      c.lineTo(30, y);
      c.stroke();
    }
    c.strokeStyle = '#a28a4e';
    c.lineWidth = 5;
    for (const x of [-19, 19]) {
      c.beginPath();
      c.moveTo(x, -25);
      c.lineTo(x, 25);
      c.stroke();
    }
  } else if (kind === 'sign' || kind === 'bell') {
    c.strokeStyle = '#795c3d';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(0, 5);
    c.lineTo(0, 31);
    c.stroke();
    if (kind === 'sign') {
      box(-27, -20, 54, 33, '#e5ca89', 4);
      c.strokeStyle = '#806944';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-14, -5);
      c.lineTo(14, -5);
      c.lineTo(7, -11);
      c.moveTo(14, -5);
      c.lineTo(7, 1);
      c.stroke();
    } else {
      box(-26, -33, 52, 12, '#7e6250', 3);
      c.strokeStyle = '#7d6943';
      shape('M -13 -19 Q -13 -35 0 -35 Q 13 -35 13 -19 L 19 4 L -19 4 Z', '#eac267');
      ellipse(0, 7, 5, 5, '#aa8541');
    }
  } else if (kind === 'banner') {
    c.strokeStyle = '#70543c';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, -49);
    c.lineTo(0, 32);
    c.stroke();
    shape(`M 2 -45 L 38 ${-43 + Math.sin(time * 2) * 3} L 30 -9 L 2 -14 Z`, '#9c76a4');
    c.fillStyle = '#edd597';
    c.font = '21px sans-serif';
    c.fillText('♛', 7, -24);
  } else if (kind === 'mushroom') {
    for (let i = 0; i < 2; i++) {
      const x = i * 14 - 7;
      box(x - 2, -2, 5, 13, '#e9d7ba', 3);
      ellipse(x, -4, 10, 7, '#cd8c73');
      ellipse(x - 3, -6, 2, 2, '#f6e4c1');
    }
  } else if (kind === 'flower') {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 9,
        y = Math.sin(i * 3 + o.x) * 8;
      c.strokeStyle = '#659252';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.sin(time + o.x) * 2, y - 9);
      c.stroke();
      ellipse(x, y - 10, 3.5, 3.5, ['#f5e59a', '#f4c3a3', '#e2d6ed'][v]);
    }
  } else if (kind === 'stash' && !depleted) {
    ellipse(0, 7, 14, 6, '#4b68432b');
    ellipse(0, -2 - Math.sin(time * 3) * 3, 10, 14, '#ffe6a1');
    ellipse(-3, -7, 3, 4, '#fff8d7');
    c.fillStyle = '#fff4bf';
    c.font = '12px sans-serif';
    c.fillText('✦', 12, -15 + Math.sin(time * 3) * 4);
  }
  c.restore();
}
