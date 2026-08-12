export const GAME_WIDTH = 512;
export const GAME_HEIGHT = 728;
// The playable world is intentionally much larger than the portrait frame.
// WORLD_VIEW_ZOOM controls the camera lens only; HUD coordinates remain in the
// 512x728 logical surface so touch layouts stay stable.
export const WORLD_WIDTH = 3072;
export const WORLD_HEIGHT = 3840;
export const WORLD_VIEW_ZOOM = 0.74;

export const COLORS = {
  ink: '#06120f',
  deepForest: '#0c2a20',
  grass: '#276346',
  grassLight: '#5f9c5a',
  path: '#b58a61',
  cyan: '#8cefff',
  electric: '#48d9ff',
  white: '#f4fbff',
  gold: '#f3c46d',
  danger: '#ef603b',
  xp: '#aaf4d0',
};

export const FONT = '"Trebuchet MS", "PingFang TC", "Noto Sans TC", sans-serif';
export const MONO_FONT = '"SFMono-Regular", "Roboto Mono", monospace';

export const PLAYER_RADIUS = 17;
export const PLAYER_SPEED = 176;
export const MAX_ENEMIES = 78;

export const RARITY_COLORS: Record<string, string> = {
  垃圾: '#92979a',
  普通: '#63e077',
  '罕見!': '#6de6f1',
  '史詩!!': '#c58bff',
  '傳說!!!': '#ff8065',
};
