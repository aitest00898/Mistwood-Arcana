import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, MONO_FONT, RARITY_COLORS } from './config';
import type { GameState, OrbPosition, Player, Rarity, Stats, UpgradeCard } from './types';
import { drawSkillGlyph } from './entities';
import { clamp, drawGlow, hexToRgba, polygonPath, roundRectPath } from './utils';
import { skillLevel } from './upgrades';

export interface UiCallbacks {
  onMute: () => void;
  onUpgrade: (index: number) => void;
  onRestart: () => void;
}

export class GameUI {
  private readonly callbacks: UiCallbacks;
  private cardAnimation = 0;
  private selectionFlash = 0;
  private hoveredCard = -1;

  constructor(callbacks: UiCallbacks) {
    this.callbacks = callbacks;
  }

  setCardAnimation(value: number): void {
    this.cardAnimation = value;
  }

  setHoveredCard(index: number): void {
    this.hoveredCard = index;
  }

  triggerSelectionFlash(): void {
    this.selectionFlash = 1;
  }

  update(dt: number): void {
    this.cardAnimation = Math.min(1, this.cardAnimation + dt * 4.2);
    this.selectionFlash = Math.max(0, this.selectionFlash - dt * 5);
  }

  drawHud(ctx: CanvasRenderingContext2D, state: GameState, player: Player, stats: Stats, orbPositions: OrbPosition[], elapsed: number, muted: boolean, debug: boolean): void {
    this.drawXpBar(ctx, player);
    this.drawStatusBar(ctx, player, stats);
    this.drawSkillNetwork(ctx, stats, orbPositions);
    this.drawMuteButton(ctx, muted);
    if (debug) this.drawDebug(ctx, player, stats);
  }

  drawJoystick(ctx: CanvasRenderingContext2D, inputDraw: (ctx: CanvasRenderingContext2D) => void): void {
    inputDraw(ctx);
  }

  drawLevelUp(ctx: CanvasRenderingContext2D, cards: UpgradeCard[], elapsed: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 8, 9, .82)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const haze = ctx.createRadialGradient(GAME_WIDTH / 2, 335, 20, GAME_WIDTH / 2, 335, 390);
    haze.addColorStop(0, 'rgba(44, 104, 95, .16)');
    haze.addColorStop(1, 'rgba(1, 9, 8, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 21px ${FONT}`;
    ctx.fillStyle = '#f3faf8';
    ctx.shadowColor = 'rgba(141, 255, 241, .42)';
    ctx.shadowBlur = 15;
    ctx.fillText('▶  選擇新技能  ◀', GAME_WIDTH / 2, 90);
    ctx.shadowBlur = 0;
    cards.forEach((card, index) => this.drawCard(ctx, card, index, elapsed));
    if (this.selectionFlash > 0) {
      ctx.fillStyle = `rgba(206,255,251,${this.selectionFlash * 0.16})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    ctx.restore();
  }

  drawGameOver(ctx: CanvasRenderingContext2D, player: Player, elapsed: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 7, 8, .82)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#eafcf7';
    ctx.font = `700 31px ${FONT}`;
    ctx.fillText('霧中沉寂', GAME_WIDTH / 2, 270);
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = '#acc9c2';
    ctx.fillText(`Lv.${player.level}  ·  擊退 ${player.kills} 隻魔物  ·  ${this.formatTime(elapsed)}`, GAME_WIDTH / 2, 315);
    roundRectPath(ctx, 165, 359, 182, 52, 16);
    ctx.fillStyle = 'rgba(47,151,139,.24)';
    ctx.fill();
    ctx.strokeStyle = '#77ddd0';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#e8fffb';
    ctx.font = `600 17px ${FONT}`;
    ctx.fillText('點擊重新開始', GAME_WIDTH / 2, 385);
    ctx.fillStyle = '#7eaaa4';
    ctx.font = `12px ${FONT}`;
    ctx.fillText('或按 R 鍵回到霧林邊緣', GAME_WIDTH / 2, 434);
    ctx.restore();
  }

  hitTestCard(pointX: number, pointY: number): number {
    if (pointY < 175 || pointY > 580) return -1;
    const boxes = [
      { x: 2, w: 165 },
      { x: 174, w: 164 },
      { x: 346, w: 164 },
    ];
    return boxes.findIndex((box) => pointX >= box.x && pointX <= box.x + box.w);
  }

  hitMute(pointX: number, pointY: number): boolean {
    return Math.hypot(pointX - 483, pointY - 667) < 24;
  }

  private drawTopPill(ctx: CanvasRenderingContext2D, elapsed: number, level: number): void {
    roundRectPath(ctx, 187, 18, 138, 30, 15);
    ctx.fillStyle = 'rgba(4, 19, 19, .55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(174, 236, 220, .26)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = '#e9f8f1';
    ctx.fillText(`霧林 · ${this.formatTime(elapsed)}`, 256, 28);
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = '#81b9a7';
    ctx.fillText(`生存等級 ${level}`, 256, 40);
  }

  private drawXpBar(ctx: CanvasRenderingContext2D, player: Player): void {
    const x = 145;
    const y = 625;
    const w = 224;
    roundRectPath(ctx, x, y, w, 4, 2);
    ctx.fillStyle = 'rgba(1,10,10,.6)';
    ctx.fill();
    roundRectPath(ctx, x, y, w * clamp(player.xp / player.xpToNext, 0, 1), 4, 2);
    ctx.fillStyle = 'rgba(133,240,206,.78)';
    ctx.fill();
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D, player: Player, stats: Stats): void {
    const x = 140;
    const y = 639;
    const w = 232;
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
    ctx.fillText('安妮妮', x + 66, y + h / 2 + 0.3);
    ctx.fillStyle = '#ffe2b5';
    ctx.fillText(`Lv.${player.level}`, x + w - 42, y + h / 2 + 0.3);
    ctx.shadowBlur = 0;
  }

  private drawSkillNetwork(ctx: CanvasRenderingContext2D, stats: Stats, orbs: OrbPosition[]): void {
    const cx = 442;
    const cy = 665;
    const nodes = [
      { x: cx - 48, y: cy - 31, id: 'blessing', locked: skillLevel(stats, 'blessing') === 0 },
      { x: cx + 4, y: cy - 48, id: 'ray', locked: skillLevel(stats, 'ray') === 0 },
      { x: cx + 52, y: cy - 27, id: 'vortex', locked: skillLevel(stats, 'vortex') === 0 },
      { x: cx - 49, y: cy + 26, id: 'embrace', locked: skillLevel(stats, 'embrace') === 0 },
      { x: cx + 45, y: cy + 28, id: 'blade', locked: skillLevel(stats, 'blade') === 0 },
    ];
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = 'rgba(204,232,224,.48)';
    ctx.lineWidth = 1;
    for (const node of nodes) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    }
    const centralLevel = skillLevel(stats, 'lightning');
    ctx.save();
    ctx.translate(cx, cy);
    polygonPath(ctx, 6, 25);
    ctx.fillStyle = 'rgba(15, 30, 34, .9)';
    ctx.fill();
    ctx.strokeStyle = centralLevel > 0 ? '#8deeff' : '#e8f4ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawSkillGlyph(ctx, 'lightning', 18, '#eefeff');
    ctx.restore();
    for (const node of nodes) {
      ctx.save();
      ctx.translate(node.x, node.y);
      polygonPath(ctx, 6, 20);
      ctx.fillStyle = node.locked ? 'rgba(15,25,28,.84)' : 'rgba(28,77,73,.88)';
      ctx.fill();
      ctx.strokeStyle = node.locked ? 'rgba(238,245,237,.78)' : '#86e8cb';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (node.locked) this.drawLock(ctx, 0, 1, 8);
      else drawSkillGlyph(ctx, node.id, 13, '#e9fff8');
      ctx.restore();
    }
    if (orbs.length > 2) {
      ctx.fillStyle = '#a9f6f2';
      ctx.font = `700 8px ${MONO_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${orbs.length}`, cx, cy + 32);
    }
    ctx.restore();
  }

  private drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.strokeStyle = '#f3f5e9';
    ctx.lineWidth = 1.8;
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
    ctx.save();
    ctx.translate(483, 667);
    ctx.fillStyle = 'rgba(4,15,17,.74)';
    ctx.strokeStyle = 'rgba(222,246,237,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = muted ? '#ec7d72' : '#f5fff8';
    ctx.beginPath();
    ctx.moveTo(-8, -3);
    ctx.lineTo(-3, -3);
    ctx.lineTo(3, -8);
    ctx.lineTo(3, 8);
    ctx.lineTo(-3, 3);
    ctx.lineTo(-8, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = muted ? '#ec7d72' : '#f5fff8';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    if (muted) {
      ctx.moveTo(6, -6);
      ctx.lineTo(12, 6);
    } else {
      ctx.arc(1, 0, 8, -0.78, 0.78);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawHints(ctx: CanvasRenderingContext2D, elapsed: number): void {
    if (elapsed > 8) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = 'rgba(221,247,235,.62)';
    ctx.fillText('移動 · WASD / 觸控搖桿', GAME_WIDTH / 2, 70);
    ctx.restore();
  }

  private drawDebug(ctx: CanvasRenderingContext2D, player: Player, stats: Stats): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.font = `9px ${MONO_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`DEBUG  hp:${player.hp.toFixed(0)}  orb:${stats.orbCount}  chain:${stats.chainCount}`, 8, 18);
    ctx.restore();
  }

  private drawCard(ctx: CanvasRenderingContext2D, card: UpgradeCard, index: number, elapsed: number): void {
    const boxes = [
      { x: 2, w: 165 },
      { x: 174, w: 164 },
      { x: 346, w: 164 },
    ];
    const box = boxes[index];
    const selected = this.hoveredCard === index;
    const stagger = clamp(this.cardAnimation * 1.3 - index * 0.12, 0, 1);
    const ease = 1 - (1 - stagger) ** 3;
    const y = 186 + (1 - ease) * 60;
    const h = 384;
    const accent = card.accent;
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(box.x + box.w / 2, y + h / 2);
    ctx.scale(0.88 + ease * 0.12, 0.88 + ease * 0.12);
    ctx.translate(-(box.x + box.w / 2), -(y + h / 2));
    if (selected) drawGlow(ctx, box.x + box.w / 2, y + h / 2, 180, accent, 1);
    roundRectPath(ctx, box.x, y, box.w, h, 10);
    const fill = ctx.createLinearGradient(box.x, y, box.x, y + h);
    fill.addColorStop(0, 'rgba(18,28,29,.96)');
    fill.addColorStop(0.55, 'rgba(9,15,17,.98)');
    fill.addColorStop(1, 'rgba(5,11,13,.98)');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accent, selected ? 0.9 : 0.62);
    ctx.lineWidth = selected ? 2 : 1.3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,245,237,.32)';
    ctx.lineWidth = 0.8;
    roundRectPath(ctx, box.x + 7, y + 8, box.w - 14, h - 16, 6);
    ctx.stroke();
    this.drawCardCorners(ctx, box.x, y, box.w, h, accent);
    ctx.save();
    ctx.translate(box.x + box.w / 2, y + 27);
    polygonPath(ctx, 6, 27);
    ctx.fillStyle = 'rgba(3,11,14,.98)';
    ctx.fill();
    ctx.strokeStyle = '#f1fff8';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    polygonPath(ctx, 6, 22);
    ctx.strokeStyle = hexToRgba(accent, 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();
    drawSkillGlyph(ctx, card.id, 18, '#f6ffff');
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0faf4';
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(card.title, box.x + box.w / 2, y + 91);
    ctx.strokeStyle = hexToRgba(accent, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.x + 23, y + 115);
    ctx.lineTo(box.x + box.w - 23, y + 115);
    ctx.stroke();
    ctx.fillStyle = '#cbdad5';
    ctx.font = `12px ${FONT}`;
    this.drawWrappedText(ctx, `${card.description}${card.id === 'lightning' ? '' : ''}`, box.x + box.w / 2, y + 163, box.w - 26, 20, 2);
    ctx.fillStyle = accent;
    ctx.font = `700 15px ${MONO_FONT}`;
    ctx.fillText(card.value, box.x + box.w / 2, y + 213);
    ctx.fillStyle = RARITY_COLORS[card.rarity];
    ctx.font = `700 25px ${FONT}`;
    ctx.shadowColor = hexToRgba(accent, 0.7);
    ctx.shadowBlur = selected ? 14 : 6;
    ctx.fillText(card.rarity, box.x + box.w / 2, y + h - 72);
    ctx.shadowBlur = 0;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = '#e7f8f0';
    ctx.fillText(card.level > 1 ? '升級' : '獲得', box.x + box.w / 2, y + h - 39);
    ctx.fillStyle = 'rgba(193,219,210,.64)';
    ctx.font = `10px ${MONO_FONT}`;
    ctx.fillText(`ARC-${String(index + 1).padStart(2, '0')}`, box.x + box.w / 2, y + h - 17);
    ctx.restore();
  }

  private drawCardCorners(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string): void {
    ctx.save();
    ctx.strokeStyle = hexToRgba(accent, 0.72);
    ctx.lineWidth = 1.4;
    const corners = [
      [x + 13, y + 13, 1, 1],
      [x + w - 13, y + 13, -1, 1],
      [x + 13, y + h - 13, 1, -1],
      [x + w - 13, y + h - 13, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * 13);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * 13, cy);
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
      if (ctx.measureText(next).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = character;
      } else line = next;
    }
    if (line) lines.push(line);
    const shown = lines.slice(0, maxLines);
    shown.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  }

  private formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
}
