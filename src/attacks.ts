import type { AttackCategory, AttackId, Enemy, Particle, Player, Stats, Vec2 } from './types';
import type { ArtAssets } from './assets';
import { clamp, distSq, drawGlow, hexToRgba, lerp, normalize, polygonPath } from './utils';

export interface AttackDefinition {
  id: Exclude<AttackId, 'lightning'>;
  name: string;
  description: string;
  category: AttackCategory;
  accent: string;
  maxRank: number;
  icon: string;
  upgradeDescription: (rank: number) => string;
  upgradeValue: (rank: number) => string;
}

const attack = (
  id: AttackDefinition['id'],
  name: string,
  description: string,
  category: AttackCategory,
  accent: string,
  icon: string,
  upgradeDescription: (rank: number) => string,
  upgradeValue: (rank: number) => string,
): AttackDefinition => ({ id, name, description, category, accent, icon, maxRank: 5, upgradeDescription, upgradeValue });

export const ATTACK_DEFINITIONS: AttackDefinition[] = [
  attack('eclipseArc', '月蝕刃環', '向面朝方向釋放短距離半月斬。', 'melee', '#d7c5ff', 'eclipse', (rank) => rank >= 4 ? '雙重弦月斬擊' : '斬幅與爆發傷害提升', (rank) => rank >= 4 ? '雙斬 · 斬幅 180°' : `傷害 ${90 + rank * 22}%`),
  attack('astralLance', '星界長槍', '發射可穿透多名敵人的星界長槍。', 'projectile', '#78caff', 'lance', (rank) => rank >= 3 ? '增加穿透與長槍數量' : '速度與穿透傷害提升', (rank) => `穿透 ${2 + rank} 名`),
  attack('sanctumThorns', '聖棘守護', '護盾減傷，受擊時以聖棘反擊。', 'field', '#ffe7a2', 'sanctum', (rank) => rank >= 4 ? '反擊追加第二圈聖棘' : '護盾時間與反擊傷害提升', (rank) => `減傷 ${12 + rank * 4}%`),
  attack('gravityWell', '重力霧井', '在敵群中心召喚牽引並持續傷害的霧井。', 'field', '#ad9aff', 'gravity', (rank) => rank >= 3 ? '牽引核心擴張並延長持續時間' : '範圍與牽引力提升', (rank) => `範圍 ${58 + rank * 12}`),
  attack('starfeatherFamiliar', '星羽魔鴉', '召喚飛行魔鴉，獨立追擊目標。', 'summon', '#a98dff', 'raven', (rank) => rank >= 3 ? '追加魔鴉並提升追擊速度' : '魔鴉攻速與傷害提升', (rank) => `${1 + Math.floor((rank - 1) / 2)} 隻魔鴉`),
  attack('crownOfBlades', '王冠飛刃', '古金符刃在身側環繞並切割接近的敵人。', 'orbital', '#f2cc78', 'blades', (rank) => rank >= 3 ? '追加飛刃並擴大環繞半徑' : '飛刃數量與旋速提升', (rank) => `${2 + rank} 把飛刃`),
  attack('thornJavelin', '荊棘投槍', '投出重型森林長槍，落地造成範圍爆發。', 'projectile', '#86c36c', 'javelin', (rank) => rank >= 3 ? '落地留下短暫荊棘地帶' : '投槍數量與落點範圍提升', (rank) => `爆炸範圍 ${34 + rank * 7}`),
  attack('ricochetStar', '星痕彈珠', '沿敵人之間彈跳的星晶投射物。', 'projectile', '#ffe079', 'ricochet', (rank) => rank >= 3 ? '彈跳後分裂出星痕' : '彈跳次數與距離提升', (rank) => `彈跳 ${2 + rank} 次`),
  attack('prismRefraction', '稜鏡折光', '以稜鏡折射多段幾何魔光。', 'beam', '#9ee7ff', 'prism', (rank) => rank >= 3 ? '追加稜鏡與折射角度' : '光束寬度與折射傷害提升', (rank) => `${2 + rank} 個稜鏡`),
  attack('galeReaper', '風蝕輪舞', '旋轉風刃獨立穿越敵群並留下葉痕。', 'melee', '#9ce7b3', 'gale', (rank) => rank >= 3 ? '風刃體積與旅行時間提升' : '旋速與切割傷害提升', (rank) => `持續 ${1.5 + rank * 0.35}s`),
  attack('celestialFall', '天穹星落', '在敵人腳下標記，延遲後降下星槍。', 'sky', '#ffdf8c', 'meteor', (rank) => rank >= 3 ? '追加同一區域的星落' : '落點數量與範圍提升', (rank) => `${1 + Math.floor(rank / 2)} 次星落`),
  attack('echoShade', '幽霧殘像', '召喚半透明殘像，模仿主攻擊。', 'summon', '#b6d9df', 'shade', (rank) => rank >= 3 ? '追加殘像並延長存在時間' : '殘像頻率與複製傷害提升', (rank) => `複製 ${38 + rank * 9}%`),
  attack('mirrorTwin', '雙生魔鏡', '在對側映出鏡像，同步發射投射物。', 'summon', '#b7d8ff', 'mirror', (rank) => rank >= 3 ? '鏡像增加偏轉角度' : '鏡像持續時間與傷害提升', (rank) => `鏡像 ${45 + rank * 8}%`),
  attack('mistwoodRuneMine', '霧林符雷', '在行進路徑留下靠近即爆的符文雷。', 'trap', '#96d98a', 'mine', (rank) => rank >= 3 ? '爆炸後留下根系毒霧' : '符雷數量與觸發範圍提升', (rank) => `${1 + Math.floor(rank / 2)} 枚符雷`),
  attack('moonreturnChakram', '迴月飛輪', '沿弧線飛出並返回的月輪，可往返命中。', 'projectile', '#b7dcff', 'chakram', (rank) => rank >= 3 ? '追加第二枚反向月輪' : '飛行距離與回程傷害提升', (rank) => `回程傷害 ${80 + rank * 16}%`),
];

const attackMap = new Map<AttackId, AttackDefinition>(ATTACK_DEFINITIONS.map((item) => [item.id, item]));
export const attackDefinition = (id: AttackId): AttackDefinition | undefined => attackMap.get(id);

interface AttackCallbacks {
  damage: (enemy: Enemy, multiplier: number, color: string) => void;
  burst: (x: number, y: number, color: string, amount: number, type: Particle['type']) => void;
  sound: (id: AttackId, intensity?: number) => void;
}

interface Projectile {
  kind: 'lance' | 'javelin' | 'star' | 'chakram';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  damage: number;
  color: string;
  hit: Set<number>;
  pierce: number;
  bounces: number;
  targetId?: number;
  startX?: number;
  startY?: number;
  targetX?: number;
  targetY?: number;
  t?: number;
  originX?: number;
  originY?: number;
  dirX?: number;
  dirY?: number;
  curve?: number;
  returning?: boolean;
}

interface Field {
  kind: 'gravity' | 'celestial' | 'prism' | 'gale' | 'thorn';
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tick: number;
  damage: number;
  color: string;
  targetX?: number;
  targetY?: number;
  rotation?: number;
}

interface Familiar {
  x: number;
  y: number;
  phase: number;
  targetId: number | null;
  attackTimer: number;
  life: number;
  damage: number;
}

interface Clone {
  x: number;
  y: number;
  phase: number;
  life: number;
  attackTimer: number;
  damage: number;
}

interface Mine {
  x: number;
  y: number;
  life: number;
  armed: number;
  radius: number;
  damage: number;
}

interface VisualPulse {
  kind: 'eclipse' | 'sanctum' | 'strike' | 'mirror';
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  angle?: number;
}

export class AttackSystem {
  private readonly cooldowns = new Map<AttackId, number>();
  private readonly projectiles: Projectile[] = [];
  private readonly fields: Field[] = [];
  private readonly familiars: Familiar[] = [];
  private readonly clones: Clone[] = [];
  private readonly mines: Mine[] = [];
  private readonly pulses: VisualPulse[] = [];
  private bladeContactTimer = 0;
  private thornsCooldown = 0;
  private pathX = 0;
  private pathY = 0;

  reset(player: Player): void {
    this.cooldowns.clear();
    this.projectiles.length = 0;
    this.fields.length = 0;
    this.familiars.length = 0;
    this.clones.length = 0;
    this.mines.length = 0;
    this.pulses.length = 0;
    this.bladeContactTimer = 0;
    this.thornsCooldown = 0;
    this.pathX = player.x;
    this.pathY = player.y;
  }

  getDamageReduction(stats: Stats): number {
    const rank = stats.attackRanks.sanctumThorns ?? 0;
    return clamp(stats.damageReduction + (stats.ownedAttacks.includes('sanctumThorns') ? 0.1 + rank * 0.028 : 0), 0, 0.7);
  }

  notifyPlayerHit(player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    const rank = stats.attackRanks.sanctumThorns ?? 0;
    if (!stats.ownedAttacks.includes('sanctumThorns') || rank < 1 || this.thornsCooldown > 0) return;
    this.thornsCooldown = Math.max(0.5, 2.7 - rank * 0.22);
    const radius = 56 + rank * 8;
    this.pulses.push({ kind: 'sanctum', x: player.x, y: player.y - 20, life: 0.42, maxLife: 0.42, radius });
    for (const enemy of enemies) {
      if (!enemy.dead && distSq(player, enemy) < (radius + enemy.radius) ** 2) callbacks.damage(enemy, 1.7 + rank * 0.45, '#ffe6a0');
    }
    callbacks.burst(player.x, player.y - 20, '#fff0b4', 12, 'glint');
    callbacks.sound('sanctumThorns', 1.2);
  }

  update(dt: number, time: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    this.thornsCooldown = Math.max(0, this.thornsCooldown - dt);
    this.bladeContactTimer = Math.max(0, this.bladeContactTimer - dt);
    this.pathX = lerp(this.pathX, player.x, 1 - Math.exp(-dt * 9));
    this.pathY = lerp(this.pathY, player.y, 1 - Math.exp(-dt * 9));
    for (const [id, value] of this.cooldowns) this.cooldowns.set(id, Math.max(0, value - dt));
    for (const pulse of this.pulses) pulse.life -= dt;
    this.updateProjectiles(dt, player, stats, enemies, callbacks);
    this.updateFields(dt, player, stats, enemies, callbacks);
    this.updateFamiliars(dt, player, stats, enemies, callbacks);
    this.updateClones(dt, player, stats, enemies, callbacks);
    this.updateMines(dt, player, stats, enemies, callbacks);
    this.updateOrbitals(dt, player, stats, enemies, callbacks);
    this.pulses.splice(0, this.pulses.length, ...this.pulses.filter((pulse) => pulse.life > 0));
    this.projectiles.splice(0, this.projectiles.length, ...this.projectiles.filter((projectile) => projectile.life > 0));
    this.fields.splice(0, this.fields.length, ...this.fields.filter((field) => field.life > 0));
    this.familiars.splice(0, this.familiars.length, ...this.familiars.filter((familiar) => familiar.life > 0));
    this.clones.splice(0, this.clones.length, ...this.clones.filter((clone) => clone.life > 0));
    this.mines.splice(0, this.mines.length, ...this.mines.filter((mine) => mine.life > 0));
    for (const id of stats.ownedAttacks) {
      if (id === 'lightning' || (this.cooldowns.get(id) ?? 0) > 0) continue;
      this.cast(id, time, player, stats, enemies, callbacks);
    }
  }

  private cast(id: Exclude<AttackId, 'lightning'>, time: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    const rank = this.rank(stats, id);
    const target = this.nearest(player, enemies, 420);
    const setCooldown = (base: number): void => { this.cooldowns.set(id, Math.max(0.45, base * Math.max(0.52, 1 - (rank - 1) * 0.075))); };
    if (id === 'eclipseArc') {
      const angle = Math.atan2(player.vy || Math.sin(player.facing16 * Math.PI / 8), player.vx || Math.cos(player.facing16 * Math.PI / 8));
      const radius = 67 + rank * 7;
      this.pulses.push({ kind: 'eclipse', x: player.x, y: player.y - 22, life: 0.28, maxLife: 0.28, radius, angle });
      for (const enemy of enemies) if (!enemy.dead && distSq(player, enemy) < (radius + enemy.radius) ** 2 && this.angleDifference(angle, Math.atan2(enemy.y - player.y, enemy.x - player.x)) < Math.PI * (0.52 + rank * 0.025)) callbacks.damage(enemy, 1.55 + rank * 0.36, '#e8d7ff');
      callbacks.burst(player.x + Math.cos(angle) * 34, player.y + Math.sin(angle) * 34, '#bfa8ff', 7, 'glint');
      callbacks.sound(id, 1);
      setCooldown(2.35);
      return;
    }
    if (id === 'astralLance' && target) {
      const direction = normalize(target.x - player.x, target.y - player.y);
      this.projectiles.push({ kind: 'lance', x: player.x, y: player.y - 25, vx: direction.x * (340 + rank * 24), vy: direction.y * (340 + rank * 24), life: 1.5, maxLife: 1.5, damage: 1.4 + rank * 0.27, color: '#8cd4ff', hit: new Set(), pierce: 2 + rank, bounces: 0 });
      callbacks.sound(id, 1);
      setCooldown(1.7);
      return;
    }
    if (id === 'sanctumThorns') {
      this.fields.push({ kind: 'thorn', x: player.x, y: player.y - 18, radius: 36 + rank * 4, life: 2.4 + rank * 0.45, maxLife: 2.4 + rank * 0.45, tick: 0, damage: 0, color: '#ffe7a2' });
      callbacks.sound(id, 0.65);
      setCooldown(5.8);
      return;
    }
    if (id === 'gravityWell' && target) {
      this.fields.push({ kind: 'gravity', x: target.x, y: target.y, radius: 58 + rank * 11, life: 3.2 + rank * 0.34, maxLife: 3.2 + rank * 0.34, tick: 0, damage: 0.82 + rank * 0.21, color: '#8f84df', rotation: Math.random() * Math.PI });
      callbacks.sound(id, 0.9);
      setCooldown(5.4);
      return;
    }
    if (id === 'starfeatherFamiliar') {
      const wanted = 1 + Math.floor((rank - 1) / 2);
      while (this.familiars.length < wanted) this.familiars.push({ x: player.x + randomRange(-35, 35), y: player.y - 35 + randomRange(-18, 18), phase: Math.random() * 10, targetId: null, attackTimer: 0.3, life: 999, damage: 0.8 + rank * 0.2 });
      callbacks.sound(id, 0.8);
      setCooldown(7.6);
      return;
    }
    if (id === 'crownOfBlades') {
      callbacks.sound(id, 0.45);
      setCooldown(7.2);
      return;
    }
    if (id === 'thornJavelin' && target) {
      const count = rank >= 4 ? 2 : 1;
      for (let index = 0; index < count; index += 1) {
        const offset = (index - (count - 1) / 2) * 26;
        this.projectiles.push({ kind: 'javelin', x: player.x, y: player.y - 18, vx: 0, vy: 0, life: 1.2, maxLife: 1.2, damage: 1.5 + rank * 0.3, color: '#a8dc76', hit: new Set(), pierce: 0, bounces: 0, startX: player.x, startY: player.y - 18, targetX: target.x + offset, targetY: target.y + offset * 0.4, t: 0 });
      }
      callbacks.sound(id, 1);
      setCooldown(3.1);
      return;
    }
    if (id === 'ricochetStar' && target) {
      const direction = normalize(target.x - player.x, target.y - player.y);
      this.projectiles.push({ kind: 'star', x: player.x, y: player.y - 28, vx: direction.x * 250, vy: direction.y * 250, life: 2.7, maxLife: 2.7, damage: 1.1 + rank * 0.2, color: '#f6d66d', hit: new Set(), pierce: 0, bounces: 2 + rank, targetId: target.id });
      callbacks.sound(id, 0.9);
      setCooldown(2.7);
      return;
    }
    if (id === 'prismRefraction') {
      const count = 2 + rank;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + player.orbitAngle * 0.18;
        this.fields.push({ kind: 'prism', x: player.x + Math.cos(angle) * (48 + rank * 3), y: player.y - 28 + Math.sin(angle) * (30 + rank * 2), radius: 8, life: 2.2 + rank * 0.2, maxLife: 2.2 + rank * 0.2, tick: 0.2, damage: 0.6 + rank * 0.18, color: '#b7f4ff', rotation: angle });
      }
      callbacks.sound(id, 0.9);
      setCooldown(5.9);
      return;
    }
    if (id === 'galeReaper' && target) {
      const direction = normalize(target.x - player.x, target.y - player.y);
      this.fields.push({ kind: 'gale', x: player.x, y: player.y - 20, radius: 23 + rank * 4, life: 2.1 + rank * 0.3, maxLife: 2.1 + rank * 0.3, tick: 0.12, damage: 1.05 + rank * 0.25, color: '#a8f1c0', rotation: Math.atan2(direction.y, direction.x) });
      callbacks.sound(id, 0.8);
      setCooldown(4.8);
      return;
    }
    if (id === 'celestialFall') {
      const targets = enemies.filter((enemy) => !enemy.dead).sort((a, b) => distSq(player, a) - distSq(player, b)).slice(0, 1 + Math.floor(rank / 2));
      for (const enemy of targets) this.fields.push({ kind: 'celestial', x: enemy.x, y: enemy.y, radius: 28 + rank * 6, life: 0.72, maxLife: 0.72, tick: 0, damage: 1.8 + rank * 0.34, color: '#ffdb86', targetX: enemy.x, targetY: enemy.y });
      if (targets.length) callbacks.sound(id, 1);
      setCooldown(6.5);
      return;
    }
    if (id === 'echoShade') {
      const wanted = 1 + Math.floor((rank - 1) / 3);
      while (this.clones.length < wanted) this.clones.push({ x: player.x + randomRange(-60, 60), y: player.y + randomRange(-40, 40), phase: Math.random() * 8, life: 8 + rank * 1.2, attackTimer: 0.25, damage: 0.34 + rank * 0.09 });
      callbacks.sound(id, 0.75);
      setCooldown(10.8);
      return;
    }
    if (id === 'mirrorTwin') {
      this.fields.push({ kind: 'prism', x: player.x, y: player.y - 24, radius: 15, life: 8 + rank * 1.1, maxLife: 8 + rank * 1.1, tick: 0.55, damage: 0.7 + rank * 0.16, color: '#d5e6ff', rotation: Math.PI / 2 });
      callbacks.sound(id, 0.65);
      setCooldown(8.4);
      return;
    }
    if (id === 'mistwoodRuneMine') {
      const mineCount = 1 + Math.floor(rank / 3);
      for (let index = 0; index < mineCount; index += 1) this.mines.push({ x: this.pathX + randomRange(-18, 18), y: this.pathY + randomRange(-18, 18), life: 16, armed: 0.38, radius: 34 + rank * 6, damage: 1.4 + rank * 0.26 });
      callbacks.sound(id, 0.7);
      setCooldown(4.9);
      return;
    }
    if (id === 'moonreturnChakram' && target) {
      const direction = normalize(target.x - player.x, target.y - player.y);
      this.projectiles.push({ kind: 'chakram', x: player.x, y: player.y - 28, vx: 0, vy: 0, life: 2.1, maxLife: 2.1, damage: 1.28 + rank * 0.26, color: '#bddfff', hit: new Set(), pierce: 0, bounces: 0, originX: player.x, originY: player.y - 28, dirX: direction.x, dirY: direction.y, curve: 26 + rank * 5, t: 0 });
      callbacks.sound(id, 0.9);
      setCooldown(4.4);
    }
  }

  private updateProjectiles(dt: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    for (const projectile of this.projectiles) {
      projectile.life -= dt;
      if (projectile.kind === 'javelin') {
        projectile.t = (projectile.t ?? 0) + dt / 0.66;
        const t = clamp(projectile.t, 0, 1);
        projectile.x = lerp(projectile.startX ?? player.x, projectile.targetX ?? player.x, t);
        projectile.y = lerp(projectile.startY ?? player.y, projectile.targetY ?? player.y, t) - Math.sin(t * Math.PI) * 48;
        if (t >= 1 && projectile.life > 0) {
          projectile.life = 0;
          for (const enemy of enemies) if (!enemy.dead && distSq(projectile, enemy) < (34 + this.rank(stats, 'thornJavelin') * 7 + enemy.radius) ** 2) callbacks.damage(enemy, projectile.damage, projectile.color);
          callbacks.burst(projectile.targetX ?? projectile.x, projectile.targetY ?? projectile.y, '#a8dc76', 15, 'leaf');
        }
      } else if (projectile.kind === 'star') {
        const target = enemies.find((enemy) => enemy.id === projectile.targetId && !enemy.dead) ?? this.nearest(projectile, enemies, 230, projectile.hit);
        if (target) {
          const direction = normalize(target.x - projectile.x, target.y - projectile.y);
          projectile.vx = lerp(projectile.vx, direction.x * 260, 1 - Math.exp(-dt * 6));
          projectile.vy = lerp(projectile.vy, direction.y * 260, 1 - Math.exp(-dt * 6));
        }
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
      } else if (projectile.kind === 'chakram') {
        projectile.t = (projectile.t ?? 0) + dt / 1.05;
        const t = clamp(projectile.t, 0, 1);
        const outward = t <= 0.5 ? t * 2 : (1 - t) * 2;
        const side = Math.sin(t * Math.PI) * (projectile.curve ?? 25);
        const dx = projectile.dirX ?? 1;
        const dy = projectile.dirY ?? 0;
        projectile.x = (projectile.originX ?? player.x) + dx * (outward * 230) - dy * side;
        projectile.y = (projectile.originY ?? player.y) + dy * (outward * 230) + dx * side;
      } else {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
      }
      for (const enemy of enemies) {
        if (enemy.dead || projectile.hit.has(enemy.id)) continue;
        if (distSq(projectile, enemy) > (enemy.radius + (projectile.kind === 'lance' ? 8 : 13)) ** 2) continue;
        projectile.hit.add(enemy.id);
        callbacks.damage(enemy, projectile.damage, projectile.color);
        callbacks.burst(enemy.x, enemy.y, projectile.color, projectile.kind === 'lance' ? 4 : 7, 'glint');
        if (projectile.kind === 'star' && projectile.bounces > 0) {
          projectile.bounces -= 1;
          const next = this.nearest(projectile, enemies, 190, projectile.hit);
          projectile.targetId = next?.id;
          if (!next) projectile.life = 0;
          callbacks.sound('ricochetStar', 0.42);
        } else if (projectile.kind === 'lance') {
          projectile.pierce -= 1;
          if (projectile.pierce < 0) projectile.life = 0;
        } else if (projectile.kind === 'chakram') {
          callbacks.sound('moonreturnChakram', 0.26);
        } else if (projectile.kind === 'javelin') {
          projectile.life = 0;
        }
      }
    }
  }

  private updateFields(dt: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    for (const field of this.fields) {
      field.life -= dt;
      field.tick -= dt;
      field.rotation = (field.rotation ?? 0) + dt * (field.kind === 'gravity' ? -0.8 : 1.2);
      if (field.kind === 'gravity') {
        for (const enemy of enemies) {
          if (enemy.dead) continue;
          const dx = field.x - enemy.x;
          const dy = field.y - enemy.y;
          const distance = Math.hypot(dx, dy);
          if (distance < field.radius && distance > 1) {
            enemy.x += (dx / distance) * dt * 52;
            enemy.y += (dy / distance) * dt * 52;
          }
          if (field.tick <= 0 && distance < field.radius) callbacks.damage(enemy, field.damage, field.color);
        }
        if (field.tick <= 0) field.tick = 0.34;
      } else if (field.kind === 'celestial' && field.life <= 0 && field.maxLife > 0) {
        field.maxLife = -1;
        this.pulses.push({ kind: 'strike', x: field.x, y: field.y, life: 0.48, maxLife: 0.48, radius: field.radius });
        for (const enemy of enemies) if (!enemy.dead && distSq(field, enemy) < (field.radius + enemy.radius) ** 2) callbacks.damage(enemy, field.damage, field.color);
        callbacks.burst(field.x, field.y, '#ffe6a0', 14, 'glint');
        callbacks.sound('celestialFall', 0.9);
      } else if (field.kind === 'prism') {
        const mirror = field.radius > 12;
        if (field.tick <= 0) {
          const source = mirror ? { x: player.x * 2 - field.x, y: player.y * 2 - field.y } : player;
          const target = this.nearest(source, enemies, 245);
          if (target) {
            for (const enemy of enemies) {
              if (enemy.dead) continue;
              const distance = this.distanceToSegment(enemy, source, field);
              if (distance < enemy.radius + 7) callbacks.damage(enemy, field.damage * (mirror ? 1.1 : 1), field.color);
            }
          }
          field.tick = mirror ? 0.64 : 0.42;
        }
      } else if (field.kind === 'gale') {
        field.x += Math.cos(field.rotation ?? 0) * dt * 120;
        field.y += Math.sin(field.rotation ?? 0) * dt * 120;
        if (field.tick <= 0) {
          for (const enemy of enemies) if (!enemy.dead && distSq(field, enemy) < (field.radius + enemy.radius) ** 2) callbacks.damage(enemy, field.damage, field.color);
          field.tick = 0.18;
        }
      }
    }
  }

  private updateFamiliars(dt: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    for (const familiar of this.familiars) {
      familiar.attackTimer -= dt;
      const target = enemies.find((enemy) => enemy.id === familiar.targetId && !enemy.dead) ?? this.nearest(familiar, enemies, 340);
      familiar.targetId = target?.id ?? null;
      const desired = target ? normalize(target.x - familiar.x, target.y - familiar.y) : normalize(player.x + Math.cos(familiar.phase) * 72 - familiar.x, player.y - 32 + Math.sin(familiar.phase) * 44 - familiar.y);
      familiar.x = lerp(familiar.x, familiar.x + desired.x * 100 * dt, 1);
      familiar.y = lerp(familiar.y, familiar.y + desired.y * 100 * dt, 1);
      if (target && familiar.attackTimer <= 0 && distSq(familiar, target) < 42 ** 2) {
        callbacks.damage(target, familiar.damage, '#bba2ff');
        callbacks.burst(target.x, target.y, '#bba2ff', 4, 'glint');
        callbacks.sound('starfeatherFamiliar', 0.3);
        familiar.attackTimer = Math.max(0.55, 1.25 - this.rank(stats, 'starfeatherFamiliar') * 0.1);
      }
      familiar.phase += dt * 2;
    }
  }

  private updateClones(dt: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    for (const clone of this.clones) {
      clone.life -= dt;
      clone.attackTimer -= dt;
      clone.x = lerp(clone.x, player.x + Math.cos(clone.phase) * 64, 1 - Math.exp(-dt * 2.4));
      clone.y = lerp(clone.y, player.y + Math.sin(clone.phase) * 44, 1 - Math.exp(-dt * 2.4));
      if (clone.attackTimer <= 0) {
        const target = this.nearest(clone, enemies, 270);
        if (target) {
          callbacks.damage(target, clone.damage * stats.orbDamageMultiplier, '#a9d4d9');
          callbacks.burst(target.x, target.y, '#bce9e9', 3, 'glint');
          callbacks.sound('echoShade', 0.24);
        }
        clone.attackTimer = 1.45;
      }
      clone.phase += dt * 0.7;
    }
  }

  private updateMines(dt: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    for (const mine of this.mines) {
      mine.life -= dt;
      mine.armed = Math.max(0, mine.armed - dt);
      if (mine.armed > 0) continue;
      const target = enemies.find((enemy) => !enemy.dead && distSq(mine, enemy) < (mine.radius + enemy.radius) ** 2);
      if (target) {
        mine.life = 0;
        for (const enemy of enemies) if (!enemy.dead && distSq(mine, enemy) < (mine.radius + enemy.radius) ** 2) callbacks.damage(enemy, mine.damage, '#9bd878');
        callbacks.burst(mine.x, mine.y, '#96d98a', 16, 'leaf');
        callbacks.sound('mistwoodRuneMine', 0.95);
      }
    }
  }

  private updateOrbitals(dt: number, player: Player, stats: Stats, enemies: Enemy[], callbacks: AttackCallbacks): void {
    if (!stats.ownedAttacks.includes('crownOfBlades')) return;
    const rank = this.rank(stats, 'crownOfBlades');
    if (this.bladeContactTimer > 0) return;
    this.bladeContactTimer = Math.max(0.08, 0.22 - rank * 0.018);
    const count = 2 + rank;
    for (let index = 0; index < count; index += 1) {
      const angle = player.orbitAngle * (1.3 + rank * 0.08) + (Math.PI * 2 * index) / count;
      const x = player.x + Math.cos(angle) * (54 + rank * 4);
      const y = player.y - 20 + Math.sin(angle) * (33 + rank * 2);
      for (const enemy of enemies) if (!enemy.dead && distSq({ x, y }, enemy) < (enemy.radius + 13) ** 2) callbacks.damage(enemy, 0.62 + rank * 0.13, '#f4d28a');
    }
  }

  draw(ctx: CanvasRenderingContext2D, player: Player, stats: Stats, time: number, assets?: ArtAssets): void {
    ctx.save();
    for (const field of this.fields) this.drawField(ctx, field, player, time, assets);
    for (const mine of this.mines) this.drawMine(ctx, mine, time, assets);
    for (const familiar of this.familiars) this.drawFamiliar(ctx, familiar, time, assets);
    for (const clone of this.clones) this.drawClone(ctx, clone, time, assets);
    for (const projectile of this.projectiles) this.drawProjectile(ctx, projectile, time, assets);
    if (stats.ownedAttacks.includes('crownOfBlades')) this.drawBlades(ctx, player, this.rank(stats, 'crownOfBlades'), time, assets);
    for (const pulse of this.pulses) this.drawPulse(ctx, pulse, time);
    ctx.restore();
  }

  private drawField(ctx: CanvasRenderingContext2D, field: Field, player: Player, time: number, assets?: ArtAssets): void {
    const alpha = clamp(field.life / field.maxLife, 0, 1);
    ctx.save();
    ctx.translate(field.x, field.y);
    ctx.rotate(field.rotation ?? 0);
    ctx.globalCompositeOperation = 'lighter';
    if (field.kind === 'gravity') {
      drawGlow(ctx, 0, 0, field.radius * 0.9, '#8276d7', 0.3 * alpha);
      ctx.strokeStyle = hexToRgba('#ae9aff', 0.75 * alpha);
      ctx.lineWidth = 1.5;
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, field.radius * (0.38 + ring * 0.27), field.radius * (0.2 + ring * 0.2), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = hexToRgba('#d4caff', 0.7 * alpha);
      for (let i = 0; i < 5; i += 1) {
        const angle = time * 0.001 + i * 1.2;
        const stoneX = Math.cos(angle) * field.radius * 0.55;
        const stoneY = Math.sin(angle) * field.radius * 0.28;
        ctx.save();
        ctx.translate(stoneX, stoneY);
        ctx.rotate(angle * 1.8);
        ctx.fillRect(-2.8, -2.8, 5.6, 5.6);
        ctx.restore();
      }
      ctx.globalAlpha = 0.7 * alpha;
      ctx.strokeStyle = '#d7d0ff';
      ctx.beginPath();
      ctx.arc(0, 0, field.radius * 0.12, time * 0.002, time * 0.002 + Math.PI * 1.4);
      ctx.stroke();
    } else if (field.kind === 'thorn') {
      drawGlow(ctx, 0, 0, field.radius * 0.8, '#ffd77d', 0.18 * alpha);
      ctx.fillStyle = hexToRgba('#86b86b', 0.16 * alpha);
      ctx.beginPath();
      ctx.arc(0, 0, field.radius * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba('#ffe6a0', 0.82 * alpha);
      ctx.lineWidth = 1.4;
      polygonPath(ctx, 8, field.radius);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
        ctx.lineTo(Math.cos(angle) * field.radius * 0.82, Math.sin(angle) * field.radius * 0.82);
        ctx.stroke();
        ctx.fillStyle = '#fff0b4';
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * field.radius, Math.sin(angle) * field.radius);
        ctx.lineTo(Math.cos(angle - 0.12) * field.radius * 0.78, Math.sin(angle - 0.12) * field.radius * 0.78);
        ctx.lineTo(Math.cos(angle + 0.12) * field.radius * 0.78, Math.sin(angle + 0.12) * field.radius * 0.78);
        ctx.closePath();
        ctx.fill();
      }
    } else if (field.kind === 'celestial') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = hexToRgba('#ffdc86', 0.86 * (1 - alpha * 0.35));
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, field.radius * (1.05 - alpha * 0.18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hexToRgba('#fff2bb', 0.12 + (1 - alpha) * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, field.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToRgba('#fff8da', 0.7 * (1 - alpha));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -field.radius * 1.1);
      ctx.lineTo(0, field.radius * 1.1);
      ctx.moveTo(-field.radius * 1.1, 0);
      ctx.lineTo(field.radius * 1.1, 0);
      ctx.stroke();
    } else if (field.kind === 'prism') {
      const mirror = field.radius > 12;
      ctx.strokeStyle = hexToRgba(mirror ? '#d9e8ff' : '#a8efff', 0.8 * alpha);
      ctx.lineWidth = mirror ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -field.radius);
      ctx.lineTo(field.radius * 0.75, field.radius * 0.6);
      ctx.lineTo(-field.radius * 0.75, field.radius * 0.6);
      ctx.closePath();
      ctx.stroke();
      if (mirror) {
        ctx.globalAlpha = 0.45 * alpha;
        ctx.fillStyle = '#c9e7ff';
        ctx.fillRect(-3, -36, 6, 72);
        ctx.globalAlpha = 0.8 * alpha;
        ctx.strokeStyle = '#f3fbff';
        ctx.beginPath();
        ctx.moveTo(-field.radius * 1.2, 0);
        ctx.lineTo(field.radius * 1.2, 0);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.7 * alpha;
        ctx.beginPath();
        ctx.moveTo(-field.radius, field.radius * 0.3);
        ctx.lineTo(field.radius, -field.radius * 0.3);
        ctx.stroke();
      }
    } else if (field.kind === 'gale') {
      ctx.strokeStyle = hexToRgba('#b9f3c8', 0.82 * alpha);
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, field.radius, -1.1, 1.35);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, field.radius * 0.7, 0.8, 3.1);
      ctx.stroke();
      ctx.strokeStyle = hexToRgba('#f3ffe0', 0.6 * alpha);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, field.radius * 1.12, -0.65, 0.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMine(ctx: CanvasRenderingContext2D, mine: Mine, time: number, assets?: ArtAssets): void {
    const pulse = 1 + Math.sin(time * 0.006 + mine.x) * 0.06;
    ctx.save();
    ctx.translate(mine.x, mine.y);
    ctx.globalCompositeOperation = 'lighter';
    if (assets?.drawAttackIcon(ctx, 'mistwoodRuneMine', 0, 0, 46 * pulse, time * 0.001, 0.78)) {
      ctx.restore();
      return;
    }
    drawGlow(ctx, 0, 0, 22 * pulse, '#8bdd86', 0.45);
    ctx.strokeStyle = '#c4eea2';
    ctx.lineWidth = 1.2;
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(0, -8);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawFamiliar(ctx: CanvasRenderingContext2D, familiar: Familiar, time: number, assets?: ArtAssets): void {
    ctx.save();
    ctx.translate(familiar.x, familiar.y + Math.sin(time * 0.004 + familiar.phase) * 4);
    ctx.globalCompositeOperation = 'lighter';
    if (assets?.drawAttackIcon(ctx, 'starfeatherFamiliar', 0, 0, 48, familiar.phase * 0.15, 0.86)) {
      ctx.restore();
      return;
    }
    drawGlow(ctx, 0, 0, 22, '#9f8aff', 0.6);
    ctx.fillStyle = '#cfbcff';
    ctx.strokeStyle = '#33275e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 4);
    ctx.lineTo(3, 3);
    ctx.lineTo(0, 11);
    ctx.lineTo(-3, 3);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawClone(ctx: CanvasRenderingContext2D, clone: Clone, time: number, assets?: ArtAssets): void {
    const alpha = clamp(clone.life / 1.3, 0, 0.52);
    ctx.save();
    ctx.translate(clone.x, clone.y + Math.sin(time * 0.003 + clone.phase) * 3);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    if (assets?.drawAttackIcon(ctx, 'echoShade', 0, 0, 60, clone.phase * 0.12, 0.52 * alpha)) {
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#bde1e2';
    ctx.strokeStyle = '#d4ffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(22, -18, 16, 13);
    ctx.quadraticCurveTo(0, 24, -16, 13);
    ctx.quadraticCurveTo(-22, -18, 0, -26);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile, time: number, assets?: ArtAssets): void {
    const attackId = projectile.kind === 'lance'
      ? 'astralLance'
      : projectile.kind === 'javelin'
        ? 'thornJavelin'
        : projectile.kind === 'star'
          ? 'ricochetStar'
          : 'moonreturnChakram';
    const directionX = projectile.kind === 'chakram' ? projectile.dirX ?? 1 : projectile.kind === 'javelin' ? (projectile.targetX ?? projectile.x) - projectile.x : projectile.vx;
    const directionY = projectile.kind === 'chakram' ? projectile.dirY ?? 0 : projectile.kind === 'javelin' ? (projectile.targetY ?? projectile.y) - projectile.y : projectile.vy;
    const rotation = Math.atan2(directionY, directionX) + (projectile.kind === 'chakram' ? time * 0.012 : 0);
    const size = projectile.kind === 'lance' ? 72 : projectile.kind === 'javelin' ? 60 : projectile.kind === 'chakram' ? 64 : 52;
    if (assets?.drawAttackIcon(ctx, attackId, projectile.x, projectile.y, size, rotation, 0.9)) return;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(rotation);
    ctx.globalCompositeOperation = 'lighter';
    if (projectile.kind === 'lance') {
      drawGlow(ctx, 0, 0, 44, '#55cfff', 0.56);
      ctx.fillStyle = '#dffaff';
      ctx.strokeStyle = '#6abfff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(7, -5.8);
      ctx.lineTo(-26, -2.5);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-26, 2.5);
      ctx.lineTo(7, 5.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2d7de8';
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(9, -3);
      ctx.lineTo(9, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#eaffff';
      ctx.beginPath();
      ctx.moveTo(-18, -2);
      ctx.lineTo(-34, -8);
      ctx.moveTo(-18, 2);
      ctx.lineTo(-34, 8);
      ctx.stroke();
    } else if (projectile.kind === 'javelin') {
      drawGlow(ctx, 0, 0, 34, '#77c86c', 0.42);
      ctx.strokeStyle = '#6e4729';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, 2);
      ctx.lineTo(17, -1);
      ctx.stroke();
      ctx.fillStyle = '#d9e7a6';
      ctx.strokeStyle = '#7fa655';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(27, 0);
      ctx.lineTo(13, -7);
      ctx.lineTo(17, 0);
      ctx.lineTo(13, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#69b36a';
      ctx.beginPath();
      ctx.ellipse(-12, -7, 7, 2.5, -0.35, 0, Math.PI * 2);
      ctx.ellipse(-5, 7, 7, 2.5, 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (projectile.kind === 'star') {
      drawGlow(ctx, 0, 0, 28, '#ffe47b', 0.62);
      ctx.fillStyle = '#fff4b5';
      ctx.strokeStyle = '#efb84e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? 12 : 4.8;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#faffff';
      ctx.beginPath();
      ctx.moveTo(-17, -10);
      ctx.lineTo(-25, -15);
      ctx.moveTo(-18, 11);
      ctx.lineTo(-27, 16);
      ctx.stroke();
    } else if (projectile.kind === 'chakram') {
      drawGlow(ctx, 0, 0, 36, '#8fd9ff', 0.52);
      ctx.strokeStyle = '#cceeff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, -Math.PI * 0.82, Math.PI * 0.82);
      ctx.stroke();
      ctx.strokeStyle = '#d8ae62';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 7, Math.PI * 0.18, Math.PI * 1.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBlades(ctx: CanvasRenderingContext2D, player: Player, rank: number, time: number, assets?: ArtAssets): void {
    const count = 2 + rank;
    for (let index = 0; index < count; index += 1) {
      const angle = player.orbitAngle * (1.3 + rank * 0.08) + (Math.PI * 2 * index) / count;
      const x = player.x + Math.cos(angle) * (54 + rank * 4);
      const y = player.y - 20 + Math.sin(angle) * (33 + rank * 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2 + Math.sin(time * 0.004 + index) * 0.2);
      ctx.globalCompositeOperation = 'lighter';
      if (assets?.drawAttackIcon(ctx, 'crownOfBlades', 0, 0, 44, 0, 0.9)) {
        ctx.restore();
        continue;
      }
      drawGlow(ctx, 0, 0, 15, '#f1c96c', 0.38);
      ctx.fillStyle = '#f3e6bd';
      ctx.strokeStyle = '#b88439';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(5, 4);
      ctx.lineTo(0, 10);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPulse(ctx: CanvasRenderingContext2D, pulse: VisualPulse, time: number): void {
    const alpha = clamp(pulse.life / pulse.maxLife, 0, 1);
    const progress = 1 - alpha;
    ctx.save();
    ctx.translate(pulse.x, pulse.y);
    ctx.globalCompositeOperation = 'lighter';
    if (pulse.kind === 'eclipse') {
      ctx.rotate(pulse.angle ?? 0);
      ctx.strokeStyle = hexToRgba('#e9dcff', alpha);
      ctx.lineWidth = 5 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, pulse.radius * (0.5 + progress * 0.5), -Math.PI * 0.52, Math.PI * 0.52);
      ctx.stroke();
    } else if (pulse.kind === 'sanctum') {
      ctx.strokeStyle = hexToRgba('#fff0b4', alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse.radius * (1.2 - progress * 0.35), 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4 + time * 0.001;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * pulse.radius, Math.sin(a) * pulse.radius);
        ctx.stroke();
      }
    } else if (pulse.kind === 'strike') {
      drawGlow(ctx, 0, 0, pulse.radius, '#ffe39a', alpha * 0.75);
      ctx.fillStyle = hexToRgba('#fff4c3', alpha * 0.75);
      ctx.fillRect(-2, -pulse.radius * 1.8, 4, pulse.radius * 3.6);
      ctx.strokeStyle = hexToRgba('#fff0aa', alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse.radius * (0.35 + progress * 0.65), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = hexToRgba('#d9e8ff', alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 28 + progress * 18, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private rank(stats: Stats, id: AttackId): number {
    return clamp(stats.attackRanks[id] ?? 1, 1, 5);
  }

  private nearest(origin: Vec2, enemies: Enemy[], range: number, excluded = new Set<number>()): Enemy | null {
    let best: Enemy | null = null;
    let bestDistance = range * range;
    for (const enemy of enemies) {
      if (enemy.dead || excluded.has(enemy.id)) continue;
      const distance = distSq(origin, enemy);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  }

  private angleDifference(first: number, second: number): number {
    let difference = Math.abs(first - second) % (Math.PI * 2);
    if (difference > Math.PI) difference = Math.PI * 2 - difference;
    return difference;
  }

  private distanceToSegment(point: Vec2, start: Vec2, end: Vec2): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / Math.max(lengthSq, 1), 0, 1);
    return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
  }
}

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);
