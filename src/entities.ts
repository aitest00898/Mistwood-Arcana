import { COLORS, FONT } from './config';
import { ArtAssets, enemyDefinition, heroDefinition } from './assets';
import type { Enemy, EnemyKind, OrbPosition, Particle, Player, Pickup, HeroId } from './types';
import { drawGlow, drawSoftEllipse, hexToRgba, lerp, polygonPath, seededRandom } from './utils';

const LEGACY_PALETTE: Record<string, { body: string; light: string; dark: string; cap: string }> = {
  mistSlime: { body: '#3daec0', light: '#a7f7ee', dark: '#164c68', cap: '#70e5e7' },
  sproutSlime: { body: '#5d9d47', light: '#bce47b', dark: '#244d38', cap: '#81bd59' },
  redcapFunglet: { body: '#bd7651', light: '#f2b27b', dark: '#5d2e2b', cap: '#df655e' },
  thornPuffer: { body: '#b94e37', light: '#f18a5e', dark: '#522331', cap: '#df6a47' },
  rootling: { body: '#6a8d4e', light: '#a8c66b', dark: '#304833', cap: '#749b51' },
  mossGolem: { body: '#596b6a', light: '#a2b48c', dark: '#263741', cap: '#759b70' },
  nightWisp: { body: '#1b5a92', light: '#5fcbef', dark: '#101b46', cap: '#3e72b4' },
  direMistwolf: { body: '#5c4b92', light: '#b68ce7', dark: '#251d42', cap: '#825bd1' },
  goblinSpearscout: { body: '#6f9a52', light: '#b5cb74', dark: '#294733', cap: '#6a8051' },
  goblinHexer: { body: '#477b78', light: '#8ecdc3', dark: '#1b3040', cap: '#285d70' },
  carnivorousBloom: { body: '#5b9d52', light: '#e1835f', dark: '#23402d', cap: '#d35a57' },
  boneWarden: { body: '#c6c4a7', light: '#fff2ca', dark: '#4e4a4c', cap: '#8b6c50' },
  paleForestGhost: { body: '#a7e8ee', light: '#f3ffff', dark: '#486b8b', cap: '#bcecff' },
  abyssGargoyle: { body: '#563f76', light: '#b65dd1', dark: '#241c3d', cap: '#9347bf' },
  ancientGroveGuardian: { body: '#687c58', light: '#b6c983', dark: '#283d35', cap: '#6a9a69' },
};

export const makePlayer = (x: number, y: number, heroId: HeroId = 'aether-mage'): Player => ({
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
  facing16: 0,
  bob: 0,
  hitFlash: 0,
  invulnerable: 0,
  kills: 0,
  orbitAngle: 0,
  heroId,
});

export const makeEnemy = (id: number, x: number, y: number, kind: EnemyKind, difficulty: number): Enemy => {
  const definition = enemyDefinition(kind);
  const radius = definition.radius * (0.94 + Math.random() * 0.12);
  const hp = 30 * definition.hpMultiplier * (1 + difficulty * 0.11);
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    radius,
    hp,
    maxHp: hp,
    speed: 64 * definition.speedMultiplier * (0.95 + Math.random() * 0.16) * (1 + difficulty * 0.012),
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

export const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, time: number, assets?: ArtAssets): void => {
  if (!assets || !assets.isHeroReady(heroDefinition(player.heroId))) return;
  drawSoftEllipse(ctx, player.x + 5, player.y + 17, 24, 8, '#071b1f', 0.62);
  assets.drawHeroSprite(ctx, heroDefinition(player.heroId), player, time);
  if (player.hitFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.55, player.hitFlash * 2.2);
    ctx.fillStyle = '#effff7';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 38, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const drawOrbitalRing = (ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, time: number): void => {
  const phase = time * 0.0007;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#75e7da';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.58;
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = '#ccebd0';
  ctx.beginPath();
  ctx.arc(0, 0, radiusX, phase, phase + 0.7);
  ctx.stroke();
  ctx.strokeStyle = '#b99558';
  ctx.globalAlpha = 0.46;
  ctx.beginPath();
  ctx.arc(0, 0, radiusX * 0.84, phase + Math.PI, phase + Math.PI + 0.5);
  ctx.stroke();
  ctx.restore();
};

export const drawOrb = (ctx: CanvasRenderingContext2D, orb: OrbPosition, time: number, assets?: ArtAssets): void => {
  const pulse = 1 + Math.sin(time * 0.009 + orb.pulse) * 0.08;
  const radius = 11.5 * pulse;
  const phase = time * 0.002 + orb.pulse;
  if (assets?.drawAttackIcon(ctx, 'lightning', orb.x, orb.y, 54 * pulse, phase * 0.35, 0.9)) {
    // A smaller moving containment ring keeps the orb visually anchored to
    // the orbit path without reverting to the old app-icon circle.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = '#c8fff4';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 29 * pulse, phase, phase + Math.PI * 1.25);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, orb.x, orb.y, 44 * pulse, COLORS.electric, 0.92);
  ctx.translate(orb.x, orb.y);
  ctx.rotate(phase);
  ctx.strokeStyle = 'rgba(131, 242, 255, .85)';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.arc(0, 0, 19 * pulse, 0.2, Math.PI * 1.62);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(237, 255, 248, .66)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 16 * pulse, Math.PI * 1.1, Math.PI * 2.65);
  ctx.stroke();
  ctx.fillStyle = '#8ef8ff';
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 + Math.sin(phase * 1.8 + i) * 0.09;
    const inner = 14 * pulse;
    const outer = (20 + (i % 3) * 4) * pulse;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle - 0.11) * inner, Math.sin(angle - 0.11) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.lineTo(Math.cos(angle + 0.11) * inner, Math.sin(angle + 0.11) * inner);
    ctx.closePath();
    ctx.globalAlpha = 0.46 + (i % 3) * 0.16;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0b4ca8';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c7ffff';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = '#072a77';
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.7);
  ctx.lineTo(radius * 0.56, radius * 0.48);
  ctx.lineTo(-radius * 0.56, radius * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#bdfaff';
  ctx.beginPath();
  ctx.arc(-2.2, -3, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d7ad61';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, 14.6, -0.45, 0.38);
  ctx.stroke();
  ctx.restore();
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, assets?: ArtAssets): void => {
  if (assets?.isEnemyReady()) {
    const definition = enemyDefinition(enemy.kind);
    drawSoftEllipse(ctx, enemy.x + 4, enemy.y + enemy.radius * 0.84, enemy.radius * definition.shadowScale, enemy.radius * definition.shadowScale * 0.32, '#061914', definition.elite ? 0.7 : 0.58);
    assets.drawEnemySprite(ctx, definition, enemy.x, enemy.y, enemy.radius, enemy.phase, time, enemy.hitFlash);
    return;
  }
  const palette = LEGACY_PALETTE[enemy.kind] ?? LEGACY_PALETTE.mistSlime;
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
  if (enemy.kind !== 'mistSlime' && enemy.kind !== 'nightWisp' && enemy.kind !== 'paleForestGhost') {
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
  } else if (id === 'vitality') {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.72);
    ctx.lineTo(-size * 0.58, size * 0.12);
    ctx.bezierCurveTo(-size * 0.88, -size * 0.28, -size * 0.42, -size * 0.7, 0, -size * 0.28);
    ctx.bezierCurveTo(size * 0.42, -size * 0.7, size * 0.88, -size * 0.28, size * 0.58, size * 0.12);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.05);
    ctx.lineTo(0, size * 0.36);
    ctx.moveTo(-size * 0.2, size * 0.15);
    ctx.lineTo(size * 0.2, size * 0.15);
    ctx.stroke();
  } else if (id === 'fortitude') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.76);
    ctx.lineTo(size * 0.63, -size * 0.46);
    ctx.lineTo(size * 0.52, size * 0.32);
    ctx.quadraticCurveTo(0, size * 0.82, -size * 0.52, size * 0.32);
    ctx.lineTo(-size * 0.63, -size * 0.46);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.02);
    ctx.lineTo(-size * 0.05, size * 0.26);
    ctx.lineTo(size * 0.36, -size * 0.25);
    ctx.stroke();
  } else if (id === 'eclipseArc') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.65, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'astralLance') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, size * 0.5);
    ctx.lineTo(size * 0.78, -size * 0.5);
    ctx.lineTo(size * 0.33, -size * 0.06);
    ctx.lineTo(size * 0.78, size * 0.15);
    ctx.stroke();
  } else if (id === 'sanctumThorns') {
    polygonPath(ctx, 8, size * 0.68);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const angle = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size * 0.18, Math.sin(angle) * size * 0.18);
      ctx.lineTo(Math.cos(angle) * size * 0.78, Math.sin(angle) * size * 0.78);
      ctx.stroke();
    }
  } else if (id === 'gravityWell') {
    for (let ring = 0; ring < 2; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(0, 0, size * (0.35 + ring * 0.28), size * (0.2 + ring * 0.22), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'starfeatherFamiliar') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.72);
    ctx.lineTo(size * 0.72, size * 0.45);
    ctx.lineTo(0, size * 0.2);
    ctx.lineTo(-size * 0.72, size * 0.45);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'crownOfBlades') {
    polygonPath(ctx, 6, size * 0.7);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      ctx.moveTo(Math.cos(angle) * size * 0.25, Math.sin(angle) * size * 0.25);
      ctx.lineTo(Math.cos(angle) * size * 0.82, Math.sin(angle) * size * 0.82);
    }
    ctx.stroke();
  } else if (id === 'thornJavelin') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.78, size * 0.44);
    ctx.lineTo(size * 0.78, -size * 0.44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.78, -size * 0.44);
    ctx.lineTo(size * 0.38, -size * 0.5);
    ctx.lineTo(size * 0.52, -size * 0.08);
    ctx.closePath();
    ctx.stroke();
  } else if (id === 'ricochetStar') {
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 4;
      const radius = i % 2 === 0 ? size * 0.78 : size * 0.28;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (id === 'prismRefraction') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.78);
    ctx.lineTo(size * 0.62, size * 0.5);
    ctx.lineTo(-size * 0.62, size * 0.5);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.lineTo(size * 0.8, 0);
    ctx.stroke();
  } else if (id === 'galeReaper') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.7, -Math.PI * 0.75, Math.PI * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, Math.PI * 0.25, Math.PI * 1.2);
    ctx.stroke();
  } else if (id === 'celestialFall') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.82);
    ctx.lineTo(size * 0.16, -size * 0.12);
    ctx.lineTo(size * 0.56, 0);
    ctx.lineTo(size * 0.12, size * 0.15);
    ctx.lineTo(0, size * 0.8);
    ctx.lineTo(-size * 0.12, size * 0.15);
    ctx.lineTo(-size * 0.56, 0);
    ctx.lineTo(-size * 0.16, -size * 0.12);
    ctx.closePath();
    ctx.stroke();
  } else if (id === 'echoShade') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.72);
    ctx.quadraticCurveTo(size * 0.7, -size * 0.2, size * 0.42, size * 0.58);
    ctx.quadraticCurveTo(0, size * 0.78, -size * 0.42, size * 0.58);
    ctx.quadraticCurveTo(-size * 0.7, -size * 0.2, 0, -size * 0.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size * 0.15, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'mirrorTwin') {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size * 0.8);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.lineTo(size * 0.8, 0);
    ctx.stroke();
  } else if (id === 'mistwoodRuneMine') {
    polygonPath(ctx, 6, size * 0.67);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, size * 0.15);
    ctx.lineTo(0, -size * 0.5);
    ctx.lineTo(size * 0.4, size * 0.15);
    ctx.stroke();
  } else if (id === 'moonreturnChakram') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.62, -Math.PI * 0.85, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
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
