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
    directionalAtlas: 'characters/aether-mage/directional-atlas.png',
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
    directionalAtlas: 'characters/holy-spellblade/directional-atlas.png',
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
    directionalAtlas: 'characters/mistwood-ranger/directional-atlas.png',
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

const loadImage = (src: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = `${import.meta.env.BASE_URL}assets/${src}`;
});

export class ArtAssets {
  readonly ready: Promise<void>;
  private heroAtlas: HTMLImageElement | null = null;
  private enemyAtlas: HTMLImageElement | null = null;
  private readonly directionalAtlases = new Map<HeroId, HTMLImageElement>();
  private readonly masters = new Map<HeroId, HTMLImageElement>();

  constructor() {
    this.ready = Promise.all([
      loadImage('characters/hero-gameplay-atlas.png'),
      loadImage('enemies/enemy-atlas.png'),
      ...HEROES.map((hero) => loadImage(hero.directionalAtlas)),
      ...HEROES.map((hero) => loadImage(hero.masterArt)),
    ]).then((images) => {
      const heroAtlas = images[0];
      const enemyAtlas = images[1];
      this.heroAtlas = heroAtlas;
      this.enemyAtlas = enemyAtlas;
      HEROES.forEach((hero, index) => {
        const directionalAtlas = images[2 + index];
        const master = images[2 + HEROES.length + index];
        if (directionalAtlas) this.directionalAtlases.set(hero.id, directionalAtlas);
        if (master) this.masters.set(hero.id, master);
      });
    });
  }

  get masterCount(): number {
    return this.masters.size;
  }

  get isReady(): boolean {
    return Boolean(this.enemyAtlas && this.directionalAtlases.size === HEROES.length);
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
    } else if (this.heroAtlas) {
      const cellWidth = this.heroAtlas.width / 3;
      const cellHeight = this.heroAtlas.height;
      ctx.scale(player.facing < 0 ? -1 : 1, 1);
      ctx.drawImage(this.heroAtlas, hero.spriteIndex * cellWidth, 0, cellWidth, cellHeight, -width / 2, -height * 0.78, width, height);
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

  drawHeroMaster(ctx: CanvasRenderingContext2D, hero: HeroDefinition, x: number, y: number, width: number, height: number, alpha = 1): boolean {
    const image = this.masters.get(hero.id);
    if (!image) return false;
    const ratio = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }
}
