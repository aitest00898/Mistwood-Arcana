import { FONT, GAME_HEIGHT, GAME_WIDTH, MONO_FONT, RARITY_COLORS } from './config';
import type { AttackId, Direction16, GameState, HeroDefinition, OrbPosition, Player, Stats, UpgradeCard } from './types';
import type { ArtAssets } from './assets';
import { drawSkillGlyph } from './entities';
import { ATTACK_DEFINITIONS } from './attacks';
import { clamp, drawGlow, hexToRgba, polygonPath, roundRectPath } from './utils';
import { direction16Label } from './directions';

export interface UiCallbacks {
  onMute: () => void;
  onUpgrade: (index: number) => void;
  onRestart: () => void;
  onHeroSelect: (index: number) => void;
  onStartRun: () => void;
}

export interface VisibleRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface Box { x: number; y: number; w: number; h: number; }
interface SelectionLayout {
  art: Array<{ x: number; y: number; w: number; h: number; alpha: number }>;
  selectors: Box[];
  cta: Box;
  nameY: number;
  roleY: number;
  descriptionY: number;
  crestY: number;
}
interface UpgradeLayout {
  headerY: number;
  cards: Box[];
}

const attackIds: AttackId[] = ['lightning', ...ATTACK_DEFINITIONS.map((attack) => attack.id)];

export class GameUI {
  private readonly callbacks: UiCallbacks;
  private cardAnimation = 0;
  private selectionFlash = 0;
  private hoveredCard = -1;
  private hoveredHero = 0;
  private visualHero = 0;
  private viewportLeft = 0;
  private viewportRight = GAME_WIDTH;
  private viewportTop = 0;
  private viewportBottom = GAME_HEIGHT;
  private selectionLayout: SelectionLayout | null = null;
  private upgradeLayout: UpgradeLayout | null = null;

  constructor(callbacks: UiCallbacks) {
    this.callbacks = callbacks;
  }

  setCardAnimation(value: number): void { this.cardAnimation = value; }
  setHoveredCard(index: number): void { this.hoveredCard = index; }

  setHoveredHero(index: number): void {
    this.hoveredHero = index;
  }

  setViewport(left: number, right: number, top = 0, bottom = GAME_HEIGHT): void {
    this.viewportLeft = left;
    this.viewportRight = right;
    this.viewportTop = top;
    this.viewportBottom = bottom;
  }

  getVisibleRect(): VisibleRect {
    const left = clamp(this.viewportLeft, 0, GAME_WIDTH);
    const right = clamp(this.viewportRight, left + 1, GAME_WIDTH);
    const top = clamp(this.viewportTop, 0, GAME_HEIGHT);
    const bottom = clamp(this.viewportBottom, top + 1, GAME_HEIGHT);
    return { left, right, top, bottom, width: right - left, height: bottom - top, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
  }

  triggerSelectionFlash(): void { this.selectionFlash = 1; }

  update(dt: number): void {
    this.cardAnimation = Math.min(1, this.cardAnimation + dt * 4.2);
    this.selectionFlash = Math.max(0, this.selectionFlash - dt * 5);
    this.visualHero = this.visualHero + (this.hoveredHero - this.visualHero) * (1 - Math.exp(-dt * 12));
  }

  drawHud(ctx: CanvasRenderingContext2D, state: GameState, player: Player, stats: Stats, orbPositions: OrbPosition[], elapsed: number, muted: boolean, debug: boolean, heroName = '安妮妮', facing16 = 0): void {
    if (state === 'PLAYING' || state === 'LEVEL_UP' || state === 'GAME_OVER') {
      this.drawXpBar(ctx, player);
      this.drawStatusBar(ctx, player, stats, heroName);
      this.drawSkillNetwork(ctx, stats, orbPositions);
      this.drawMuteButton(ctx, muted);
    }
    if (debug) this.drawDebug(ctx, player, stats, facing16);
    void elapsed;
  }

  drawJoystick(ctx: CanvasRenderingContext2D, inputDraw: (ctx: CanvasRenderingContext2D) => void): void { inputDraw(ctx); }

  drawCharacterSelect(ctx: CanvasRenderingContext2D, heroes: HeroDefinition[], selected: number, assets: ArtAssets, elapsed: number, ready: boolean): void {
    const rect = this.getVisibleRect();
    const hero = heroes[selected] ?? heroes[0];
    const layout = this.getCharacterSelectLayout(heroes.length, selected, rect);
    this.selectionLayout = layout;
    const allArtReady = heroes.every((item) => assets.isSelectionReady(item));
    const canStart = ready && allArtReady;
    const loadingState = assets.loadingState;
    const gameplayFailed = loadingState.complete && loadingState.failed > loadingState.selectionFailed;
    const accent = hero.palette[2];
    ctx.save();
    ctx.fillStyle = 'rgba(2, 11, 10, .91)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const mist = ctx.createRadialGradient(rect.centerX, layout.crestY + 210, 18, rect.centerX, layout.crestY + 210, Math.max(240, rect.height * 0.58));
    mist.addColorStop(0, hexToRgba(hero.palette[3], 0.17));
    mist.addColorStop(0.55, 'rgba(14,50,39,.16)');
    mist.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    this.drawForestVeil(ctx, rect, elapsed);
    this.drawCrest(ctx, rect.centerX, layout.crestY, accent, elapsed);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f7e9c7';
    ctx.font = `700 ${clamp(rect.width * 0.075, 22, 31)}px ${FONT}`;
    ctx.shadowColor = hexToRgba('#f3c46d', 0.42);
    ctx.shadowBlur = 14;
    ctx.fillText('選擇角色', rect.centerX, layout.crestY + 42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(228,215,180,.72)';
    ctx.font = `11px ${FONT}`;
    ctx.fillText('霧林秘典 · MISTWOOD ARCANA', rect.centerX, layout.crestY + 65);
    this.drawSelectionSigil(ctx, rect.centerX, layout.art[1]?.y ?? rect.centerY, hero, elapsed);
    heroes.forEach((item, index) => {
      const placement = layout.art[index];
      const active = Math.abs(index - this.visualHero) < 0.18;
      if (assets.isSelectionReady(item)) assets.drawHeroPreview(ctx, item, placement.x, placement.y, placement.w, placement.h, placement.alpha);
      else if (active) this.drawLoadingGlyph(ctx, placement.x, placement.y, item.palette[2], elapsed);
      if (active) this.drawHeroAura(ctx, placement.x, placement.y + placement.h * 0.28, placement.w * 0.42, item.palette[3], elapsed);
    });
    const infoX = rect.centerX;
    ctx.fillStyle = '#fff1d0';
    ctx.font = `700 ${clamp(rect.width * 0.06, 20, 25)}px ${FONT}`;
    ctx.fillText(hero.name, infoX, layout.nameY);
    ctx.fillStyle = hero.palette[3];
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(hero.role, infoX, layout.roleY);
    ctx.fillStyle = 'rgba(224,230,213,.78)';
    ctx.font = `11px ${FONT}`;
    this.drawWrappedText(ctx, hero.description, infoX, layout.descriptionY, Math.min(280, rect.width - 32), 16, 2);
    heroes.forEach((item, index) => this.drawHeroSelector(ctx, item, index, selected, layout.selectors[index], assets, elapsed));
    this.drawCta(ctx, layout.cta, hero, canStart, elapsed);
    ctx.fillStyle = 'rgba(218,235,223,.56)';
    ctx.font = `10px ${MONO_FONT}`;
    ctx.fillText('點擊踏入霧林 · 1 / 2 / 3 選角 · Enter / Space 開始', rect.centerX, Math.min(rect.bottom - 9, layout.cta.y + layout.cta.h + 17));
    if (!canStart) {
      this.drawLoadingGlyph(ctx, rect.centerX, layout.cta.y + layout.cta.h / 2, '#a8d7c4', elapsed);
      ctx.fillStyle = '#bdd6ca';
      ctx.font = `600 11px ${FONT}`;
      ctx.fillText(gameplayFailed ? '戰鬥素材載入失敗，請重新整理' : '正在準備秘術素材…', rect.centerX, layout.cta.y + layout.cta.h / 2);
    }
    ctx.restore();
  }

  drawLevelUp(ctx: CanvasRenderingContext2D, cards: UpgradeCard[], elapsed: number): void {
    const rect = this.getVisibleRect();
    const layout = this.getUpgradeLayout(cards.length, rect);
    this.upgradeLayout = layout;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 8, 9, .86)';
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    const haze = ctx.createRadialGradient(rect.centerX, rect.centerY, 20, rect.centerX, rect.centerY, Math.max(240, rect.height * 0.55));
    haze.addColorStop(0, 'rgba(56, 118, 105, .18)');
    haze.addColorStop(1, 'rgba(1, 9, 8, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    this.drawCrest(ctx, rect.centerX, layout.headerY - 34, '#e4c579', elapsed);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${clamp(rect.width * 0.055, 18, 24)}px ${FONT}`;
    ctx.fillStyle = '#f3faf8';
    ctx.shadowColor = 'rgba(141, 255, 241, .38)';
    ctx.shadowBlur = 13;
    ctx.fillText('▶  選擇新技能  ◀', rect.centerX, layout.headerY);
    ctx.shadowBlur = 0;
    cards.forEach((card, index) => this.drawCard(ctx, card, index, layout.cards[index], elapsed));
    if (this.selectionFlash > 0) {
      ctx.fillStyle = `rgba(206,255,251,${this.selectionFlash * 0.16})`;
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    }
    ctx.restore();
  }

  drawGameOver(ctx: CanvasRenderingContext2D, player: Player, elapsed: number): void {
    const rect = this.getVisibleRect();
    ctx.save();
    ctx.fillStyle = 'rgba(2, 7, 8, .84)';
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#eafcf7';
    ctx.font = `700 31px ${FONT}`;
    ctx.fillText('霧中沉寂', rect.centerX, rect.top + rect.height * 0.38);
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = '#acc9c2';
    ctx.fillText(`Lv.${player.level}  ·  擊退 ${player.kills} 隻魔物  ·  ${this.formatTime(elapsed)}`, rect.centerX, rect.top + rect.height * 0.44);
    const box = { x: rect.centerX - 91, y: rect.top + rect.height * 0.49, w: 182, h: 52 };
    roundRectPath(ctx, box.x, box.y, box.w, box.h, 16);
    ctx.fillStyle = 'rgba(47,151,139,.24)';
    ctx.fill();
    ctx.strokeStyle = '#77ddd0';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#e8fffb';
    ctx.font = `600 17px ${FONT}`;
    ctx.fillText('點擊重新開始', rect.centerX, box.y + box.h / 2);
    ctx.fillStyle = '#7eaaa4';
    ctx.font = `12px ${FONT}`;
    ctx.fillText('或按 R 鍵回到霧林邊緣', rect.centerX, box.y + box.h + 23);
    ctx.restore();
  }

  hitTestCard(pointX: number, pointY: number): number {
    const boxes = this.upgradeLayout?.cards ?? this.getUpgradeLayout(3, this.getVisibleRect()).cards;
    return boxes.findIndex((box) => pointX >= box.x && pointX <= box.x + box.w && pointY >= box.y && pointY <= box.y + box.h);
  }

  hitTestHero(pointX: number, pointY: number): number {
    const boxes = this.selectionLayout?.selectors ?? this.getCharacterSelectLayout(3, this.hoveredHero, this.getVisibleRect()).selectors;
    return boxes.findIndex((box) => pointX >= box.x && pointX <= box.x + box.w && pointY >= box.y && pointY <= box.y + box.h);
  }

  hitStart(pointX: number, pointY: number): boolean {
    const box = this.selectionLayout?.cta ?? this.getCharacterSelectLayout(3, this.hoveredHero, this.getVisibleRect()).cta;
    return pointX >= box.x && pointX <= box.x + box.w && pointY >= box.y && pointY <= box.y + box.h;
  }

  hitMute(pointX: number, pointY: number): boolean {
    const rect = this.getVisibleRect();
    return Math.hypot(pointX - this.muteX(), pointY - (rect.bottom - 22)) < 24;
  }

  private getCharacterSelectLayout(count: number, selected: number, rect: VisibleRect): SelectionLayout {
    const compact = rect.height < 650;
    const crestY = rect.top + (compact ? 28 : 34);
    const selectorY = rect.bottom - (compact ? 140 : 144);
    const cta = { x: rect.centerX - Math.min(104, rect.width * 0.32), y: rect.bottom - (compact ? 68 : 72), w: Math.min(208, rect.width - 28), h: compact ? 42 : 46 };
    const spread = Math.min(108, Math.max(72, rect.width * 0.27));
    const artBottom = selectorY - (compact ? 82 : 98);
    const artTop = crestY + (compact ? 85 : 102);
    const regionHeight = Math.max(155, artBottom - artTop);
    const baseWidth = Math.min(132, rect.width * 0.34);
    const activeWidth = Math.min(168, rect.width * 0.45);
    const sideIndices = Array.from({ length: count }, (_, index) => index).filter((index) => index !== selected);
    const art = Array.from({ length: count }, (_, index) => {
      const slot = index === selected ? 0 : sideIndices.indexOf(index) === 0 ? -1 : 1;
      const active = index === selected;
      const width = active ? activeWidth : baseWidth;
      const height = Math.min(regionHeight * (active ? 1.04 : 0.88), width * 1.68);
      return { x: rect.centerX + slot * spread, y: artTop + regionHeight * 0.5 + (active ? 2 : 22), w: width, h: height, alpha: active ? 1 : 0.52 };
    });
    const selectorWidth = Math.min(94, rect.width * 0.27);
    const selectors = Array.from({ length: count }, (_, index) => ({ x: rect.centerX + (index - 1) * Math.min(116, rect.width * 0.31) - selectorWidth / 2, y: selectorY, w: selectorWidth, h: 56 }));
    return { art, selectors, cta, nameY: artBottom + 6, roleY: artBottom + 26, descriptionY: artBottom + 43, crestY };
  }

  private getUpgradeLayout(count: number, rect: VisibleRect): UpgradeLayout {
    const margin = clamp(rect.width * 0.035, 6, 18);
    const gap = clamp(rect.width * 0.018, 5, 11);
    const width = Math.max(74, (rect.width - margin * 2 - gap * Math.max(0, count - 1)) / Math.max(1, count));
    const top = rect.top + clamp(rect.height * 0.16, 92, 122);
    const bottom = rect.bottom - clamp(rect.height * 0.1, 62, 82);
    const height = Math.max(275, Math.min(430, bottom - top));
    const cards = Array.from({ length: count }, (_, index) => ({ x: rect.left + margin + index * (width + gap), y: top, w: width, h: height }));
    return { headerY: rect.top + clamp(rect.height * 0.075, 48, 64), cards };
  }

  private drawForestVeil(ctx: CanvasRenderingContext2D, rect: VisibleRect, elapsed: number): void {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#24493b';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 9; i += 1) {
      const x = rect.left + ((i * 83 + 31) % Math.max(1, rect.width));
      ctx.beginPath();
      ctx.moveTo(x, rect.bottom);
      ctx.quadraticCurveTo(x - 16, rect.centerY, x + Math.sin(elapsed * 0.2 + i) * 18, rect.top + 80);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#d9d98b';
    for (let i = 0; i < 11; i += 1) {
      const x = rect.left + ((i * 47 + 19) % Math.max(1, rect.width));
      const y = rect.top + 108 + ((i * 71) % Math.max(1, rect.height - 150));
      ctx.globalAlpha = 0.12 + (Math.sin(elapsed * 1.3 + i) + 1) * 0.04;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.restore();
  }

  private drawCrest(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, elapsed: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.rotate(elapsed * 0.04);
    drawGlow(ctx, 0, 0, 28, color, 0.18);
    ctx.strokeStyle = hexToRgba(color, 0.82);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(0, -17);
    ctx.moveTo(0, -8);
    ctx.lineTo(-8, -17);
    ctx.moveTo(0, -4);
    ctx.lineTo(10, -14);
    ctx.moveTo(-1, 8);
    ctx.lineTo(-13, 14);
    ctx.moveTo(1, 10);
    ctx.lineTo(13, 15);
    ctx.stroke();
    ctx.restore();
  }

  private drawSelectionSigil(ctx: CanvasRenderingContext2D, x: number, y: number, hero: HeroDefinition, elapsed: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-elapsed * 0.06);
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = hero.palette[3];
    ctx.lineWidth = 1.1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 82, Math.sin(angle) * 82);
      ctx.lineTo(Math.cos(angle) * 112, Math.sin(angle) * 112);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeroAura(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, elapsed: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, radius * (1 + Math.sin(elapsed * 1.7) * 0.05), color, 0.2);
    ctx.restore();
  }

  private drawHeroSelector(ctx: CanvasRenderingContext2D, hero: HeroDefinition, index: number, selected: number, box: Box, assets: ArtAssets, elapsed: number): void {
    const active = index === selected;
    const cx = box.x + box.w / 2;
    const cy = box.y + 23;
    const radius = active ? 27 : 23;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = active ? 1 : 0.68;
    ctx.fillStyle = active ? hexToRgba(hero.palette[3], 0.18) : 'rgba(5,16,14,.72)';
    polygonPath(ctx, 6, radius + 5);
    ctx.fill();
    ctx.strokeStyle = active ? hero.palette[3] : hexToRgba(hero.palette[2], 0.72);
    ctx.lineWidth = active ? 1.8 : 1;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    polygonPath(ctx, 6, radius - 2);
    ctx.clip();
    if (!assets.drawHeroPreview(ctx, hero, 0, 10, radius * 1.65, radius * 2.2, active ? 1 : 0.68)) {
      this.drawLoadingGlyph(ctx, 0, 7, hero.palette[2], elapsed);
    }
    ctx.restore();
    ctx.fillStyle = active ? '#fff0cb' : '#b9c9bd';
    ctx.font = `600 ${clamp(box.w * 0.13, 8, 11)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(hero.name, 0, radius + 19);
    ctx.fillStyle = 'rgba(226,224,192,.5)';
    ctx.font = `8px ${MONO_FONT}`;
    ctx.fillText(String(index + 1), 0, radius + 31);
    ctx.restore();
  }

  private drawCta(ctx: CanvasRenderingContext2D, box: Box, hero: HeroDefinition, canStart: boolean, elapsed: number): void {
    ctx.save();
    roundRectPath(ctx, box.x, box.y, box.w, box.h, 13);
    ctx.fillStyle = canStart ? hexToRgba(hero.palette[3], 0.18) : 'rgba(50,70,62,.28)';
    ctx.fill();
    ctx.strokeStyle = canStart ? hexToRgba(hero.palette[2], 0.95) : 'rgba(166,186,173,.42)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = canStart ? hexToRgba(hero.palette[3], 0.45) : 'rgba(190,212,199,.18)';
    ctx.lineWidth = 0.7;
    roundRectPath(ctx, box.x + 5, box.y + 5, box.w - 10, box.h - 10, 10);
    ctx.stroke();
    ctx.fillStyle = canStart ? '#f4f2d7' : '#a9b7b1';
    ctx.font = `700 ${clamp(box.w * 0.085, 14, 18)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(canStart ? '踏入霧林' : '正在準備秘術…', box.x + box.w / 2, box.y + box.h / 2);
    if (canStart) {
      ctx.globalAlpha = 0.3 + (Math.sin(elapsed * 2) + 1) * 0.08;
      ctx.fillStyle = hero.palette[3];
      ctx.fillRect(box.x + 18, box.y + 9, 2, box.h - 18);
      ctx.fillRect(box.x + box.w - 20, box.y + 9, 2, box.h - 18);
    }
    ctx.restore();
  }

  private drawXpBar(ctx: CanvasRenderingContext2D, player: Player): void {
    const rect = this.getVisibleRect();
    const w = Math.min(224, rect.width - 34);
    const x = rect.centerX - w / 2;
    const y = rect.bottom - 104;
    roundRectPath(ctx, x, y, w, 4, 2);
    ctx.fillStyle = 'rgba(1,10,10,.6)';
    ctx.fill();
    roundRectPath(ctx, x, y, w * clamp(player.xp / player.xpToNext, 0, 1), 4, 2);
    ctx.fillStyle = 'rgba(133,240,206,.78)';
    ctx.fill();
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D, player: Player, stats: Stats, heroName: string): void {
    const rect = this.getVisibleRect();
    const w = Math.min(232, rect.width - 26);
    const x = rect.centerX - w / 2;
    const y = rect.bottom - 89;
    const h = 13;
    roundRectPath(ctx, x - 3, y - 3, w + 6, h + 6, 7);
    ctx.fillStyle = 'rgba(3,13,15,.78)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,212,155,.58)';
    ctx.lineWidth = 1;
    ctx.stroke();
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.fillStyle = '#47231c';
    ctx.fill();
    roundRectPath(ctx, x, y, w * clamp(player.hp / (player.maxHp + stats.maxHpBonus), 0, 1), h, 5);
    const health = ctx.createLinearGradient(x, y, x, y + h);
    health.addColorStop(0, '#ff9257');
    health.addColorStop(0.5, '#f34c2b');
    health.addColorStop(1, '#aa2e28');
    ctx.fillStyle = health;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 9px ${FONT}`;
    ctx.fillStyle = '#fff4dd';
    ctx.shadowColor = '#311a14';
    ctx.shadowBlur = 2;
    ctx.fillText(heroName, x + Math.min(66, w * 0.3), y + h / 2 + 0.3);
    ctx.fillStyle = '#ffe2b5';
    ctx.fillText(`Lv.${player.level}`, x + w - Math.min(42, w * 0.19), y + h / 2 + 0.3);
    ctx.shadowBlur = 0;
  }

  private drawSkillNetwork(ctx: CanvasRenderingContext2D, stats: Stats, orbs: OrbPosition[]): void {
    const rect = this.getVisibleRect();
    const cx = clamp(rect.right - 62, rect.left + 62, GAME_WIDTH - 34);
    const cy = rect.bottom - 76;
    const positions = [
      [-45, -28], [-6, -50], [38, -38], [-53, 11], [52, 10], [-38, 42], [7, 48], [48, 39],
    ];
    const owned = stats.ownedAttacks;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = 'rgba(196,169,106,.48)';
    ctx.lineWidth = 1;
    positions.forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
    });
    ctx.save();
    ctx.translate(cx, cy);
    polygonPath(ctx, 6, 24);
    ctx.fillStyle = 'rgba(15, 30, 34, .94)';
    ctx.fill();
    ctx.strokeStyle = '#b7ecdc';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawSkillGlyph(ctx, owned[0] ?? 'lightning', 17, '#eefeff');
    ctx.restore();
    positions.forEach(([dx, dy], index) => {
      const id = owned[index + 1] ?? attackIds[index + 1];
      const active = owned.includes(id);
      ctx.save();
      ctx.translate(cx + dx, cy + dy);
      polygonPath(ctx, 6, 17);
      ctx.fillStyle = active ? 'rgba(39,80,66,.9)' : 'rgba(11,24,22,.9)';
      ctx.fill();
      ctx.strokeStyle = active ? '#86e8cb' : 'rgba(238,245,237,.58)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (active) drawSkillGlyph(ctx, id, 11, '#e9fff8');
      else this.drawLock(ctx, 0, 1, 7);
      ctx.restore();
    });
    if (orbs.length > 2) {
      ctx.fillStyle = '#a9f6f2';
      ctx.font = `700 8px ${MONO_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${orbs.length}`, cx, cy + 31);
    }
    ctx.restore();
  }

  private drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.strokeStyle = '#f3f5e9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.25, size * 0.42, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#f3f5e9';
    roundRectPath(ctx, x - size * 0.58, y - size * 0.08, size * 1.16, size * 0.92, 2);
    ctx.fill();
    ctx.fillStyle = '#283239';
    ctx.beginPath();
    ctx.arc(x, y + size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMuteButton(ctx: CanvasRenderingContext2D, muted: boolean): void {
    const rect = this.getVisibleRect();
    const x = this.muteX();
    const y = rect.bottom - 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(9,24,20,.82)';
    ctx.strokeStyle = 'rgba(226,211,167,.72)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = muted ? '#ec7d72' : '#f5fff8';
    ctx.beginPath();
    ctx.moveTo(-8, -3); ctx.lineTo(-3, -3); ctx.lineTo(3, -8); ctx.lineTo(3, 8); ctx.lineTo(-3, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = muted ? '#ec7d72' : '#f5fff8';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    if (muted) { ctx.moveTo(6, -6); ctx.lineTo(12, 6); } else ctx.arc(1, 0, 8, -0.78, 0.78);
    ctx.stroke();
    ctx.restore();
  }

  private muteX(): number {
    const rect = this.getVisibleRect();
    return Math.min(rect.right - 18, GAME_WIDTH - 18);
  }

  private drawLoadingGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, elapsed: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(elapsed * 0.9);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexToRgba(color, 0.22);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0.2, Math.PI * 1.72);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(color, 0.86);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 25, -0.7, Math.PI * 0.84);
    ctx.stroke();
    ctx.restore();
  }

  private drawDebug(ctx: CanvasRenderingContext2D, player: Player, stats: Stats, facing16: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.font = `9px ${MONO_FONT}`;
    ctx.textAlign = 'left';
    const normalizedFacing = Math.max(0, Math.min(15, facing16)) as Direction16;
    ctx.fillText(`DEBUG hp:${player.hp.toFixed(0)} orb:${stats.orbCount} atk:${stats.ownedAttacks.length}/8 hero:${player.heroId} ${direction16Label(normalizedFacing)}`, this.getVisibleRect().left + 8, this.getVisibleRect().top + 18);
    ctx.restore();
  }

  private drawCard(ctx: CanvasRenderingContext2D, card: UpgradeCard, index: number, box: Box, elapsed: number): void {
    if (!box) return;
    const selected = this.hoveredCard === index;
    const stagger = clamp(this.cardAnimation * 1.3 - index * 0.12, 0, 1);
    const ease = 1 - (1 - stagger) ** 3;
    const y = box.y + (1 - ease) * Math.min(48, box.h * 0.14);
    const h = box.h;
    const accent = card.accent;
    const center = box.x + box.w / 2;
    const small = box.w < 118;
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(center, y + h / 2);
    ctx.scale(0.9 + ease * 0.1, 0.9 + ease * 0.1);
    ctx.translate(-center, -(y + h / 2));
    if (selected) drawGlow(ctx, center, y + h / 2, Math.min(170, box.w * 1.3), accent, 0.7);
    roundRectPath(ctx, box.x, y, box.w, h, 8);
    const fill = ctx.createLinearGradient(box.x, y, box.x, y + h);
    fill.addColorStop(0, 'rgba(18,31,30,.98)');
    fill.addColorStop(0.55, 'rgba(9,16,17,.99)');
    fill.addColorStop(1, 'rgba(5,11,13,.99)');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accent, selected ? 0.95 : 0.68);
    ctx.lineWidth = selected ? 2 : 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,245,237,.3)';
    ctx.lineWidth = 0.7;
    roundRectPath(ctx, box.x + 6, y + 7, box.w - 12, h - 14, 5);
    ctx.stroke();
    this.drawCardCorners(ctx, box.x, y, box.w, h, accent);
    ctx.save();
    ctx.translate(center, y + 28);
    polygonPath(ctx, 6, Math.min(27, box.w * 0.24));
    ctx.fillStyle = 'rgba(3,11,14,.98)';
    ctx.fill();
    ctx.strokeStyle = '#f1fff8';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    drawSkillGlyph(ctx, card.id, Math.min(18, box.w * 0.16), '#f6ffff');
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0faf4';
    ctx.font = `600 ${small ? 11 : 17}px ${FONT}`;
    this.drawWrappedText(ctx, card.title, center, y + 82, box.w - 12, small ? 14 : 20, 2);
    ctx.strokeStyle = hexToRgba(accent, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.x + Math.min(22, box.w * 0.14), y + 112);
    ctx.lineTo(box.x + box.w - Math.min(22, box.w * 0.14), y + 112);
    ctx.stroke();
    ctx.fillStyle = '#cbdad5';
    ctx.font = `${small ? 8 : 12}px ${FONT}`;
    this.drawWrappedText(ctx, card.description, center, y + 143, box.w - 14, small ? 13 : 19, small ? 3 : 2);
    ctx.fillStyle = accent;
    ctx.font = `700 ${small ? 10 : 14}px ${MONO_FONT}`;
    this.drawWrappedText(ctx, card.value, center, y + h * 0.57, box.w - 10, small ? 13 : 17, 2);
    ctx.fillStyle = RARITY_COLORS[card.rarity];
    ctx.font = `700 ${small ? 14 : 23}px ${FONT}`;
    ctx.shadowColor = hexToRgba(accent, 0.66);
    ctx.shadowBlur = selected ? 12 : 5;
    ctx.fillText(card.rarity, center, y + h - 68);
    ctx.shadowBlur = 0;
    ctx.font = `600 ${small ? 10 : 13}px ${FONT}`;
    ctx.fillStyle = '#e7f8f0';
    ctx.fillText(card.level > 1 || card.kind === 'attack-upgrade' ? '升級' : card.kind === 'attack-unlock' ? '獲得' : '強化', center, y + h - 40);
    ctx.fillStyle = 'rgba(193,219,210,.64)';
    ctx.font = `${small ? 7 : 10}px ${MONO_FONT}`;
    ctx.fillText(card.kind === 'attack-unlock' ? 'NEW ATTACK' : `ARC-${String(index + 1).padStart(2, '0')}`, center, y + h - 17);
    ctx.restore();
    void elapsed;
  }

  private drawCardCorners(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string): void {
    ctx.save();
    ctx.strokeStyle = hexToRgba(accent, 0.72);
    ctx.lineWidth = 1.2;
    const length = Math.min(13, w * 0.12);
    const corners = [[x + 11, y + 11, 1, 1], [x + w - 11, y + 11, -1, 1], [x + 11, y + h - 11, 1, -1], [x + w - 11, y + h - 11, -1, -1]];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * length);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * length, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): void {
    const characters = [...text];
    const lines: string[] = [];
    let line = '';
    for (const character of characters) {
      const next = line + character;
      if (ctx.measureText(next).width > maxWidth && line.length > 0) { lines.push(line); line = character; } else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  }

  private formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
}
