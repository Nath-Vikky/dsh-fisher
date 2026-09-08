import { createHash } from 'node:crypto';
import { object,upgradeSave,validateSave } from './model.ts';
import type { Save } from './model.ts';

export const MAX_SAVE_BYTES=2*1024*1024;
const digest=(body:string)=>createHash('sha256').update(body).digest('hex');
export function encodeSave(save:Save):string {
  validateSave(save);const body=JSON.stringify(save),result=JSON.stringify({checksum:digest(body),save});
  if(Buffer.byteLength(result)>MAX_SAVE_BYTES)throw new Error('SAVE_TOO_LARGE');return result;
}
export function decodeSave(text:string):{save:Save;format:number;content:number;checksum:string} {
  if(Buffer.byteLength(text)>MAX_SAVE_BYTES)throw new Error('SAVE_TOO_LARGE');
  const wrapper=object(JSON.parse(text)),data=object(wrapper.save),format=data.formatVersion,content=data.contentVersion;
  if(format!==1&&format!==2&&format!==3&&format!==4)throw new Error('UNSUPPORTED_SAVE_VERSION');
  const checksum=digest(JSON.stringify(data));if(wrapper.checksum!==checksum)throw new Error('SAVE_CHECKSUM_MISMATCH');
  return {save:upgradeSave(data),format,content:typeof content==='number'?content:0,checksum};
}
