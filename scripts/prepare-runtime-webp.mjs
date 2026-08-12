import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assets = [
  'public/assets/forest-atmosphere.png',
  'public/assets/enemies/enemy-atlas.png',
  'public/assets/characters/aether-mage/directional-atlas.png',
  'public/assets/characters/holy-spellblade/directional-atlas.png',
  'public/assets/characters/mistwood-ranger/directional-atlas.png',
  'public/assets/characters/selection/aether-mage.png',
  'public/assets/characters/selection/holy-spellblade.png',
  'public/assets/characters/selection/mistwood-ranger.png',
];

for (const relative of assets) {
  const source = path.join(root, relative);
  const target = source.replace(/\.png$/i, '.webp');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await sharp(source).webp({ quality: 88, effort: 4 }).toFile(target);
  const [sourceStat, targetStat] = await Promise.all([fs.stat(source), fs.stat(target)]);
  const reduction = Math.round((1 - targetStat.size / sourceStat.size) * 100);
  console.log(`${relative} -> ${path.relative(root, target)} (${sourceStat.size} -> ${targetStat.size}, -${reduction}%)`);
}
