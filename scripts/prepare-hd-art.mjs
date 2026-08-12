#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const tile = 192;
const columns = 4;
const rows = 4;

const heroSources = [
  { id: 'aether-mage', source: 'aether-mage-16-direction-hd.png' },
  { id: 'holy-spellblade', source: 'holy-spellblade-16-direction-hd.png' },
  { id: 'mistwood-ranger', source: 'mistwood-ranger-16-direction-hd.png' },
];

const attackSource = 'attack-atlas-hd.png';

const isChroma = (data, offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return green > 150 && green > red * 1.35 && green > blue * 1.2 && red < 160 && blue < 190;
};

const isStrongChroma = (data, offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return green > 205 && red < 92 && blue < 150 && green > red * 1.8 && green > blue * 1.45;
};

const removeChroma = (data, width, height) => {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index] || !isChroma(data, index * 4)) return;
    visited[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
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
    if (!visited[index]) continue;
    const offset = index * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }

  // Remove the brightest chroma pixels globally as well. They can be trapped
  // inside enclosed weapon rings or crystal holes and therefore never touch
  // the image edge for the flood-fill pass above.
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (!isStrongChroma(data, offset)) continue;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }

  const original = Buffer.from(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      if (original[offset + 3] === 0) continue;
      let transparentNeighbour = false;
      for (let oy = -2; oy <= 2; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && original[(ny * width + nx) * 4 + 3] === 0) transparentNeighbour = true;
        }
      }
      if (!transparentNeighbour) continue;
      const red = original[offset];
      const green = original[offset + 1];
      const blue = original[offset + 2];
      if (green > Math.max(red, blue) + 8) {
        const contamination = Math.max(0, Math.min(1, (green - Math.max(red, blue) - 8) / 105));
        const neutral = Math.max(red, blue);
        data[offset] = Math.round(red * (1 - contamination * 0.42) + neutral * contamination * 0.42);
        data[offset + 1] = Math.round(green * (1 - contamination) + neutral * contamination);
        data[offset + 2] = Math.round(blue * (1 - contamination * 0.42) + neutral * contamination * 0.42);
        data[offset + 3] = Math.min(data[offset + 3], Math.round(255 * (1 - contamination * 0.92)));
        // The generated chroma background is intentionally neon green. A
        // strong green fringe at a transparent boundary is background spill,
        // not character material; remove it completely so the sprite does not
        // read as a pasted cutout on the forest.
        if (green > 145 && green - Math.max(red, blue) > 46) data[offset + 3] = 0;
      }
    }
  }
  return data;
};

const ensureDir = (directory) => fs.mkdir(directory, { recursive: true });

const makeAtlas = async (sourcePath, outputPath, outputWebpPath) => {
  const raw = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = removeChroma(raw.data, raw.info.width, raw.info.height);
  const input = sharp(data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } });
  const composites = [];
  for (let index = 0; index < 16; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.floor(column * raw.info.width / columns);
    const top = Math.floor(row * raw.info.height / rows);
    const right = Math.floor((column + 1) * raw.info.width / columns);
    const bottom = Math.floor((row + 1) * raw.info.height / rows);
    const cell = await input.clone()
      .extract({
        left,
        top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
      })
      .resize(tile - 24, tile - 18, { fit: 'inside' })
      .png()
      .toBuffer();
    const metadata = await sharp(cell).metadata();
    const cellWidth = metadata.width ?? tile;
    const cellHeight = metadata.height ?? tile;
    composites.push({
      input: cell,
      left: column * tile + Math.floor((tile - cellWidth) / 2),
      top: row * tile + Math.max(2, tile - cellHeight - 10),
    });
  }
  const atlas = await sharp({
    create: { width: tile * columns, height: tile * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites).png().toBuffer();
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, atlas);
  await sharp(atlas).webp({ quality: 94, effort: 6 }).toFile(outputWebpPath);
  return { sourceWidth: raw.info.width, sourceHeight: raw.info.height, outputBytes: atlas.length };
};

for (const hero of heroSources) {
  const source = path.join(root, 'art-assets/characters/source', hero.source);
  const artDir = path.join(root, 'art-assets/characters', hero.id, 'runtime');
  const publicDir = path.join(root, 'public/assets/characters', hero.id);
  await ensureDir(artDir);
  await ensureDir(publicDir);
  const result = await makeAtlas(
    source,
    path.join(artDir, 'directional-atlas-hd.png'),
    path.join(publicDir, 'directional-atlas-hd.webp'),
  );
  console.log(`${hero.id}: ${result.sourceWidth}x${result.sourceHeight} -> ${result.outputBytes} bytes`);
}

const attackInput = path.join(root, 'art-assets/attacks/source', attackSource);
const attackArtDir = path.join(root, 'art-assets/attacks/runtime');
const attackPublicDir = path.join(root, 'public/assets/attacks');
await ensureDir(attackArtDir);
await ensureDir(attackPublicDir);
const attackResult = await makeAtlas(
  attackInput,
  path.join(attackArtDir, 'attack-atlas.png'),
  path.join(attackPublicDir, 'attack-atlas.webp'),
);
console.log(`attacks: ${attackResult.sourceWidth}x${attackResult.sourceHeight} -> ${attackResult.outputBytes} bytes`);
