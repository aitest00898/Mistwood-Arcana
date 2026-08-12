export type GameState = 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER';
export type EnemyKind = 'blue' | 'green' | 'yellow' | 'red' | 'violet';
export type PickupColor = 'cyan' | 'green' | 'yellow' | 'red';
export type SkillId = 'lightning' | 'blessing' | 'ray' | 'vortex' | 'embrace' | 'blade';
export type Rarity = '垃圾' | '普通' | '罕見!' | '史詩!!' | '傳說!!!';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxHp: number;
  hp: number;
  xp: number;
  xpToNext: number;
  level: number;
  facing: number;
  bob: number;
  hitFlash: number;
  invulnerable: number;
  kills: number;
  orbitAngle: number;
}

export interface Stats {
  orbCount: number;
  orbDamageMultiplier: number;
  attackInterval: number;
  attackRadius: number;
  chainCount: number;
  chainRange: number;
  baseDamage: number;
  critRate: number;
  critMultiplier: number;
  moveSpeedMultiplier: number;
  pickupRadius: number;
  maxHpBonus: number;
  dotDuration: number;
  dotDamage: number;
  damageReduction: number;
  skillLevels: Record<SkillId, number>;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  kind: EnemyKind;
  phase: number;
  hitFlash: number;
  hitStun: number;
  contactCooldown: number;
  dead: boolean;
  dotTimer: number;
  dotTick: number;
}

export interface Pickup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  color: PickupColor;
  phase: number;
  life: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'poof' | 'shadow' | 'leaf' | 'glint';
  rotation: number;
  gravity: number;
}

export interface DamageText {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  crit: boolean;
  color: string;
}

export interface LightningArc {
  from: Vec2;
  to: Vec2;
  life: number;
  maxLife: number;
  seed: number;
  branch: boolean;
}

export interface OrbPosition extends Vec2 {
  pulse: number;
}

export interface Rock {
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  seed: number;
  moss: string;
}

export interface GrassDetail {
  x: number;
  y: number;
  scale: number;
  tint: string;
  lean: number;
}

export interface FlowerDetail {
  x: number;
  y: number;
  color: string;
  scale: number;
}

export interface TreeDetail {
  x: number;
  y: number;
  width: number;
  height: number;
  tint: string;
  seed: number;
}

export interface UpgradeCard {
  id: SkillId;
  rarity: Rarity;
  level: number;
  title: string;
  description: string;
  value: string;
  accent: string;
}
