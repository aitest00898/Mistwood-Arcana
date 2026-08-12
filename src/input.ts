import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { clamp, normalize } from './utils';
import type { Vec2 } from './types';

export type InputPointHandler = (point: Vec2) => void;
export type KeyHandler = (key: string) => void;

export class InputManager {
  readonly keys = new Set<string>();
  private readonly canvas: HTMLCanvasElement;
  private pointerId: number | null = null;
  private joystickActive = false;
  private joystickVector: Vec2 = { x: 0, y: 0 };
  private joystickBase: Vec2 = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  private joystickThumb: Vec2 = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  private pointerDownPoint: Vec2 = { x: 0, y: 0 };
  private pointerMoved = false;
  onPoint: InputPointHandler | null = null;
  onKey: KeyHandler | null = null;
  onInteract: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', this.handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', this.handlePointerUp, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  vector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    const keyboard = normalize(x, y);
    if (this.joystickActive && Math.hypot(this.joystickVector.x, this.joystickVector.y) > 0.05) return this.joystickVector;
    return keyboard;
  }

  drawJoystick(ctx: CanvasRenderingContext2D): void {
    if (!this.joystickActive) return;
    const base = this.joystickBase;
    const thumb = this.joystickThumb;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = '#e8f1ef';
    ctx.lineWidth = 1.3;
    ctx.fillStyle = 'rgba(4, 18, 19, .24)';
    ctx.beginPath();
    ctx.arc(base.x, base.y, 47, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(207, 234, 229, .45)';
    ctx.beginPath();
    ctx.arc(base.x, base.y, 36, 0, Math.PI * 2);
    ctx.stroke();
    const knob = ctx.createRadialGradient(thumb.x - 5, thumb.y - 7, 1, thumb.x, thumb.y, 20);
    knob.addColorStop(0, 'rgba(241, 250, 247, .9)');
    knob.addColorStop(0.45, 'rgba(185, 202, 197, .74)');
    knob.addColorStop(1, 'rgba(74, 91, 88, .68)');
    ctx.fillStyle = knob;
    ctx.beginPath();
    ctx.arc(thumb.x, thumb.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private pointFromEvent = (event: PointerEvent): Vec2 => {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * GAME_WIDTH, 0, GAME_WIDTH),
      y: clamp(((event.clientY - rect.top) / rect.height) * GAME_HEIGHT, 0, GAME_HEIGHT),
    };
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter', '1', '2', '3', 'l', 'h', 'e', 'x', 'u', 'i', 'k', 'r'].includes(key)) {
      event.preventDefault();
    }
    this.keys.add(key);
    this.onInteract?.();
    this.onKey?.(key);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.pointerId !== null) return;
    this.onInteract?.();
    const point = this.pointFromEvent(event);
    // A touch starts a temporary joystick at the point where the finger lands.
    // This makes the whole portrait screen a drag surface instead of reserving
    // a fixed corner, while short taps still reach UI buttons on pointer-up.
    this.pointerId = event.pointerId;
    this.pointerDownPoint = point;
    this.pointerMoved = false;
    this.joystickBase = point;
    this.joystickThumb = point;
    this.joystickVector = { x: 0, y: 0 };
    this.joystickActive = true;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.joystickActive || event.pointerId !== this.pointerId) return;
    event.preventDefault();
    const point = this.pointFromEvent(event);
    if (Math.hypot(point.x - this.pointerDownPoint.x, point.y - this.pointerDownPoint.y) > 10) this.pointerMoved = true;
    this.updateJoystick(point);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault();
    const point = this.pointFromEvent(event);
    const isTap = !this.pointerMoved;
    this.pointerId = null;
    this.joystickActive = false;
    this.joystickVector = { x: 0, y: 0 };
    this.joystickBase = point;
    this.joystickThumb = point;
    if (isTap) this.onPoint?.(point);
  };

  private updateJoystick(point: Vec2): void {
    const dx = point.x - this.joystickBase.x;
    const dy = point.y - this.joystickBase.y;
    const length = Math.hypot(dx, dy);
    const max = 48;
    const ratio = length > max ? max / length : 1;
    this.joystickThumb = { x: this.joystickBase.x + dx * ratio, y: this.joystickBase.y + dy * ratio };
    if (length < 7) {
      this.joystickVector = { x: 0, y: 0 };
      return;
    }
    const strength = clamp(length / max, 0, 1);
    const direction = normalize(dx, dy);
    this.joystickVector = { x: direction.x * strength, y: direction.y * strength };
  }
}
