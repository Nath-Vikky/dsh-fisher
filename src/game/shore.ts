import type { RegionId, Species } from './content.ts';
import type { Tide } from './progression.ts';

export const SPOT_IDS = ['pier', 'cove'] as const;
export type SpotId = typeof SPOT_IDS[number];
export interface ShoreState { spots: Record<RegionId, SpotId> }
export function emptyShore(): ShoreState { return { spots: { L01:'pier', L02:'pier', L03:'pier', L04:'pier' } }; }
export function isSpot(value: unknown): value is SpotId { return value === 'pier' || value === 'cove'; }
export function waterClue(spot: SpotId, tide: Tide): { title: string; detail: string } {
  return spot === 'cove'
    ? { title:'浅水鱼影', detail:'普通鱼更常见，同稀有层中偏爱谷香的鱼更容易靠近。适合攒鱼、找浅湾线索。' }
    : { title:tide === 'odd' ? '异常水纹' : '深水气泡', detail:'奇珍异兽和旧物更容易上钩。奇潮时，奇珍异兽还会更活跃。' };
}
export function spotWeights(region: RegionId, spot?: SpotId): readonly number[] | null {
  return region !== 'L01' || !spot ? null : spot === 'cove' ? [96,3,1] : [80,14,6];
}
export function spotPreference(def: Species, spot?: SpotId): number {
  return def.region === 'L01' && spot === 'cove' && def.tags.includes('grain') ? 2 : 1;
}
