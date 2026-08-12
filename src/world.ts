import { COLORS, WORLD_HEIGHT, WORLD_WIDTH } from './config';
import type { FlowerDetail, GrassDetail, Rock, TreeDetail, Vec2 } from './types';
import { clamp, drawSoftEllipse, hexToRgba, seededRandom } from './utils';

export class World {
  readonly rocks: Rock[] = [];
  readonly grass: GrassDetail[] = [];
  readonly flowers: FlowerDetail[] = [];
  readonly berries: Vec2[] = [];
  readonly trees: TreeDetail[] = [];
  private readonly atmosphere = new Image();
  private atmosphereReady = false;

  constructor() {
    this.atmosphere.src = '/assets/forest-atmosphere.png';
    this.atmosphere.onload = () => {
      this.atmosphereReady = true;
    };
    this.generateDetails();
  }

  private generateDetails(): void {
    const random = seededRandom(8122026);
    const mossColors = ['#75ae79', '#5f9a76', '#8cbc72', '#4d846f'];
    for (let i = 0; i < 34; i += 1) {
      const x = 100 + random() * (WORLD_WIDTH - 200);
      const y = 130 + random() * (WORLD_HEIGHT - 260);
      if (Math.hypot(x - WORLD_WIDTH / 2, y - WORLD_HEIGHT / 2) < 150) {
        i -= 1;
        continue;
      }
      this.rocks.push({
        x,
        y,
        radius: 34 + random() * 34,
        width: 58 + random() * 64,
        height: 52 + random() * 58,
        seed: random() * 1000,
        moss: mossColors[Math.floor(random() * mossColors.length)],
      });
    }
    const grassTints = ['#3d8052', '#4a9157', '#6aa25c', '#2d6849', '#83b56d'];
    for (let i = 0; i < 720; i += 1) {
      this.grass.push({
        x: random() * WORLD_WIDTH,
        y: random() * WORLD_HEIGHT,
        scale: 0.5 + random() * 1.2,
        tint: grassTints[Math.floor(random() * grassTints.length)],
        lean: (random() - 0.5) * 0.55,
      });
    }
    const flowerColors = ['#e9f3aa', '#fff4d2', '#c7f3dc', '#f1df81'];
    for (let i = 0; i < 210; i += 1) {
      this.flowers.push({
        x: random() * WORLD_WIDTH,
        y: random() * WORLD_HEIGHT,
        color: flowerColors[Math.floor(random() * flowerColors.length)],
        scale: 0.55 + random() * 0.7,
      });
    }
    for (let i = 0; i < 58; i += 1) {
      this.berries.push({ x: 40 + random() * (WORLD_WIDTH - 80), y: 60 + random() * (WORLD_HEIGHT - 120) });
    }
    const treeTints = ['#173f38', '#1b4b3a', '#245746', '#194239'];
    for (let i = 0; i < 18; i += 1) {
      let x = random() * WORLD_WIDTH;
      let y = random() * WORLD_HEIGHT;
      let tries = 0;
      while (Math.hypot(x - WORLD_WIDTH / 2, y - WORLD_HEIGHT / 2) < 620 && tries < 12) {
        x = random() * WORLD_WIDTH;
        y = random() * WORLD_HEIGHT;
        tries += 1;
      }
      this.trees.push({ x, y, width: 34 + random() * 34, height: 88 + random() * 72, tint: treeTints[Math.floor(random() * treeTints.length)], seed: random() * 1000 });
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.fillStyle = COLORS.deepForest;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (this.atmosphereReady) {
      ctx.globalAlpha = 0.78;
      ctx.drawImage(this.atmosphere, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.globalAlpha = 1;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      gradient.addColorStop(0, '#265a3d');
      gradient.addColorStop(0.5, '#34704d');
      gradient.addColorStop(1, '#123728');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
    this.drawPaintedTrails(ctx);
    this.drawBoundaryShade(ctx);
    this.drawGrass(ctx, time);
    this.drawFlowers(ctx, time);
    this.drawBerries(ctx, time);
    this.drawTrees(ctx, time);
    const sortedRocks = [...this.rocks].sort((a, b) => a.y - b.y);
    for (const rock of sortedRocks) this.drawRock(ctx, rock, time);
    ctx.restore();
  }

  private drawPaintedTrails(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = '#d2a372';
    ctx.lineWidth = 112;
    ctx.beginPath();
    ctx.moveTo(170, WORLD_HEIGHT + 160);
    ctx.bezierCurveTo(230, 2200, 690, 1950, 750, 1660);
    ctx.bezierCurveTo(820, 1330, 660, 1100, 930, 840);
    ctx.bezierCurveTo(1170, 610, 1350, 620, 1580, 350);
    ctx.stroke();
    ctx.lineWidth = 46;
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#8d654f';
    ctx.beginPath();
    ctx.moveTo(168, WORLD_HEIGHT + 160);
    ctx.bezierCurveTo(230, 2200, 690, 1950, 750, 1660);
    ctx.bezierCurveTo(820, 1330, 660, 1100, 930, 840);
    ctx.bezierCurveTo(1170, 610, 1350, 620, 1580, 350);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#d9af7f';
    ctx.lineWidth = 56;
    ctx.beginPath();
    ctx.moveTo(1680, 150);
    ctx.bezierCurveTo(1520, 430, 1670, 720, 1880, 930);
    ctx.bezierCurveTo(2110, 1160, 2030, 1540, 2260, 1770);
    ctx.stroke();
    ctx.restore();
  }

  private drawBoundaryShade(ctx: CanvasRenderingContext2D): void {
    const edge = ctx.createRadialGradient(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH * 0.3, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH * 0.72);
    edge.addColorStop(0, 'rgba(2, 20, 14, 0)');
    edge.addColorStop(0.72, 'rgba(2, 18, 14, .05)');
    edge.addColorStop(1, 'rgba(1, 10, 9, .58)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private drawGrass(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.lineWidth = 1.6;
    for (const tuft of this.grass) {
      const sway = Math.sin(time * 0.0012 + tuft.x * 0.01) * 1.3;
      const h = 8 * tuft.scale;
      ctx.strokeStyle = tuft.tint;
      ctx.globalAlpha = 0.44 + tuft.scale * 0.12;
      ctx.beginPath();
      ctx.moveTo(tuft.x, tuft.y + 4);
      ctx.quadraticCurveTo(tuft.x + tuft.lean * 8 + sway, tuft.y - h * 0.35, tuft.x + tuft.lean * 12 + sway, tuft.y - h);
      ctx.moveTo(tuft.x + 3, tuft.y + 4);
      ctx.quadraticCurveTo(tuft.x + 5 + sway, tuft.y - h * 0.28, tuft.x + 2 + sway, tuft.y - h * 0.78);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFlowers(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    for (const flower of this.flowers) {
      const pulse = 0.85 + Math.sin(time * 0.002 + flower.x) * 0.08;
      ctx.globalAlpha = 0.7 * pulse;
      ctx.fillStyle = flower.color;
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI * 2 * i) / 4;
        ctx.beginPath();
        ctx.arc(flower.x + Math.cos(angle) * 2.3 * flower.scale, flower.y + Math.sin(angle) * 2.3 * flower.scale, 1.5 * flower.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8a8e4d';
      ctx.beginPath();
      ctx.arc(flower.x, flower.y, 1.15 * flower.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBerries(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    for (const berry of this.berries) {
      const alpha = 0.35 + (Math.sin(time * 0.001 + berry.x) + 1) * 0.1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#f05c68';
      ctx.beginPath();
      ctx.arc(berry.x, berry.y, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c222a';
      ctx.fillRect(berry.x - 1, berry.y + 3, 2, 5);
    }
    ctx.restore();
  }

  private drawTrees(ctx: CanvasRenderingContext2D, time: number): void {
    const sortedTrees = [...this.trees].sort((a, b) => a.y - b.y);
    for (const tree of sortedTrees) {
      const random = seededRandom(Math.floor(tree.seed * 1000));
      ctx.save();
      drawSoftEllipse(ctx, tree.x + 8, tree.y + 4, tree.width * 0.72, tree.width * 0.25, '#031914', 0.5);
      ctx.translate(tree.x, tree.y);
      ctx.fillStyle = '#624c39';
      ctx.strokeStyle = '#18332c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-tree.width * 0.12, 4);
      ctx.lineTo(-tree.width * 0.18, -tree.height * 0.5);
      ctx.lineTo(tree.width * 0.18, -tree.height * 0.5);
      ctx.lineTo(tree.width * 0.13, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (let layer = 0; layer < 3; layer += 1) {
        const layerY = -tree.height * (0.25 + layer * 0.23);
        const width = tree.width * (0.86 - layer * 0.15);
        ctx.fillStyle = layer === 0 ? tree.tint : layer === 1 ? '#28614a' : '#347354';
        ctx.beginPath();
        ctx.moveTo(0, layerY - tree.height * 0.32);
        ctx.lineTo(-width, layerY + tree.height * 0.18);
        ctx.quadraticCurveTo(-width * 0.7, layerY + tree.height * 0.25, 0, layerY + tree.height * 0.12);
        ctx.quadraticCurveTo(width * 0.7, layerY + tree.height * 0.25, width, layerY + tree.height * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = '#a4cb79';
        ctx.beginPath();
        ctx.arc(-width * 0.25 + random() * width * 0.2, layerY - tree.height * 0.05, 4 + random() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 0.42 + Math.sin(time * 0.001 + tree.seed) * 0.05;
      ctx.strokeStyle = '#93c878';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-tree.width * 0.42, -tree.height * 0.43);
      ctx.lineTo(-tree.width * 0.18, -tree.height * 0.55);
      ctx.moveTo(tree.width * 0.1, -tree.height * 0.2);
      ctx.lineTo(tree.width * 0.34, -tree.height * 0.35);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawRock(ctx: CanvasRenderingContext2D, rock: Rock, time: number): void {
    const random = seededRandom(Math.floor(rock.seed * 1000));
    const points: Vec2[] = [];
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
      const radius = 0.82 + random() * 0.28;
      points.push({ x: Math.cos(angle) * rock.width * radius, y: Math.sin(angle) * rock.height * radius });
    }
    ctx.save();
    drawSoftEllipse(ctx, rock.x + 10, rock.y + rock.height * 0.46, rock.width * 0.78, rock.height * 0.34, '#031915', 0.48);
    ctx.translate(rock.x, rock.y);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    const body = ctx.createLinearGradient(-rock.width, -rock.height, rock.width, rock.height);
    body.addColorStop(0, '#8cc39c');
    body.addColorStop(0.28, '#518778');
    body.addColorStop(0.72, '#325965');
    body.addColorStop(1, '#1c3544');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = '#132c35';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = rock.moss;
    ctx.beginPath();
    ctx.moveTo(-rock.width * 0.75, -rock.height * 0.3);
    ctx.quadraticCurveTo(-rock.width * 0.2, -rock.height * 0.9, rock.width * 0.42, -rock.height * 0.66);
    ctx.quadraticCurveTo(rock.width * 0.68, -rock.height * 0.46, rock.width * 0.8, -rock.height * 0.13);
    ctx.quadraticCurveTo(rock.width * 0.18, -rock.height * 0.23, -rock.width * 0.75, -rock.height * 0.3);
    ctx.fill();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = '#badca3';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-rock.width * (0.45 - i * 0.12), -rock.height * 0.15);
      ctx.lineTo(-rock.width * (0.52 - i * 0.1), rock.height * 0.56);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.22 + Math.sin(time * 0.001 + rock.seed) * 0.04;
    ctx.fillStyle = '#b9e5a2';
    ctx.beginPath();
    ctx.arc(rock.width * 0.2, -rock.height * 0.54, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  resolveCircle(position: Vec2, radius: number): Vec2 {
    const result = { x: position.x, y: position.y };
    for (const rock of this.rocks) {
      const dx = result.x - rock.x;
      const dy = result.y - rock.y;
      const length = Math.hypot(dx, dy);
      const minimum = rock.radius + radius * 0.72;
      if (length < minimum) {
        const normal = length > 0.001 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
        result.x = rock.x + normal.x * minimum;
        result.y = rock.y + normal.y * minimum;
      }
    }
    result.x = clamp(result.x, 50, WORLD_WIDTH - 50);
    result.y = clamp(result.y, 50, WORLD_HEIGHT - 50);
    return result;
  }

  isBlocked(position: Vec2, radius: number): boolean {
    return this.rocks.some((rock) => Math.hypot(position.x - rock.x, position.y - rock.y) < rock.radius + radius);
  }

  obstacleSteer(position: Vec2, radius: number): Vec2 {
    let x = 0;
    let y = 0;
    for (const rock of this.rocks) {
      const dx = position.x - rock.x;
      const dy = position.y - rock.y;
      const length = Math.hypot(dx, dy);
      const range = rock.radius + radius + 45;
      if (length > 0 && length < range) {
        const force = (range - length) / range;
        x += (dx / length) * force;
        y += (dy / length) * force;
      }
    }
    return { x, y };
  }
}
