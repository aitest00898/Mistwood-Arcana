import { RARITY_COLORS } from './config';
import type { Rarity, SkillId, Stats, UpgradeCard } from './types';

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
  },
});

const valueFor = (id: SkillId, level: number): string => {
  if (id === 'lightning') return `${370 + Math.max(0, level - 1) * 55}% 傷害`;
  if (id === 'blessing') return `${120 + Math.max(0, level - 1) * 18}%`;
  if (id === 'ray') return `${105 + Math.max(0, level - 1) * 12}%`;
  if (id === 'vortex') return `${30 + Math.max(0, level - 1) * 9}%`;
  if (id === 'embrace') return `${350 + Math.max(0, level - 1) * 45}%`;
  return `${330 + Math.max(0, level - 1) * 40}%`;
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
  const shuffled = [...SKILLS].sort(() => Math.random() - 0.5);
  if (stats.skillLevels.lightning === 0) {
    const lightning = SKILLS.find((skill) => skill.id === 'lightning');
    if (lightning) {
      const rest = shuffled.filter((skill) => skill.id !== 'lightning').slice(0, 2);
      shuffled.splice(0, shuffled.length, lightning, ...rest);
    }
  }
  return shuffled.slice(0, 3).map((skill, index) => {
    const level = stats.skillLevels[skill.id] + 1;
    const rarity = index === 0 && stats.skillLevels.lightning === 0 ? '罕見!' : pickRarity(level);
    return {
      id: skill.id,
      rarity,
      level,
      title: skill.title,
      description: skill.description,
      value: valueFor(skill.id, level),
      accent: rarityColor(rarity),
    };
  });
};

export const applyUpgrade = (stats: Stats, card: UpgradeCard): void => {
  stats.skillLevels[card.id] += 1;
  const level = stats.skillLevels[card.id];
  const rarityBoost = card.rarity === '傳說!!!' ? 1.55 : card.rarity === '史詩!!' ? 1.3 : card.rarity === '罕見!' ? 1.12 : card.rarity === '普通' ? 1 : 0.82;
  if (card.id === 'lightning') {
    stats.orbDamageMultiplier += 0.34 * rarityBoost;
    stats.chainCount += level % 2 === 0 ? 1 : 0;
    stats.chainRange += 10 * rarityBoost;
    stats.attackInterval = Math.max(0.42, stats.attackInterval - 0.06 * rarityBoost);
    if (level === 2 || (level > 2 && level % 3 === 0)) stats.orbCount = Math.min(5, stats.orbCount + 1);
  } else if (card.id === 'blessing') {
    stats.critRate = Math.min(0.6, stats.critRate + 0.065 * rarityBoost);
  } else if (card.id === 'ray') {
    stats.baseDamage += 1.55 * rarityBoost;
    stats.attackRadius += 15 * rarityBoost;
  } else if (card.id === 'vortex') {
    stats.dotDuration += 1.2 * rarityBoost;
    stats.dotDamage += 1.8 * rarityBoost;
  } else if (card.id === 'embrace') {
    stats.orbDamageMultiplier += 0.22 * rarityBoost;
    stats.moveSpeedMultiplier += 0.025;
  } else if (card.id === 'blade') {
    stats.critMultiplier += 0.24 * rarityBoost;
    stats.maxHpBonus += 3;
  }
};

export const skillDefinition = (id: SkillId): SkillDefinition => skillMap.get(id) ?? SKILLS[0];

export const skillLevel = (stats: Stats, id: SkillId): number => stats.skillLevels[id];
