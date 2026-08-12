import './styles.css';
import { AudioEngine } from './audio';
import { ArtAssets, ENEMIES, HEROES, enemyDefinition, heroDefinition } from './assets';
import { GAME_HEIGHT, GAME_WIDTH, MAX_ENEMIES, MONO_FONT, PLAYER_RADIUS, PLAYER_SPEED, WORLD_HEIGHT, WORLD_WIDTH } from './config';
import { drawEnemy, drawOrb, drawParticle, drawPickup, drawPlayer, makeEnemy, makePlayer } from './entities';
import { InputManager } from './input';
import { applyUpgrade, initialStats, rollUpgradeCards } from './upgrades';
import type { DamageText, Enemy, GameState, LightningArc, OrbPosition, Particle, Pickup, Player, Stats, UpgradeCard, Vec2 } from './types';
import { GameUI } from './ui';
import { World } from './world';
import { clamp, distSq, hexToRgba, lerp, normalize, randomRange, seededRandom } from './utils';
import { registerPwa } from './pwa';

class MistwoodGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly world: World;
  private readonly input: InputManager;
  private readonly audio: AudioEngine;
  private readonly ui: GameUI;
  private readonly assets: ArtAssets;
  private player: Player;
  private stats: Stats;
  private state: GameState = 'CHARACTER_SELECT';
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private texts: DamageText[] = [];
  private lightnings: LightningArc[] = [];
  private cards: UpgradeCard[] = [];
  private camera: Vec2 = { x: 0, y: 0 };
  private elapsed = 0;
  private lastTimestamp = 0;
  private enemyTimer = 0.1;
  private attackTimer = 0.45;
  private ambientTimer = 0;
  private nextEnemyId = 1;
  private pendingLevelUps = 0;
  private selectedHeroIndex = 0;
  private readonly debug = new URLSearchParams(window.location.search).has('debug');

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D context is unavailable');
    this.ctx = context;
    this.world = new World();
    this.input = new InputManager(canvas);
    this.audio = new AudioEngine();
    this.assets = new ArtAssets();
    this.ui = new GameUI({
      onMute: () => this.audio.toggle(),
      onUpgrade: (index) => this.selectUpgrade(index),
      onRestart: () => this.reset(),
      onHeroSelect: (index) => this.selectHero(index),
      onStartRun: () => this.startRun(),
    });
    this.player = makePlayer(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, HEROES[0].id);
    this.stats = initialStats();
    this.input.onPoint = (point) => this.handlePoint(point);
    this.input.onKey = (key) => this.handleKey(key);
    this.input.onInteract = () => this.audio.startMusic();
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('scroll', this.resize);
    window.addEventListener('blur', () => this.input.keys.clear());
    this.resize();
  }

  start(): void {
    requestAnimationFrame(this.frame);
  }

  private reset = (): void => {
    this.state = 'PLAYING';
    this.player = makePlayer(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, HEROES[this.selectedHeroIndex].id);
    this.stats = initialStats();
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.lightnings = [];
    this.cards = [];
    this.elapsed = 0;
    this.enemyTimer = 0.1;
    this.attackTimer = 0.45;
    this.ambientTimer = 0;
    this.pendingLevelUps = 0;
    this.nextEnemyId = 1;
    this.camera = { x: this.player.x - GAME_WIDTH / 2, y: this.player.y - GAME_HEIGHT / 2 };
    for (let i = 0; i < 10; i += 1) this.spawnEnemy(true);
  };

  private startRun = (): void => {
    if (!this.assets.isReady || this.assets.masterCount !== HEROES.length) return;
    this.audio.startMusic();
    this.reset();
  };

  private selectHero = (index: number): void => {
    if (index < 0 || index >= HEROES.length) return;
    this.selectedHeroIndex = index;
    this.player.heroId = HEROES[index].id;
    this.ui.setHoveredHero(index);
    this.audio.startMusic();
  };

  private resize = (): void => {
    const shell = document.getElementById('game-shell');
    if (shell) {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const availableWidth = Math.max(240, viewportWidth - 2);
      const availableHeight = Math.max(342, viewportHeight - 2);
      const maxWidth = Math.min(availableWidth, availableHeight * (GAME_WIDTH / GAME_HEIGHT));
      shell.style.width = `${maxWidth}px`;
      shell.style.height = `${maxWidth * (GAME_HEIGHT / GAME_WIDTH)}px`;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(GAME_WIDTH * dpr);
    this.canvas.height = Math.floor(GAME_HEIGHT * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  };

  private frame = (timestamp: number): void => {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = clamp((timestamp - this.lastTimestamp) / 1000, 0, 0.045);
    this.lastTimestamp = timestamp;
    this.ui.update(dt);
    if (this.state === 'PLAYING') this.update(dt);
    this.render(timestamp);
    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    this.elapsed += dt;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.hitFlash = Math.max(0, this.player.hitFlash - dt);
    this.player.orbitAngle += dt * 0.72;
    this.updatePlayer(dt);
    this.updateCamera(dt);
    this.enemyTimer -= dt;
    if (this.enemyTimer <= 0 && this.enemies.length < this.enemyCap()) {
      this.spawnEnemy(false);
      this.enemyTimer = Math.max(0.16, 0.86 - this.elapsed * 0.006);
    }
    this.updateEnemies(dt);
    if (this.state !== 'PLAYING') return;
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.castChains();
      this.attackTimer = this.stats.attackInterval;
    }
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateLightning(dt);
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.spawnAmbientParticle();
      this.ambientTimer = randomRange(0.32, 0.72);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  private updatePlayer(dt: number): void {
    const direction = this.input.vector();
    const speed = PLAYER_SPEED * this.stats.moveSpeedMultiplier;
    const targetVx = direction.x * speed;
    const targetVy = direction.y * speed;
    this.player.vx = lerp(this.player.vx, targetVx, 1 - Math.exp(-dt * 14));
    this.player.vy = lerp(this.player.vy, targetVy, 1 - Math.exp(-dt * 14));
    if (Math.hypot(direction.x, direction.y) > 0.05) this.player.facing = direction.x < -0.1 ? -1 : direction.x > 0.1 ? 1 : this.player.facing;
    const next = this.world.resolveCircle({ x: this.player.x + this.player.vx * dt, y: this.player.y + this.player.vy * dt }, PLAYER_RADIUS);
    this.player.x = next.x;
    this.player.y = next.y;
    this.player.bob += dt * (Math.hypot(this.player.vx, this.player.vy) > 20 ? 5.2 : 1.8);
  }

  private updateCamera(dt: number): void {
    const targetX = clamp(this.player.x - GAME_WIDTH / 2, 0, WORLD_WIDTH - GAME_WIDTH);
    const targetY = clamp(this.player.y - GAME_HEIGHT / 2, 0, WORLD_HEIGHT - GAME_HEIGHT);
    this.camera.x = lerp(this.camera.x, targetX, 1 - Math.exp(-dt * 4.3));
    this.camera.y = lerp(this.camera.y, targetY, 1 - Math.exp(-dt * 4.3));
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.hitStun = Math.max(0, enemy.hitStun - dt);
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
      if (enemy.dotTimer > 0) {
        enemy.dotTimer = Math.max(0, enemy.dotTimer - dt);
        enemy.dotTick -= dt;
        if (enemy.dotTick <= 0) {
          enemy.dotTick = 0.38;
          enemy.hp -= this.stats.dotDamage;
          this.addDamageText(enemy.x + randomRange(-4, 4), enemy.y - enemy.radius - 7, this.stats.dotDamage, false, '#d9b5ff');
          if (enemy.hp <= 0) this.killEnemy(enemy);
        }
      }
      if (enemy.dead) continue;
      const direction = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
      const obstacle = this.world.obstacleSteer({ x: enemy.x, y: enemy.y }, enemy.radius);
      let separationX = 0;
      let separationY = 0;
      for (const other of this.enemies) {
        if (other === enemy || other.dead) continue;
        const dx = enemy.x - other.x;
        const dy = enemy.y - other.y;
        const distanceSq = dx * dx + dy * dy;
        const desired = enemy.radius + other.radius + 8;
        if (distanceSq > 0.01 && distanceSq < desired * desired) {
          const distance = Math.sqrt(distanceSq);
          const force = (desired - distance) / desired;
          separationX += (dx / distance) * force;
          separationY += (dy / distance) * force;
        }
      }
      const desired = normalize(direction.x + obstacle.x * 1.7 + separationX * 1.2, direction.y + obstacle.y * 1.7 + separationY * 1.2);
      const targetSpeed = enemy.speed * (enemy.hitStun > 0 ? 0.3 : 1);
      enemy.vx = lerp(enemy.vx, desired.x * targetSpeed, 1 - Math.exp(-dt * 4.2));
      enemy.vy = lerp(enemy.vy, desired.y * targetSpeed, 1 - Math.exp(-dt * 4.2));
      const next = this.world.resolveCircle({ x: enemy.x + enemy.vx * dt, y: enemy.y + enemy.vy * dt }, enemy.radius * 0.72);
      enemy.x = next.x;
      enemy.y = next.y;
      const playerDistance = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      if (playerDistance < this.player.radius + enemy.radius - 4 && enemy.contactCooldown <= 0 && this.player.invulnerable <= 0) {
        const damage = (6 + Math.min(10, this.elapsed * 0.05)) * (1 - this.stats.damageReduction);
        this.player.hp = Math.max(0, this.player.hp - damage);
        this.player.invulnerable = 0.65;
        this.player.hitFlash = 0.32;
        enemy.contactCooldown = 0.72;
        this.audio.hurt();
        this.spawnBurst(this.player.x, this.player.y, '#ff8e7d', 7, 'spark');
        if (this.player.hp <= 0) {
          this.state = 'GAME_OVER';
          this.audio.death();
          return;
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      pickup.life -= dt;
      const dx = this.player.x - pickup.x;
      const dy = this.player.y - pickup.y;
      const distance = Math.hypot(dx, dy);
      if (distance < this.stats.pickupRadius) {
        const force = 250 + (1 - distance / this.stats.pickupRadius) * 680;
        const direction = normalize(dx, dy);
        pickup.vx = lerp(pickup.vx, direction.x * force, 1 - Math.exp(-dt * 7));
        pickup.vy = lerp(pickup.vy, direction.y * force, 1 - Math.exp(-dt * 7));
      } else {
        pickup.vx *= Math.exp(-dt * 3.2);
        pickup.vy *= Math.exp(-dt * 3.2);
      }
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (distance < 18) {
        pickup.collected = true;
        this.player.xp += pickup.value;
        this.audio.pickup();
        this.spawnBurst(this.player.x, this.player.y, '#c7fff4', 4, 'glint');
        while (this.player.xp >= this.player.xpToNext) {
          this.player.xp -= this.player.xpToNext;
          this.player.level += 1;
          this.player.xpToNext = Math.ceil(5 + this.player.level * 1.2);
          this.pendingLevelUps += 1;
        }
        if (this.pendingLevelUps > 0 && this.state === 'PLAYING') this.openLevelUp();
      }
    }
    this.pickups = this.pickups.filter((pickup) => !pickup.collected && pickup.life > -1);
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
      particle.vx *= Math.exp(-dt * 1.2);
      particle.vy *= Math.exp(-dt * 1.2);
      particle.rotation += dt * 2.8;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private updateTexts(dt: number): void {
    for (const text of this.texts) {
      text.life -= dt;
      text.x += text.vx * dt;
      text.y += text.vy * dt;
      text.vy = lerp(text.vy, -18, dt * 2);
    }
    this.texts = this.texts.filter((text) => text.life > 0);
  }

  private updateLightning(dt: number): void {
    for (const lightning of this.lightnings) lightning.life -= dt;
    this.lightnings = this.lightnings.filter((lightning) => lightning.life > 0);
  }

  private castChains(): void {
    const orbs = this.getOrbPositions();
    const globallyClaimed = new Set<number>();
    let audible = false;
    for (const orb of orbs) {
      let current: Vec2 = { x: orb.x, y: orb.y };
      const hitThisChain = new Set<number>();
      for (let jump = 0; jump < this.stats.chainCount; jump += 1) {
        const range = jump === 0 ? this.stats.attackRadius : this.stats.chainRange;
        const target = this.nearestEnemy(current, range, hitThisChain, jump === 0 ? globallyClaimed : new Set<number>());
        if (!target) break;
        hitThisChain.add(target.id);
        globallyClaimed.add(target.id);
        this.lightnings.push({
          from: { ...current },
          to: { x: target.x, y: target.y },
          life: 0.2 + Math.random() * 0.08,
          maxLife: 0.25,
          seed: Math.random() * 10000,
          branch: jump > 0 && this.stats.chainCount > 3,
        });
        this.damageEnemy(target);
        current = { x: target.x, y: target.y };
        audible = true;
        if (target.dead) break;
      }
    }
    if (audible) this.audio.lightning();
  }

  private nearestEnemy(origin: Vec2, range: number, excluded: Set<number>, preferUnclaimed: Set<number>): Enemy | null {
    let closest: Enemy | null = null;
    let closestDistance = range * range;
    for (const enemy of this.enemies) {
      if (enemy.dead || excluded.has(enemy.id)) continue;
      const distance = distSq(origin, enemy);
      const bias = preferUnclaimed.has(enemy.id) ? 1.2 : 1;
      if (distance * bias < closestDistance) {
        closest = enemy;
        closestDistance = distance * bias;
      }
    }
    return closest;
  }

  private damageEnemy(enemy: Enemy): void {
    const critical = Math.random() < this.stats.critRate;
    const variance = 0.92 + Math.random() * 0.18;
    const damage = this.stats.baseDamage * this.stats.orbDamageMultiplier * variance * (critical ? this.stats.critMultiplier : 1);
    enemy.hp -= damage;
    enemy.hitFlash = 0.28;
    enemy.hitStun = 0.11;
    if (this.stats.dotDuration > 0) {
      enemy.dotTimer = Math.max(enemy.dotTimer, this.stats.dotDuration);
      enemy.dotTick = Math.min(enemy.dotTick <= 0 ? 0.16 : enemy.dotTick, 0.16);
    }
    this.addDamageText(enemy.x + randomRange(-5, 5), enemy.y - enemy.radius - 6, damage, critical, critical ? '#ffe78e' : '#f6ffff');
    this.spawnBurst(enemy.x, enemy.y, critical ? '#fff2a6' : '#9befff', critical ? 9 : 5, 'spark');
    if (Math.random() < 0.38) this.audio.hit(critical);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: Enemy): void {
    if (enemy.dead) return;
    enemy.dead = true;
    this.player.kills += 1;
    const definition = enemyDefinition(enemy.kind);
    const color = definition.pickupColor;
    const value = definition.elite ? 5 : definition.hpMultiplier > 2 ? 3 : definition.hpMultiplier > 1.2 ? 2 : 1;
    this.pickups.push({ x: enemy.x, y: enemy.y, vx: randomRange(-12, 12), vy: randomRange(-18, -3), value, color, phase: Math.random() * 10, life: 24, collected: false });
    this.spawnBurst(enemy.x, enemy.y, '#f4ffff', 10, 'poof');
    this.spawnBurst(enemy.x, enemy.y + 5, '#14252b', 2, 'shadow');
    this.audio.death();
  }

  private spawnEnemy(initial: boolean, kindOverride?: Enemy['kind'], distanceOverride?: number): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = distanceOverride ?? (initial ? randomRange(220, 350) : randomRange(360, 500));
    let x = this.player.x + Math.cos(angle) * distance;
    let y = this.player.y + Math.sin(angle) * distance;
    x = clamp(x, 70, WORLD_WIDTH - 70);
    y = clamp(y, 70, WORLD_HEIGHT - 70);
    for (let attempt = 0; attempt < 5 && this.world.isBlocked({ x, y }, 25); attempt += 1) {
      x = clamp(this.player.x + Math.cos(angle + attempt * 0.7) * distance, 70, WORLD_WIDTH - 70);
      y = clamp(this.player.y + Math.sin(angle + attempt * 0.7) * distance, 70, WORLD_HEIGHT - 70);
    }
    const kind = kindOverride ?? this.rollEnemyKind();
    this.enemies.push(makeEnemy(this.nextEnemyId++, x, y, kind, this.elapsed / 30));
  }

  private rollEnemyKind(): Enemy['kind'] {
    const phases: Array<{ minTime: number; ids: Enemy['kind'][] }> = [
      { minTime: 0, ids: ['mistSlime', 'sproutSlime', 'redcapFunglet', 'thornPuffer'] },
      { minTime: 6, ids: ['mistSlime', 'sproutSlime', 'redcapFunglet', 'thornPuffer', 'rootling', 'nightWisp', 'goblinSpearscout'] },
      { minTime: 18, ids: ['mistSlime', 'redcapFunglet', 'rootling', 'nightWisp', 'goblinSpearscout', 'goblinHexer', 'boneWarden', 'paleForestGhost', 'direMistwolf'] },
      { minTime: 34, ids: ['rootling', 'goblinHexer', 'boneWarden', 'paleForestGhost', 'direMistwolf', 'carnivorousBloom', 'mossGolem', 'abyssGargoyle', 'ancientGroveGuardian'] },
    ];
    const phase = phases.reduce((current, candidate) => (this.elapsed >= candidate.minTime ? candidate : current), phases[0]);
    const weighted = phase.ids.flatMap((id) => {
      const definition = enemyDefinition(id);
      return Array.from({ length: Math.max(1, Math.round(definition.spawnWeight / 4)) }, () => id);
    });
    return weighted[Math.floor(Math.random() * weighted.length)] ?? 'mistSlime';
  }

  private enemyCap(): number {
    return Math.min(MAX_ENEMIES, 14 + Math.floor(this.elapsed / 5) * 5);
  }

  private getOrbPositions(): OrbPosition[] {
    const positions: OrbPosition[] = [];
    for (let i = 0; i < this.stats.orbCount; i += 1) {
      const angle = this.player.orbitAngle + (Math.PI * 2 * i) / this.stats.orbCount;
      const radius = 42 + Math.sin(this.elapsed * 2.7 + i) * 3.5;
      positions.push({
        x: this.player.x + Math.cos(angle) * radius,
        y: this.player.y + Math.sin(angle) * radius - 1,
        pulse: i * 1.6,
      });
    }
    return positions;
  }

  private spawnBurst(x: number, y: number, color: string, amount: number, type: Particle['type']): void {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'poof' ? randomRange(12, 54) : randomRange(30, 126);
      this.particles.push({
        x: x + randomRange(-3, 3),
        y: y + randomRange(-3, 3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'poof' ? 10 : 0),
        life: type === 'poof' ? randomRange(0.25, 0.52) : randomRange(0.16, 0.36),
        maxLife: type === 'poof' ? 0.52 : 0.36,
        size: type === 'poof' ? randomRange(3, 7) : randomRange(2, 4),
        color,
        type,
        rotation: Math.random() * Math.PI,
        gravity: type === 'poof' ? -8 : 30,
      });
    }
  }

  private spawnAmbientParticle(): void {
    const random = seededRandom(Math.floor(this.elapsed * 77));
    this.particles.push({
      x: this.camera.x + random() * GAME_WIDTH,
      y: this.camera.y + 90 + random() * 470,
      vx: randomRange(-3, 3),
      vy: randomRange(-8, -2),
      life: 1.1,
      maxLife: 1.1,
      size: randomRange(1, 2.4),
      color: random() > 0.5 ? '#dff7ba' : '#86d6c3',
      type: 'leaf',
      rotation: random() * Math.PI,
      gravity: -1,
    });
  }

  private addDamageText(x: number, y: number, value: number, critical: boolean, color: string): void {
    this.texts.push({ x, y, value, life: 0.75, maxLife: 0.75, vx: randomRange(-12, 12), vy: -35 - randomRange(0, 14), crit: critical, color });
  }

  private openLevelUp(): void {
    this.state = 'LEVEL_UP';
    this.cards = rollUpgradeCards(this.stats);
    this.ui.setCardAnimation(0);
    this.ui.setHoveredCard(-1);
    this.audio.levelUp();
  }

  private selectUpgrade(index: number): void {
    if (this.state !== 'LEVEL_UP' || !this.cards[index]) return;
    applyUpgrade(this.stats, this.cards[index]);
    this.ui.triggerSelectionFlash();
    this.audio.select();
    this.cards = [];
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.state = 'PLAYING';
    if (this.pendingLevelUps > 0) this.openLevelUp();
  }

  private handlePoint(point: Vec2): void {
    if (this.state === 'CHARACTER_SELECT') {
      const hero = this.ui.hitTestHero(point.x, point.y);
      if (hero >= 0) {
        this.selectHero(hero);
        return;
      }
      if (this.ui.hitStart(point.x, point.y)) this.startRun();
      return;
    }
    if (this.state === 'LEVEL_UP') {
      const card = this.ui.hitTestCard(point.x, point.y);
      if (card >= 0) this.selectUpgrade(card);
      return;
    }
    if (this.state === 'GAME_OVER') {
      this.reset();
      return;
    }
    if (this.ui.hitMute(point.x, point.y)) this.audio.toggle();
  }

  private handleKey(key: string): void {
    if (this.state === 'CHARACTER_SELECT') {
      if (key === '1' || key === '2' || key === '3') this.selectHero(Number(key) - 1);
      if (key === 'enter' || key === ' ') this.startRun();
      return;
    }
    if (this.state === 'LEVEL_UP' && ['1', '2', '3'].includes(key)) this.selectUpgrade(Number(key) - 1);
    if (this.state === 'GAME_OVER' && key === 'r') this.reset();
    if (!this.debug) return;
    if (key === 'l' && this.state === 'PLAYING') {
      this.player.level += 1;
      this.pendingLevelUps += 1;
      this.openLevelUp();
    } else if (key === 'h') this.player.hp = this.player.maxHp + this.stats.maxHpBonus;
    else if (key === 'e') for (let i = 0; i < 8; i += 1) this.spawnEnemy(false);
    else if (key === 'x') ENEMIES.forEach((definition) => this.spawnEnemy(false, definition.id, 165));
    else if (key === 'k') this.state = 'GAME_OVER';
  }

  private render(timestamp: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.canvas.width / GAME_WIDTH, 0, 0, this.canvas.height / GAME_HEIGHT, 0, 0);
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = '#050f0e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const time = timestamp;
    if (this.state === 'CHARACTER_SELECT') {
      this.world.draw(ctx, time);
    } else {
      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);
      this.world.draw(ctx, time);
      for (const pickup of this.pickups) drawPickup(ctx, pickup, time);
      for (const enemy of this.enemies) if (!enemy.dead) drawEnemy(ctx, enemy, time, this.assets);
      drawPlayer(ctx, this.player, time, this.assets);
      for (const orb of this.getOrbPositions()) drawOrb(ctx, orb, time);
      for (const particle of this.particles) drawParticle(ctx, particle);
      for (const lightning of this.lightnings) this.drawLightning(ctx, lightning, time);
      this.drawDamageTexts(ctx);
      ctx.restore();
    }
    this.ui.drawHud(ctx, this.state, this.player, this.stats, this.getOrbPositions(), this.elapsed, this.audio.isMuted, this.debug, heroDefinition(this.player.heroId).name);
    if (this.state !== 'CHARACTER_SELECT') this.ui.drawJoystick(ctx, (drawContext) => this.input.drawJoystick(drawContext));
    if (this.state === 'CHARACTER_SELECT') this.ui.drawCharacterSelect(ctx, HEROES, this.selectedHeroIndex, this.assets, this.elapsed, this.assets.isReady && this.assets.masterCount === HEROES.length);
    if (this.state === 'LEVEL_UP') this.ui.drawLevelUp(ctx, this.cards, this.elapsed);
    if (this.state === 'GAME_OVER') this.ui.drawGameOver(ctx, this.player, this.elapsed);
  }

  private drawDamageTexts(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const text of this.texts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = `${text.crit ? '700 15px' : '700 12px'} ${text.crit ? '"SFMono-Regular", monospace' : '"Trebuchet MS", sans-serif'}`;
      ctx.lineWidth = text.crit ? 3.2 : 2.6;
      ctx.strokeStyle = '#0a1820';
      ctx.strokeText(`-${Math.max(1, Math.round(text.value))}`, text.x, text.y);
      ctx.fillStyle = text.color;
      ctx.fillText(`-${Math.max(1, Math.round(text.value))}`, text.x, text.y);
      if (text.crit) {
        ctx.font = `700 8px ${MONO_FONT}`;
        ctx.fillStyle = '#fff1aa';
        ctx.fillText('暴擊', text.x, text.y - 14);
      }
    }
    ctx.restore();
  }

  private drawLightning(ctx: CanvasRenderingContext2D, lightning: LightningArc, time: number): void {
    const alpha = clamp(lightning.life / lightning.maxLife, 0, 1);
    const points = this.jaggedPath(lightning.from, lightning.to, lightning.seed + Math.floor(time / 22) * 0.7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha * 0.8;
    ctx.shadowColor = '#38d7ff';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = '#2ec9ff';
    ctx.lineWidth = 9;
    this.strokePath(ctx, points);
    ctx.shadowBlur = 8;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#9defff';
    ctx.lineWidth = 4.5;
    this.strokePath(ctx, points);
    ctx.shadowBlur = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    this.strokePath(ctx, points);
    if (lightning.branch) {
      const mid = points[Math.floor(points.length * 0.55)];
      const branchEnd = { x: mid.x + randomRange(-35, 35), y: mid.y + randomRange(20, 54) };
      const branch = this.jaggedPath(mid, branchEnd, lightning.seed + 14);
      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = '#8cefff';
      ctx.lineWidth = 2.2;
      this.strokePath(ctx, branch);
    }
    drawFlash(ctx, lightning.from.x, lightning.from.y, 16, alpha * 0.65, '#7eeeff');
    drawFlash(ctx, lightning.to.x, lightning.to.y, 18, alpha * 0.85, '#f4ffff');
    ctx.restore();
  }

  private jaggedPath(from: Vec2, to: Vec2, seed: number): Vec2[] {
    const random = seededRandom(Math.floor(seed * 100));
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const normal = { x: -dy / Math.max(length, 1), y: dx / Math.max(length, 1) };
    const segments = Math.max(5, Math.min(11, Math.floor(length / 28)));
    const points: Vec2[] = [{ ...from }];
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const displacement = (random() - 0.5) * Math.min(34, length * 0.22) * (0.8 + Math.sin(t * Math.PI) * 0.5);
      points.push({ x: from.x + dx * t + normal.x * displacement, y: from.y + dy * t + normal.y * displacement });
    }
    points.push({ ...to });
    return points;
  }

  private strokePath(ctx: CanvasRenderingContext2D, points: Vec2[]): void {
    ctx.beginPath();
    points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.stroke();
  }
}

const drawFlash = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number, color: string): void => {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hexToRgba(color, 0.4);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 1.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, Math.PI * 2);
  ctx.fill();
};

const canvas = document.getElementById('game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Game canvas was not found');
const loading = document.getElementById('loading');
if (loading) window.setTimeout(() => loading.remove(), 700);
const game = new MistwoodGame(canvas);
registerPwa();
game.start();
