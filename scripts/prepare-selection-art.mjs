import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const source = '/tmp/codex-remote-attachments/019ff341-c73a-7e43-9387-244e4bdeb507/DCBECCA6-CEEE-4955-9084-C74582217B46/6-照片-6.jpg';
const destination = path.join(root, 'public/assets/characters/selection');
const sourceDestination = path.join(root, 'art-assets/characters/source/hero-selection-reference.jpg');

const crops = [
  { id: 'aether-mage', left: 0, top: 0, width: 435, height: 720 },
  { id: 'holy-spellblade', left: 410, top: 0, width: 455, height: 720 },
  { id: 'mistwood-ranger', left: 842, top: 0, width: 438, height: 720 },
];

const isBackgroundWhite = (r, g, b) => r > 247 && g > 247 && b > 247 && Math.max(r, g, b) - Math.min(r, g, b) < 10;

await fs.mkdir(destination, { recursive: true });
await fs.mkdir(path.dirname(sourceDestination), { recursive: true });
await fs.copyFile(source, sourceDestination);

for (const crop of crops) {
  const { data, info } = await sharp(source)
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const visited = new Uint8Array(info.width * info.height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const index = y * info.width + x;
    if (visited[index]) return;
    const offset = index * 4;
    if (!isBackgroundWhite(data[offset], data[offset + 1], data[offset + 2])) return;
    visited[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < info.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, info.height - 1);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(0, y);
    enqueue(info.width - 1, y);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  for (let index = 0; index < visited.length; index += 1) {
    const offset = index * 4;
    if (visited[index]) {
      data[offset + 3] = 0;
      continue;
    }
    // Remove only the pale fringe near the flooded background. This keeps the
    // heroes' ivory cloth and hair highlights intact while avoiding a white halo.
    const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
    const spread = Math.max(data[offset], data[offset + 1], data[offset + 2]) - Math.min(data[offset], data[offset + 1], data[offset + 2]);
    if (luminance > 242 && spread < 18) data[offset + 3] = Math.min(data[offset + 3], 100);
  }

  const output = path.join(destination, `${crop.id}.png`);
  await sharp(data, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: true }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).toFile(output);
  const metadata = await sharp(output).metadata();
  console.log(`${crop.id}: ${metadata.width}x${metadata.height} -> ${output}`);
}
