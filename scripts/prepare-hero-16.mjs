#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const projectRoot = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const sourcePath = path.join(projectRoot, 'art-assets/characters/source/hero-16-direction-reference.jpg');
const sourceGrid = { columns: 8, rows: 6 };
// The generated reference board leaves narrow white gutters between rows;
// explicit bands keep the next hero row from bleeding into a sprite crop.
const sourceRowBounds = [0, 198, 407, 617, 827, 1039, 1254];
const runtimeTile = 192;
const runtimeGrid = { columns: 4, rows: 4 };
const heroes = [
  { id: 'aether-mage', row: 0 },
  { id: 'holy-spellblade', row: 2 },
  { id: 'mistwood-ranger', row: 4 },
];

const directionOrder = Array.from({ length: 16 }, (_, index) => `d${String(index).padStart(2, '0')}`);

const ensureDir = (directory) => fs.mkdir(directory, { recursive: true });

const isNearWhite = (r, g, b) => {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 236 && max - min <= 24;
};

const floodBackground = (rgba, width, height) => {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const offset = index * 4;
    if (!isNearWhite(rgba[offset], rgba[offset + 1], rgba[offset + 2])) return;
    visited[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index]) rgba[index * 4 + 3] = 0;
  }
  return rgba;
};

// The supplied sheet is a JPEG on white paper. Flood filling removes the
// connected paper, but anti-aliased JPEG pixels keep a pale fringe around hair,
// capes and weapon crystals. Decontaminate only edge pixels that still have a
// transparent neighbour; opaque white costume areas remain untouched.
const cleanChromaFringe = (rgba, width, height) => {
  const source = Buffer.from(rgba);
  const indexAt = (x, y) => (y * width + x) * 4;
  const hasTransparentNeighbour = (x, y) => {
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        const ny = y + oy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && source[indexAt(nx, ny) + 3] === 0) return true;
      }
    }
    return false;
  };
  const transparentDistance = (x, y) => {
    for (let radius = 1; radius <= 2; radius += 1) {
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && source[indexAt(nx, ny) + 3] === 0) return radius;
        }
      }
    }
    return 3;
  };
  const nearestTintedPixel = (x, y) => {
    let best = null;
    let bestScore = -Infinity;
    for (let oy = -2; oy <= 2; oy += 1) {
      for (let ox = -2; ox <= 2; ox += 1) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const offset = indexAt(nx, ny);
        if (source[offset + 3] === 0) continue;
        const r = source[offset];
        const g = source[offset + 1];
        const b = source[offset + 2];
        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        const saturation = max - min;
        const distance = Math.abs(ox) + Math.abs(oy);
        const score = saturation * 1.8 + (255 - min) - distance * 12;
        if (score > bestScore) {
          bestScore = score;
          best = { r, g, b };
        }
      }
    }
    return best;
  };
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = indexAt(x, y);
      if (source[offset + 3] === 0 || !hasTransparentNeighbour(x, y)) continue;
      const r = source[offset];
      const g = source[offset + 1];
      const b = source[offset + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const whiteness = Math.max(0, Math.min(1, (min - 172) / 83));
      const lowSaturation = Math.max(0, Math.min(1, 1 - (max - min) / 62));
      const tint = nearestTintedPixel(x, y);
      if (!tint) continue;
      const blend = whiteness * lowSaturation * 0.78;
      rgba[offset] = Math.round(r * (1 - blend) + tint.r * blend);
      rgba[offset + 1] = Math.round(g * (1 - blend) + tint.g * blend);
      rgba[offset + 2] = Math.round(b * (1 - blend) + tint.b * blend);
      if (whiteness > 0.58 && lowSaturation > 0.52) {
        const distance = transparentDistance(x, y);
        // A paper-white pixel on the first edge ring is almost certainly
        // background contamination. Remove it rather than leaving a grey halo
        // when the 192px runtime tile is enlarged in the selector.
        const edgeAlpha = distance === 1 ? 0 : distance === 2 ? 0.18 : 0.58;
        rgba[offset + 3] = Math.min(rgba[offset + 3], Math.round(255 * edgeAlpha * (1 - blend * 0.45)));
      }
    }
  }
  return rgba;
};

const connectedComponents = (rgba, width, height) => {
  const visited = new Uint8Array(width * height);
  const components = [];
  const neighbors = [-1, 0, 1];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (visited[startIndex] || rgba[startIndex * 4 + 3] === 0) continue;
      visited[startIndex] = 1;
      const queue = [startIndex];
      const pixels = [];
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor];
        const currentX = index % width;
        const currentY = Math.floor(index / width);
        pixels.push(index);
        sumX += currentX;
        sumY += currentY;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);
        for (const offsetY of neighbors) {
          for (const offsetX of neighbors) {
            if (offsetX === 0 && offsetY === 0) continue;
            const nextX = currentX + offsetX;
            const nextY = currentY + offsetY;
            if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
            const nextIndex = nextY * width + nextX;
            if (visited[nextIndex] || rgba[nextIndex * 4 + 3] === 0) continue;
            visited[nextIndex] = 1;
            queue.push(nextIndex);
          }
        }
      }
      if (pixels.length >= 10) components.push({ pixels, centerX: sumX / pixels.length, centerY: sumY / pixels.length, minX, maxX, minY, maxY });
    }
  }
  return components;
};

const makeTile = async (rgba, width, height) => {
  const transparentCrop = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: runtimeTile - 20, height: runtimeTile - 18, fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tileWidth = transparentCrop.info.width;
  const tileHeight = transparentCrop.info.height;
  // The source sheet was composited on white paper. After resizing, browser
  // interpolation can sample RGB values from transparent paper pixels and
  // create a white fringe. Unmatte partial pixels against white, then clear
  // fully transparent RGB so Canvas cannot leak the paper colour.
  for (let index = 0; index < transparentCrop.data.length; index += 4) {
    const alpha = transparentCrop.data[index + 3] / 255;
    if (alpha < 0.01) {
      transparentCrop.data[index] = 0;
      transparentCrop.data[index + 1] = 0;
      transparentCrop.data[index + 2] = 0;
      transparentCrop.data[index + 3] = 0;
      continue;
    }
    if (alpha < 0.98) {
      for (let channel = 0; channel < 3; channel += 1) {
        const channelValue = transparentCrop.data[index + channel] / 255;
        const foreground = Math.max(0, Math.min(1, (channelValue - (1 - alpha)) / alpha));
        transparentCrop.data[index + channel] = Math.round(foreground * 255);
      }
    }
  }
  const left = Math.floor((runtimeTile - tileWidth) / 2);
  const top = Math.max(3, runtimeTile - tileHeight - 12);
  return sharp({
    create: {
      width: runtimeTile,
      height: runtimeTile,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: transparentCrop.data, raw: { width: tileWidth, height: tileHeight, channels: 4 }, left, top }]).png().toBuffer();
};

const main = async () => {
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cellWidth = info.width / sourceGrid.columns;
  const rowComponents = new Map();
  for (let row = 0; row < sourceGrid.rows; row += 1) {
    const top = sourceRowBounds[row];
    const bottom = sourceRowBounds[row + 1];
    const width = info.width;
    const height = bottom - top;
    const rowPixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      const start = (top + y) * info.width * 4;
      data.copy(rowPixels, y * width * 4, start, start + width * 4);
    }
    const cleanedRow = cleanChromaFringe(floodBackground(rowPixels, width, height), width, height);
    rowComponents.set(row, { rgba: cleanedRow, components: connectedComponents(cleanedRow, width, height), width, height });
  }
  const manifest = {
    source: 'art-assets/characters/source/hero-16-direction-reference.jpg',
    sourceDimensions: { width: info.width, height: info.height },
    sourceGrid,
    sourceRowBounds,
    runtimeGrid,
    runtimeTile,
    directionOrder,
    directionConvention: 'd00 is camera-facing/down; slots advance clockwise in 22.5 degree sectors. The supplied sheet is read left-to-right across the first row, then left-to-right across the second row for each hero.',
    heroes: [],
  };

  for (const hero of heroes) {
    const runtimeDirectory = path.join(projectRoot, 'art-assets/characters', hero.id, 'runtime');
    const directionDirectory = path.join(runtimeDirectory, 'directions');
    const publicDirectory = path.join(projectRoot, 'public/assets/characters', hero.id);
    await ensureDir(directionDirectory);
    await ensureDir(publicDirectory);
    const tiles = [];
    for (let index = 0; index < 16; index += 1) {
      const column = index % sourceGrid.columns;
      const row = hero.row + Math.floor(index / sourceGrid.columns);
      const rowData = rowComponents.get(row);
      const overlap = 24;
      const left = Math.max(0, Math.floor(column * cellWidth - overlap));
      const top = 0;
      const right = Math.min(info.width, Math.ceil((column + 1) * cellWidth + overlap));
      const width = right - left;
      const height = rowData.height;
      const targetCenter = (column + 0.5) * cellWidth;
      const localComponents = rowData.components.filter((component) => Math.abs(component.centerX - targetCenter) <= cellWidth * 0.67);
      const largestComponent = Math.max(1, ...localComponents.map((component) => component.pixels.length));
      // Discard isolated JPEG dust / neighbouring-row specks while keeping
      // meaningful disconnected weapons and staff crystals.
      const selected = localComponents.filter((component) => component.pixels.length >= Math.max(20, largestComponent * 0.01));
      const selectedPixels = new Set();
      for (const component of selected) for (const pixel of component.pixels) selectedPixels.add(pixel);
      const cropped = Buffer.alloc(width * height * 4);
      for (let y = 0; y < height; y += 1) {
        for (let x = left; x < right; x += 1) {
          const sourceIndex = y * rowData.width + x;
          if (!selectedPixels.has(sourceIndex)) continue;
          const sourceOffset = sourceIndex * 4;
          const destOffset = (y * width + (x - left)) * 4;
          rowData.rgba.copy(cropped, destOffset, sourceOffset, sourceOffset + 4);
        }
      }
      const tile = await makeTile(cropped, width, height);
      const name = `${directionOrder[index]}.png`;
      await fs.writeFile(path.join(directionDirectory, name), tile);
      tiles.push(tile);
    }
    const atlas = await sharp({
      create: {
        width: runtimeTile * runtimeGrid.columns,
        height: runtimeTile * runtimeGrid.rows,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(tiles.map((tile, index) => ({
      input: tile,
      left: (index % runtimeGrid.columns) * runtimeTile,
      top: Math.floor(index / runtimeGrid.columns) * runtimeTile,
    }))).png().toBuffer();
    const atlasPath = path.join(runtimeDirectory, 'directional-atlas.png');
    await fs.writeFile(atlasPath, atlas);
    await fs.writeFile(path.join(publicDirectory, 'directional-atlas.png'), atlas);
    await fs.writeFile(path.join(runtimeDirectory, 'directional-atlas.json'), JSON.stringify({
      heroId: hero.id,
      atlas: `characters/${hero.id}/directional-atlas.png`,
      sourceRows: [hero.row, hero.row + 1],
      sourceRowBounds,
      sourceGrid,
      runtimeGrid,
      runtimeTile,
      directionOrder,
    }, null, 2) + '\n');
    manifest.heroes.push({
      id: hero.id,
      sourceRows: [hero.row, hero.row + 1],
      runtimeAtlas: `characters/${hero.id}/directional-atlas.png`,
      runtimeDirections: directionOrder.map((name) => `characters/${hero.id}/directions/${name}.png`),
    });
  }
  await fs.writeFile(path.join(projectRoot, 'art-assets/characters/hero-16-direction-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
};

await main();
