export function object(value:unknown): Record<string,unknown> {
  if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('Expected object');
  return value as Record<string,unknown>;
}
export function integer(value:unknown,min=0,max=2147483647): number {
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new Error('Invalid integer');
  return value;
}
export function id(value:unknown): string {
  if(typeof value!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(value))throw new Error('Invalid identifier');
  return value;
}
