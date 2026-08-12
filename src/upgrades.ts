import { RARITY_COLORS } from './config';
import { ATTACK_DEFINITIONS, attackDefinition } from './attacks';
import type { AttackId, Player, Rarity, SkillId, Stats, UpgradeCard } from './types';

export interface SkillDefinition {
  id: SkillId;
  title: string;
  description: string;
  icon: SkillId;
  baseValue: string;
}

export const SKILLS: SkillDefinition[] = [
  { id: 'lightning', title: '閃電球', description: '球體釋放閃電鏈造成', icon: 'lightning', baseValue: '370% 傷害' },
  { id: 'blessing', title: '神的祝福', description: '暴擊率提升', icon: 'blessing', baseValue: '120%' },
  { id: 'ray', title: '以太射線', description: '基礎傷害提升', icon: 'ray', baseValue: '105%' },
  { id: 'vortex', title: '亡靈旋風', description: '持續傷害時間增加', icon: 'vortex', baseValue: '30%' },
  { id: 'embrace', title: '魔法之擁', description: '增加法術傷害', icon: 'embrace', baseValue: '350%' },
  { id: 'blade', title: '巫師之刃', description: '暴擊傷害提高', icon: 'blade', baseValue: '330%' },
  { id: 'vitality', title: '增加血量', description: '最大生命值提升，升級時完全恢復', icon: 'vitality', baseValue: '+18 最大生命' },
  { id: 'fortitude', title: '增加防禦力', description: '受到的接觸傷害降低', icon: 'fortitude', baseValue: '傷害 -4%' },
];

const RARITIES: Rarity[] = ['垃圾', '普通', '罕見!', '史詩!!', '傳說!!!'];

const skillMap = new Map(SKILLS.map((skill) => [skill.id, skill]));

export const rarityColor = (rarity: Rarity): string => RARITY_COLORS[rarity];

export const initialStats = (): Stats => ({
  orbCount: 2,
  orbDamageMultiplier: 3.7,
  attackInterval: 1.08,
  attackRadius: 360,
  chainCount: 3,
  chainRange: 210,
  baseDamage: 2.8,
  critRate: 0.08,
  critMultiplier: 1.75,
  moveSpeedMultiplier: 1,
  pickupRadius: 250,
  maxHpBonus: 0,
  dotDuration: 0,
  dotDamage: 0,
  damageReduction: 0,
  skillLevels: {
    lightning: 0,
    blessing: 0,
    ray: 0,
    vortex: 0,
    embrace: 0,
    blade: 0,
    vitality: 0,
    fortitude: 0,
  },
  ownedAttacks: ['lightning'],
  attackRanks: { lightning: 1 },
});

const valueFor = (id: SkillId, level: number): string => {
  if (id === 'lightning') return `${370 + Math.max(0, level - 1) * 55}% 傷害`;
  if (id === 'blessing') return `${120 + Math.max(0, level - 1) * 18}%`;
  if (id === 'ray') return `${105 + Math.max(0, level - 1) * 12}%`;
  if (id === 'vortex') return `${30 + Math.max(0, level - 1) * 9}%`;
  if (id === 'embrace') return `${350 + Math.max(0, level - 1) * 45}%`;
  if (id === 'blade') return `${330 + Math.max(0, level - 1) * 40}%`;
  if (id === 'vitality') return `+${18 + Math.max(0, level - 1) * 7} 最大生命`;
  return `傷害 -${4 + Math.max(0, level - 1) * 1.5}%`;
};

const pickRarity = (level: number): Rarity => {
  const roll = Math.random() + Math.min(level * 0.035, 0.18);
  if (roll > 1.12) return '傳說!!!';
  if (roll > 0.94) return '史詩!!';
  if (roll > 0.68) return '罕見!';
  if (roll > 0.22) return '普通';
  return '垃圾';
};

export const rollUpgradeCards = (stats: Stats): UpgradeCard[] => {
  const candidates: UpgradeCard[] = [];
  const owned = new Set(stats.ownedAttacks);
  if (stats.ownedAttacks.length < 8) {
    for (const attack of ATTACK_DEFINITIONS) {
      if (owned.has(attack.id)) continue;
      const rarity = pickRarity(1);
      candidates.push({
        id: attack.id,
        kind: 'attack-unlock',
        attackId: attack.id,
        rarity,
        level: 1,
        title: attack.name,
        description: attack.description,
        value: '獲得新攻擊',
        accent: rarityColor(rarity),
      });
    }
  }
  for (const attackId of stats.ownedAttacks) {
    if (attackId === 'lightning') {
      const level = (stats.attackRanks.lightning ?? 1) + 1;
      const rarity = pickRarity(level);
      candidates.push({ id: 'lightning', kind: 'attack-upgrade', attackId: 'lightning', rarity, level, title: '閃電球', description: '球體釋放閃電鏈造成', value: `${370 + Math.max(0, level - 1) * 55}% 傷害`, accent: rarityColor(rarity) });
    } else {
      const attack = attackDefinition(attackId);
      if (!attack) continue;
      const level = (stats.attackRanks[attackId] ?? 1) + 1;
      const rarity = pickRarity(level);
      candidates.push({ id: attackId, kind: 'attack-upgrade', attackId, rarity, level, title: attack.name, description: attack.upgradeDescription(level), value: attack.upgradeValue(level), accent: rarityColor(rarity) });
    }
  }
  for (const skill of SKILLS.filter((skill) => skill.id !== 'lightning')) {
    const level = stats.skillLevels[skill.id] + 1;
    const rarity = pickRarity(level);
    candidates.push({ id: skill.id, kind: 'passive', skillId: skill.id, rarity, level, title: skill.title, description: skill.description, value: valueFor(skill.id, level), accent: rarityColor(rarity) });
  }
  const unique = [...candidates].sort(() => Math.random() - 0.5);
  const selected: UpgradeCard[] = [];
  const kinds: UpgradeCard['kind'][] = ['attack-unlock', 'attack-upgrade', 'passive'];
  for (const kind of kinds) {
    const candidate = unique.find((item) => item.kind === kind && !selected.some((choice) => choice.id === item.id));
    if (candidate) selected.push(candidate);
  }
  for (const candidate of unique) {
    if (selected.length >= 3) break;
    if (!selected.some((choice) => choice.id === candidate.id)) selected.push(candidate);
  }
  return selected.slice(0, 3);
};

export const applyUpgrade = (stats: Stats, card: UpgradeCard): void => {
  if (card.kind === 'attack-unlock' && card.attackId && !stats.ownedAttacks.includes(card.attackId) && stats.ownedAttacks.length < 8) {
    stats.ownedAttacks.push(card.attackId);
    stats.attackRanks[card.attackId] = 1;
    return;
  }
  if (card.kind === 'attack-upgrade' && card.attackId) {
    const level = (stats.attackRanks[card.attackId] ?? 1) + 1;
    stats.attackRanks[card.attackId] = level;
    if (card.attackId === 'lightning') {
      const rarityBoost = card.rarity === '傳說!!!' ? 1.55 : card.rarity === '史詩!!' ? 1.3 : card.rarity === '罕見!' ? 1.12 : card.rarity === '普通' ? 1 : 0.82;
      stats.orbDamageMultiplier += 0.34 * rarityBoost;
      stats.chainCount += level % 2 === 0 ? 1 : 0;
      stats.chainRange += 10 * rarityBoost;
      stats.attackInterval = Math.max(0.42, stats.attackInterval - 0.06 * rarityBoost);
      if (level === 2 || (level > 2 && level % 3 === 0)) stats.orbCount = Math.min(5, stats.orbCount + 1);
    }
    return;
  }
  const skillId = card.skillId ?? (card.id as SkillId);
  if (!SKILLS.some((skill) => skill.id === skillId)) return;
  stats.skillLevels[skillId] += 1;
  const level = stats.skillLevels[skillId];
  const rarityBoost = card.rarity === '傳說!!!' ? 1.55 : card.rarity === '史詩!!' ? 1.3 : card.rarity === '罕見!' ? 1.12 : card.rarity === '普通' ? 1 : 0.82;
  if (skillId === 'lightning') {
    stats.orbDamageMultiplier += 0.34 * rarityBoost;
    stats.chainCount += level % 2 === 0 ? 1 : 0;
    stats.chainRange += 10 * rarityBoost;
    stats.attackInterval = Math.max(0.42, stats.attackInterval - 0.06 * rarityBoost);
    if (level === 2 || (level > 2 && level % 3 === 0)) stats.orbCount = Math.min(5, stats.orbCount + 1);
  } else if (skillId === 'blessing') {
    stats.critRate = Math.min(0.6, stats.critRate + 0.065 * rarityBoost);
  } else if (skillId === 'ray') {
    stats.baseDamage += 1.55 * rarityBoost;
    stats.attackRadius += 15 * rarityBoost;
  } else if (skillId === 'vortex') {
    stats.dotDuration += 1.2 * rarityBoost;
    stats.dotDamage += 1.8 * rarityBoost;
  } else if (skillId === 'embrace') {
    stats.orbDamageMultiplier += 0.22 * rarityBoost;
    stats.moveSpeedMultiplier += 0.025;
  } else if (skillId === 'blade') {
    stats.critMultiplier += 0.24 * rarityBoost;
  } else if (skillId === 'vitality') {
    stats.maxHpBonus += (15 + level * 3) * rarityBoost;
  } else if (skillId === 'fortitude') {
    stats.damageReduction = Math.min(0.68, stats.damageReduction + 0.035 * rarityBoost);
  }
};

/**
 * Every level grants a small, deterministic baseline growth in addition to
 * the selected card. This keeps a run from becoming dependent on drawing the
 * same passive repeatedly, while the full heal makes level-up a readable
 * recovery moment instead of only a menu interruption.
 */
export const applyLevelGrowth = (stats: Stats, player: Player): void => {
  const healthGrowth = 5 + Math.floor(player.level / 8);
  player.maxHp += healthGrowth;
  stats.baseDamage += 0.08 + player.level * 0.004;
  stats.attackInterval = Math.max(0.42, stats.attackInterval - 0.006);
  stats.pickupRadius += 2;
  stats.damageReduction = Math.min(0.22, stats.damageReduction + 0.0035);
  player.hp = player.maxHp + stats.maxHpBonus;
};

export const skillDefinition = (id: SkillId): SkillDefinition => skillMap.get(id) ?? SKILLS[0];

export const skillLevel = (stats: Stats, id: SkillId): number => stats.skillLevels[id];
