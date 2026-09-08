export type SpeciesId = 'F001' | 'F002' | 'F003' | 'A001';
export type Pattern = 'steady' | 'dart' | 'rollback';
export interface Species {
  id: SpeciesId; name: string; kind: 'fish' | 'abstract'; pattern: Pattern;
  min: number; mode: number; max: number; weight: number; price: number; description: string;
}
export const SPECIES: readonly Species[] = [
  { id: 'F001', name: '鲫鱼', kind: 'fish', pattern: 'steady', min: 80, mode: 200, max: 350, weight: 180, price: 10,
    description: '平凡的银色，也能接住一整个下午的光。' },
  { id: 'F002', name: '麦穗鱼', kind: 'fish', pattern: 'dart', min: 30, mode: 80, max: 140, weight: 9, price: 10,
    description: '小小一尾，总觉得下一片水更有意思。' },
  { id: 'F003', name: '餐条', kind: 'fish', pattern: 'dart', min: 50, mode: 150, max: 280, weight: 40, price: 10,
    description: '像一道迟迟不肯落下的银色闪电。' },
  { id: 'A001', name: '回滚河豚', kind: 'abstract', pattern: 'rollback', min: 80, mode: 180, max: 350, weight: 150, price: 25,
    description: '它刚刚撤回了一次挣扎，然后又撤回了撤回。' },
];
export function species(id: SpeciesId): Species {
  const found = SPECIES.find(item => item.id === id);
  if (!found) throw new Error('Unknown species');
  return found;
}
export function isSpeciesId(value: unknown): value is SpeciesId { return SPECIES.some(item => item.id === value); }
export function spriteName(id: SpeciesId): string { return `${id.toLowerCase()}-pixel-v${id === 'F001' ? 1 : 2}.png`; }
