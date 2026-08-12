import { COLORS, FONT } from './config';
import type { Enemy, EnemyKind, OrbPosition, Particle, Player, Pickup } from './types';
import { drawGlow, drawSoftEllipse, hexToRgba, lerp, polygonPath, seededRandom } from './utils';

const ENEMY_PALETTE: Record<EnemyKind, { body: string; light: string; dark: string; cap: string }> = {
  blue: { body: '#2d86be', light: '#75d9e7', dark: '#123f69', cap: '#4dbce4' },
  green: { body: '#32956e', light: '#7bdb9a', dark: '#164e47', cap: '#45b383' },
  yellow: { body: '#c69a46', light: '#f2d888', dark: '#69462c', cap: '#e7b957' },
  red: { body: '#c74768', light: '#f28a8c', dark: '#5d233e', cap: '#e36372' },
  violet: { body: '#7952ad', light: '#c395e6', dark: '#33234d', cap: '#a26ac5' },
};

export const makePlayer = (x: number, y: number): Player => ({
  x,
  y,
  vx: 0,
  vy: 0,
  radius: 17,
  maxHp: 100,
  hp: 100,
  xp: 0,
  xpToNext: 12,
  level: 1,
  facing: 1,
  bob: 0,
  hitFlash: 0,
  invulnerable: 0,
  kills: 0,
  orbitAngle: -Math.PI / 2,
});

export const makeEnemy = (id: number, x: number, y: number, kind: EnemyKind, difficulty: number): Enemy => {
  const base = kind === 'violet' ? 110 : kind === 'yellow' ? 56 : kind === 'red' ? 38 : kind === 'green' ? 34 : 30;
  const radius = (kind === 'violet' ? 24 : 18 + Math.random() * 4) * (0.92 + Math.random() * 0.18);
  const hp = base * (1 + difficulty * 0.11);
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    hp,
    maxHp: hp,
    speed: (kind === 'blue' ? 58 : kind === 'red' ? 68 : kind === 'violet' ? 45 : 62) * (0.95 + Math.random() * 0.16) * (1 + difficulty * 0.012),
    kind,
    phase: Math.random() * Math.PI * 2,
    hitFlash: 0,
    hitStun: 0,
    contactCooldown: 0,
    dead: false,
    dotTimer: 0,
    dotTick: 0,
  };
};

export const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, time: number): void => {
  const bob = Math.sin(time * 0.004 + player.bob) * 2.1;
  const sway = Math.sin(time * 0.0032 + player.bob * 2) * 0.8;
  ctx.save();
  drawSoftEllipse(ctx, player.x + 5, player.y + 16, 22, 8, '#061b1b', 0.64);
  ctx.translate(player.x + sway, player.y + bob);
  ctx.scale(player.facing < 0 ? -1 : 1, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = '#d9e7ef';
  ctx.strokeStyle = '#101e32';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-13, -5, -8, -13);
  ctx.quadraticCurveTo(-5, -21, 2, -22);
  ctx.quadraticCurveTo(10, -20, 11, -11);
  ctx.quadraticCurveTo(15, -1, 12, 10);
  ctx.quadraticCurveTo(7, 16, 1, 12);
  ctx.quadraticCurveTo(-4, 17, -9, 11);
  ctx.closePath();
  const robe = ctx.createLinearGradient(0, -22, 0, 14);
  robe.addColorStop(0, '#fbffff');
  robe.addColorStop(0.48, '#eef5f5');
  robe.addColorStop(1, '#9ab8c8');
  ctx.fillStyle = robe;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#aacbe0';
  ctx.beginPath();
  ctx.moveTo(6, -18);
  ctx.lineTo(15, -23);
  ctx.lineTo(11, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8ffff';
  ctx.beginPath();
  ctx.ellipse(-2, -5, 8, 7, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#23324a';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = '#24324e';
  ctx.beginPath();
  ctx.arc(-5, -5, 1.35, 0, Math.PI * 2);
  ctx.arc(1.5, -5.2, 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#496578';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-10, -1);
  ctx.lineTo(-15, 3);
  ctx.moveTo(9, 0);
  ctx.lineTo(14, 4);
  ctx.stroke();
  if (player.hitFlash > 0) {
    ctx.globalAlpha = Math.min(0.7, player.hitFlash * 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -5, 19, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const drawOrb = (ctx: CanvasRenderingContext2D, orb: OrbPosition, time: number): void => {
  const pulse = 1 + Math.sin(time * 0.009 + orb.pulse) * 0.08;
  const radius = 12.5 * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, orb.x, orb.y, 42 * pulse, COLORS.electric, 1);
  ctx.translate(orb.x, orb.y);
  ctx.rotate(time * 0.0012 + orb.pulse);
  ctx.fillStyle = '#75f1ff';
  ctx.globalAlpha = 0.95;
  for (let i = 0; i < 4; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 4;
    const tip = 25 * pulse;
    const base = 9.5 * pulse;
    const width = 5.2 * pulse;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * base + Math.cos(angle + Math.PI / 2) * width, Math.sin(angle) * base + Math.sin(angle + Math.PI / 2) * width);
    ctx.lineTo(Math.cos(angle) * tip, Math.sin(angle) * tip);
    ctx.lineTo(Math.cos(angle) * base + Math.cos(angle - Math.PI / 2) * width, Math.sin(angle) * base + Math.sin(angle - Math.PI / 2) * width);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0a4db4';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c5fbff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#072a77';
  ctx.beginPath();
  ctx.arc(-2, -2, radius * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number): void => {
  const palette = ENEMY_PALETTE[enemy.kind];
  const breathe = 1 + Math.sin(time * 0.004 + enemy.phase) * 0.045;
  const bounce = Math.abs(Math.sin(time * 0.006 + enemy.phase)) * 1.9;
  const squash = 1 - Math.abs(Math.sin(time * 0.006 + enemy.phase)) * 0.04;
  ctx.save();
  drawSoftEllipse(ctx, enemy.x + 4, enemy.y + enemy.radius * 0.84, enemy.radius * 1.05, enemy.radius * 0.34, '#061914', 0.62);
  ctx.translate(enemy.x, enemy.y - bounce);
  ctx.scale(breathe * (1 / squash), squash);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = palette.dark;
  ctx.beginPath();
  ctx.moveTo(-enemy.radius * 0.95, enemy.radius * 0.32);
  ctx.quadraticCurveTo(-enemy.radius * 1.04, -enemy.radius * 0.35, -enemy.radius * 0.46, -enemy.radius * 0.65);
  ctx.quadraticCurveTo(0, -enemy.radius * 0.94, enemy.radius * 0.47, -enemy.radius * 0.65);
  ctx.quadraticCurveTo(enemy.radius * 1.05, -enemy.radius * 0.34, enemy.radius * 0.92, enemy.radius * 0.32);
  ctx.quadraticCurveTo(enemy.radius * 0.6, enemy.radius * 0.92, 0, enemy.radius * 0.98);
  ctx.quadraticCurveTo(-enemy.radius * 0.62, enemy.radius * 0.92, -enemy.radius * 0.95, enemy.radius * 0.32);
  ctx.closePath();
  const body = ctx.createLinearGradient(0, -enemy.radius, 0, enemy.radius);
  body.addColorStop(0, palette.light);
  body.addColorStop(0.36, palette.body);
  body.addColorStop(1, palette.dark);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();
  if (enemy.kind !== 'blue') {
    ctx.fillStyle = palette.cap;
    ctx.strokeStyle = palette.dark;
    ctx.beginPath();
    ctx.moveTo(-enemy.radius * 0.54, -enemy.radius * 0.63);
    ctx.quadraticCurveTo(-enemy.radius * 0.1, -enemy.radius * 1.18, enemy.radius * 0.42, -enemy.radius * 0.64);
    ctx.quadraticCurveTo(enemy.radius * 0.62, -enemy.radius * 0.43, enemy.radius * 0.5, -enemy.radius * 0.22);
    ctx.quadraticCurveTo(0, -enemy.radius * 0.43, -enemy.radius * 0.54, -enemy.radius * 0.63);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    ctx.beginPath();
    ctx.arc(enemy.radius * 0.17, -enemy.radius * 0.72, enemy.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#18202d';
  ctx.beginPath();
  ctx.arc(-enemy.radius * 0.29, -enemy.radius * 0.03, Math.max(1.6, enemy.radius * 0.1), 0, Math.PI * 2);
  ctx.arc(enemy.radius * 0.29, -enemy.radius * 0.03, Math.max(1.6, enemy.radius * 0.1), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#18202d';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, enemy.radius * 0.17, enemy.radius * 0.23, 0.1, Math.PI - 0.1);
  ctx.stroke();
  if (enemy.dotTimer > 0) {
    ctx.strokeStyle = '#eebcff';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 4, time * 0.004, time * 0.004 + Math.PI * 1.4);
    ctx.stroke();
  }
  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = Math.min(0.85, enemy.hitFlash * 3);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const drawPickup = (ctx: CanvasRenderingContext2D, pickup: Pickup, time: number): void => {
  const colors: Record<Pickup['color'], string> = { cyan: '#7df5ff', green: '#8ce49f', yellow: '#f8db76', red: '#f27991' };
  const color = colors[pickup.color];
  const hover = Math.sin(time * 0.005 + pickup.phase) * 2.4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, pickup.x, pickup.y + hover, 18, color, 0.85);
  ctx.translate(pickup.x, pickup.y + hover);
  ctx.rotate(time * 0.001 + pickup.phase);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ecffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

export const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle): void => {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  if (particle.type === 'poof') {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 0, 0, particle.size * 3.8, particle.color, alpha);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * (1.25 - alpha * 0.25), 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.type === 'shadow') {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size * 1.7, particle.size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.type === 'leaf') {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size * 0.45, particle.size, 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = particle.type === 'glint' ? 1.4 : 2;
    ctx.beginPath();
    ctx.moveTo(-particle.size, 0);
    ctx.lineTo(particle.size, 0);
    ctx.moveTo(0, -particle.size);
    ctx.lineTo(0, particle.size);
    ctx.stroke();
  }
  ctx.restore();
};

export const drawSkillGlyph = (ctx: CanvasRenderingContext2D, id: string, size: number, color = '#f7ffff'): void => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (id === 'lightning') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, -size * 0.8);
    ctx.lineTo(size * 0.36, -size * 0.18);
    ctx.lineTo(size * 0.02, -size * 0.12);
    ctx.lineTo(size * 0.22, size * 0.78);
    ctx.lineTo(-size * 0.36, size * 0.12);
    ctx.lineTo(-size * 0.02, size * 0.06);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'blessing') {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.7, size * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.68);
    ctx.lineTo(0, -size * 0.36);
    ctx.moveTo(-size * 0.6, -size * 0.46);
    ctx.lineTo(-size * 0.4, -size * 0.27);
    ctx.moveTo(size * 0.6, -size * 0.46);
    ctx.lineTo(size * 0.4, -size * 0.27);
    ctx.stroke();
  } else if (id === 'ray') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.72, size * 0.38);
    ctx.lineTo(size * 0.6, -size * 0.5);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(size * 0.76, size * 0.05);
    ctx.lineTo(-size * 0.36, size * 0.72);
    ctx.lineTo(-size * 0.08, size * 0.2);
    ctx.closePath();
    ctx.stroke();
  } else if (id === 'vortex') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.65, -0.35, Math.PI * 1.66);
    ctx.arc(0, 0, size * 0.34, Math.PI * 1.8, Math.PI * 0.18, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.2, -size * 0.55);
    ctx.lineTo(size * 0.68, -size * 0.35);
    ctx.lineTo(size * 0.4, 0);
    ctx.stroke();
  } else if (id === 'embrace') {
    polygonPath(ctx, 6, size * 0.52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, size * 0.45);
    ctx.lineTo(0, -size * 0.64);
    ctx.lineTo(size * 0.42, size * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, size * 0.17, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, size * 0.75);
    ctx.lineTo(size * 0.33, -size * 0.76);
    ctx.lineTo(size * 0.56, -size * 0.48);
    ctx.lineTo(size * 0.2, size * 0.78);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, -size * 0.4);
    ctx.lineTo(-size * 0.05, -size * 0.15);
    ctx.lineTo(-size * 0.33, size * 0.35);
    ctx.stroke();
  }
  ctx.restore();
};
