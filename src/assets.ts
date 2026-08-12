import type { EnemyDefinition, EnemyKind, HeroDefinition, HeroId, Player } from './types';

// The art bible is kept data-driven so gameplay code never needs to know a
// filesystem path or a sprite-cell coordinate.
export const HEROES: HeroDefinition[] = [
  {
    id: 'aether-mage',
    name: '艾爾登',
    role: '元素法師',
    description: '以太學派的星環術士，讓閃電在霧林中找到自己的道路。',
    weapon: '星環法杖',
    magicTheme: '閃電 · 以太 · 軌道魔法',
    palette: ['#172d63', '#f7f2df', '#bd9250', '#43e8ff'],
    masterArt: 'characters/aether-mage-master.png',
    selectionArt: 'characters/selection/aether-mage.webp',
    directionalAtlas: 'characters/aether-mage/directional-atlas-hd.webp',
    spriteIndex: 0,
  },
  {
    id: 'holy-spellblade',
    name: '莉亞娜',
    role: '聖輝劍士',
    description: '以祝福強化劍鋒的流光騎士，迅捷而堅定。',
    weapon: '誓約細劍',
    magicTheme: '祝福 · 輻光 · 聖擊',
    palette: ['#f7f3e4', '#6b84c7', '#c9a150', '#8ce9ff'],
    masterArt: 'characters/holy-spellblade-master.png',
    selectionArt: 'characters/selection/holy-spellblade.webp',
    directionalAtlas: 'characters/holy-spellblade/directional-atlas-hd.webp',
    spriteIndex: 1,
  },
  {
    id: 'mistwood-ranger',
    name: '薇爾娜',
    role: '霧林巫獵',
    description: '聽見古樹低語的靈契弓手，將幽霧化為箭羽。',
    weapon: '翡翠長弓',
    magicTheme: '森靈 · 旋風 · 幽霧',
    palette: ['#1e493b', '#282923', '#8b6942', '#88c9a0'],
    masterArt: 'characters/mistwood-ranger-master.png',
    selectionArt: 'characters/selection/mistwood-ranger.webp',
    directionalAtlas: 'characters/mistwood-ranger/directional-atlas-hd.webp',
    spriteIndex: 2,
  },
];

export const ENEMIES: EnemyDefinition[] = [
  { id: 'mistSlime', name: '霧凝膠', radius: 15, hpMultiplier: 0.72, speedMultiplier: 0.92, spawnWeight: 28, visualScale: 0.86, shadowScale: 0.85, elite: false, atlasIndex: 0, pickupColor: 'cyan' },
  { id: 'sproutSlime', name: '芽生凝膠', radius: 17, hpMultiplier: 0.9, speedMultiplier: 0.82, spawnWeight: 23, visualScale: 0.92, shadowScale: 0.92, elite: false, atlasIndex: 1, pickupColor: 'green' },
  { id: 'redcapFunglet', name: '赤帽菌童', radius: 18, hpMultiplier: 1.05, speedMultiplier: 0.76, spawnWeight: 20, visualScale: 0.98, shadowScale: 0.98, elite: false, atlasIndex: 2, pickupColor: 'red' },
  { id: 'thornPuffer', name: '荊棘膨獸', radius: 19, hpMultiplier: 1.34, speedMultiplier: 0.65, spawnWeight: 14, visualScale: 1.02, shadowScale: 1.02, elite: false, atlasIndex: 3, pickupColor: 'red' },
  { id: 'rootling', name: '小根靈', radius: 20, hpMultiplier: 1.15, speedMultiplier: 0.88, spawnWeight: 13, visualScale: 1.06, shadowScale: 1, elite: false, atlasIndex: 4, pickupColor: 'green' },
  { id: 'mossGolem', name: '苔岩巨像', radius: 29, hpMultiplier: 3.1, speedMultiplier: 0.48, spawnWeight: 7, visualScale: 1.32, shadowScale: 1.35, elite: false, atlasIndex: 5, pickupColor: 'yellow' },
  { id: 'nightWisp', name: '夜燼靈', radius: 19, hpMultiplier: 1.4, speedMultiplier: 1.1, spawnWeight: 11, visualScale: 1, shadowScale: 0.8, elite: false, atlasIndex: 6, pickupColor: 'cyan' },
  { id: 'direMistwolf', name: '霧夜魔狼', radius: 25, hpMultiplier: 2.25, speedMultiplier: 1.16, spawnWeight: 8, visualScale: 1.22, shadowScale: 1.22, elite: false, atlasIndex: 7, pickupColor: 'red' },
  { id: 'goblinSpearscout', name: '哥布林槍斥候', radius: 20, hpMultiplier: 1.65, speedMultiplier: 0.98, spawnWeight: 10, visualScale: 1.06, shadowScale: 1, elite: false, atlasIndex: 8, pickupColor: 'yellow' },
  { id: 'goblinHexer', name: '哥布林咒師', radius: 22, hpMultiplier: 2.15, speedMultiplier: 0.72, spawnWeight: 7, visualScale: 1.1, shadowScale: 1.06, elite: false, atlasIndex: 9, pickupColor: 'cyan' },
  { id: 'carnivorousBloom', name: '噬魂花', radius: 25, hpMultiplier: 2.8, speedMultiplier: 0.55, spawnWeight: 5, visualScale: 1.22, shadowScale: 1.2, elite: false, atlasIndex: 10, pickupColor: 'red' },
  { id: 'boneWarden', name: '骸骨守衛', radius: 22, hpMultiplier: 2.4, speedMultiplier: 0.82, spawnWeight: 6, visualScale: 1.12, shadowScale: 1.06, elite: false, atlasIndex: 11, pickupColor: 'yellow' },
  { id: 'paleForestGhost', name: '蒼白林魂', radius: 21, hpMultiplier: 1.8, speedMultiplier: 0.9, spawnWeight: 6, visualScale: 1.1, shadowScale: 0.82, elite: false, atlasIndex: 12, pickupColor: 'cyan' },
  { id: 'abyssGargoyle', name: '深淵石像鬼', radius: 31, hpMultiplier: 5.2, speedMultiplier: 0.68, spawnWeight: 2, visualScale: 1.42, shadowScale: 1.35, elite: true, atlasIndex: 13, pickupColor: 'red' },
  { id: 'ancientGroveGuardian', name: '古森守望者', radius: 35, hpMultiplier: 7.4, speedMultiplier: 0.44, spawnWeight: 1, visualScale: 1.55, shadowScale: 1.55, elite: true, atlasIndex: 14, pickupColor: 'green' },
];

const heroMap = new Map(HEROES.map((hero) => [hero.id, hero]));
const enemyMap = new Map(ENEMIES.map((enemy) => [enemy.id, enemy]));

export const heroDefinition = (id: HeroId): HeroDefinition => heroMap.get(id) ?? HEROES[0];
export const enemyDefinition = (id: EnemyKind): EnemyDefinition => enemyMap.get(id) ?? ENEMIES[0];

const IMAGE_LOAD_TIMEOUT_MS = 15000;

export interface AssetLoadingState {
  loaded: number;
  selectionLoaded: number;
  total: number;
  failed: number;
  complete: boolean;
  ready: boolean;
  selectionReady: boolean;
  selectionFailed: number;
  startReady: boolean;
  selectionLoadMs: number;
  gameplayLoadMs: number;
  totalLoadMs: number;
}

const loadImage = (src: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const image = new Image();
  let settled = false;
  const finish = (loadedImage: HTMLImageElement | null): void => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    resolve(loadedImage);
  };
  const timeout = window.setTimeout(() => finish(null), IMAGE_LOAD_TIMEOUT_MS);
  image.decoding = 'async';
  image.onload = () => finish(image);
  image.onerror = () => finish(null);
  image.src = `${import.meta.env.BASE_URL}assets/${src}`;
});

export class ArtAssets {
  readonly ready: Promise<void>;
  readonly selectionReady: Promise<void>;
  readonly gameplayReady: Promise<void>;
  private enemyAtlas: HTMLImageElement | null = null;
  private attackAtlas: HTMLImageElement | null = null;
  private readonly directionalAtlases = new Map<HeroId, HTMLImageElement>();
  private readonly selectionArts = new Map<HeroId, HTMLImageElement>();
  private readonly loadingTotal = HEROES.length * 2 + 2;
  private loadingFinished = 0;
  private loadingFailures = 0;
  private selectionFinished = 0;
  private selectionFailures = 0;
  private loadingComplete = false;
  private selectionComplete = false;
  private gameplayComplete = false;
  private readonly loadStartedAt = performance.now();
  private selectionLoadMs = 0;
  private gameplayLoadMs = 0;
  private totalLoadMs = 0;

  constructor() {
    const track = (src: string, phase: 'selection' | 'gameplay'): Promise<HTMLImageElement | null> => loadImage(src).then((image) => {
      this.loadingFinished += 1;
      if (!image) this.loadingFailures += 1;
      if (phase === 'selection') {
        this.selectionFinished += 1;
        if (!image) this.selectionFailures += 1;
      }
      return image;
    });
    this.selectionReady = Promise.all(HEROES.map((hero) => track(hero.selectionArt, 'selection'))).then((images) => {
      HEROES.forEach((hero, index) => {
        const selectionArt = images[index];
        if (selectionArt) this.selectionArts.set(hero.id, selectionArt);
      });
      this.selectionLoadMs = performance.now() - this.loadStartedAt;
      this.selectionComplete = true;
    });
    this.gameplayReady = this.selectionReady.then(() => {
      const gameplayStartedAt = performance.now();
      const enemyPromise = track('enemies/enemy-atlas.webp', 'gameplay').then((image) => {
        this.enemyAtlas = image;
      });
      const attackPromise = track('attacks/attack-atlas.webp', 'gameplay').then((image) => {
        this.attackAtlas = image;
      });
      const heroPromises = HEROES.map((hero) => track(hero.directionalAtlas, 'gameplay').then((image) => {
        if (image) this.directionalAtlases.set(hero.id, image);
      }));
      return Promise.all([enemyPromise, attackPromise, ...heroPromises]).then(() => undefined).finally(() => {
        this.gameplayLoadMs = performance.now() - gameplayStartedAt;
        this.gameplayComplete = true;
      });
    });
    this.ready = this.gameplayReady.finally(() => {
      this.totalLoadMs = performance.now() - this.loadStartedAt;
      this.loadingComplete = true;
    });
  }

  get isReady(): boolean {
    return Boolean(this.gameplayComplete && this.enemyAtlas && this.directionalAtlases.size === HEROES.length && this.selectionArts.size === HEROES.length);
  }

  get isSelectionAssetsReady(): boolean { return this.selectionComplete && this.selectionArts.size === HEROES.length; }
  get isGameplayReady(): boolean { return this.gameplayComplete && Boolean(this.enemyAtlas) && this.directionalAtlases.size === HEROES.length; }
  canStart(hero: HeroDefinition): boolean { return Boolean(this.enemyAtlas && this.directionalAtlases.get(hero.id) && this.isSelectionAssetsReady); }

  get loadingState(): AssetLoadingState {
    return {
      loaded: this.loadingFinished,
      selectionLoaded: this.selectionFinished,
      total: this.loadingTotal,
      failed: this.loadingFailures,
      complete: this.loadingComplete,
      ready: this.isReady,
      selectionReady: this.isSelectionAssetsReady,
      selectionFailed: this.selectionFailures,
      startReady: Boolean(this.enemyAtlas && this.directionalAtlases.get(HEROES[0].id) && this.isSelectionAssetsReady),
      selectionLoadMs: this.selectionLoadMs,
      gameplayLoadMs: this.gameplayLoadMs,
      totalLoadMs: this.totalLoadMs,
    };
  }

  isHeroReady(hero: HeroDefinition): boolean {
    return Boolean(this.directionalAtlases.get(hero.id));
  }

  isEnemyReady(): boolean { return Boolean(this.enemyAtlas); }

  isAttackReady(): boolean { return Boolean(this.attackAtlas); }

  isSelectionReady(hero: HeroDefinition): boolean {
    return Boolean(this.selectionArts.get(hero.id));
  }

  drawAttackIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, rotation = 0, alpha = 1): boolean {
    if (!this.attackAtlas) return false;
    const indexById: Record<string, number> = {
      eclipseArc: 0,
      astralLance: 1,
      sanctumThorns: 2,
      gravityWell: 3,
      starfeatherFamiliar: 4,
      crownOfBlades: 5,
      thornJavelin: 6,
      ricochetStar: 7,
      prismRefraction: 8,
      galeReaper: 9,
      celestialFall: 10,
      echoShade: 11,
      mirrorTwin: 12,
      mistwoodRuneMine: 13,
      moonreturnChakram: 14,
      lightning: 15,
    };
    const index = indexById[id];
    if (index === undefined) return false;
    const cells = 4;
    const cellWidth = this.attackAtlas.width / cells;
    const cellHeight = this.attackAtlas.height / cells;
    const column = index % cells;
    const row = Math.floor(index / cells);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.attackAtlas, column * cellWidth, row * cellHeight, cellWidth, cellHeight, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
  }

  drawHeroSprite(ctx: CanvasRenderingContext2D, hero: HeroDefinition, player: Player, time: number): void {
    const directionalAtlas = this.directionalAtlases.get(hero.id);
    const bob = Math.sin(time * 0.004 + player.bob) * 2.2;
    const sway = Math.sin(time * 0.003 + player.bob * 1.7) * 0.035;
    const width = 58;
    const height = 82;
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.scale(1 + sway, 1 - sway * 0.25);
    ctx.globalAlpha = player.invulnerable > 0 ? 0.82 + Math.sin(time * 0.04) * 0.12 : 1;
    if (directionalAtlas) {
      const cells = 4;
      const cellWidth = directionalAtlas.width / cells;
      const cellHeight = directionalAtlas.height / cells;
      const direction = Math.max(0, Math.min(15, player.facing16));
      const column = direction % cells;
      const row = Math.floor(direction / cells);
      ctx.drawImage(directionalAtlas, column * cellWidth, row * cellHeight, cellWidth, cellHeight, -width / 2, -height + 4, width, height);
    }
    ctx.restore();
  }

  drawEnemySprite(ctx: CanvasRenderingContext2D, definition: EnemyDefinition, x: number, y: number, radius: number, phase: number, time: number, hitFlash: number): void {
    if (!this.enemyAtlas) return;
    const cells = 4;
    const cellWidth = this.enemyAtlas.width / cells;
    const cellHeight = this.enemyAtlas.height / cells;
    const row = Math.floor(definition.atlasIndex / cells);
    const column = definition.atlasIndex % cells;
    const bob = Math.abs(Math.sin(time * 0.006 + phase)) * (definition.elite ? 1.4 : 2.2);
    const squash = 1 - Math.abs(Math.sin(time * 0.006 + phase)) * 0.035;
    const size = Math.max(54, radius * 3.55 * definition.visualScale);
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(1 / squash, squash);
    ctx.globalAlpha = hitFlash > 0 ? 0.78 + Math.sin(time * 0.04) * 0.2 : 1;
    ctx.drawImage(this.enemyAtlas, column * cellWidth, row * cellHeight, cellWidth, cellHeight, -size / 2, -size * 0.69, size, size);
    if (hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.75, hitFlash * 3);
      ctx.fillStyle = '#e8ffff';
      ctx.beginPath();
      ctx.arc(0, -radius * 0.28, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawHeroPreview(ctx: CanvasRenderingContext2D, hero: HeroDefinition, x: number, y: number, width: number, height: number, alpha = 1): boolean {
    const selectionArt = this.selectionArts.get(hero.id);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (!selectionArt) {
      ctx.restore();
      return false;
    }
    const ratio = Math.min(width / selectionArt.width, height / selectionArt.height);
    const drawWidth = selectionArt.width * ratio;
    const drawHeight = selectionArt.height * ratio;
    ctx.drawImage(
      selectionArt,
      0,
      0,
      selectionArt.width,
      selectionArt.height,
      x - drawWidth / 2,
      y - drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return true;
  }
}
