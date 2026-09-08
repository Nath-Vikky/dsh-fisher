import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, realpath, rename, stat, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { Server } from 'node:net';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { emptySave, object, id } from './model.ts';
import type { Save } from './model.ts';

import { decodeSave,encodeSave as encode,MAX_SAVE_BYTES as MAX_BYTES } from './save-codec.ts';
export function saveDirectory(): string {
  let home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh');
  if (home === '~') home = homedir();
  else if (home.startsWith('~/') || home.startsWith('~\\')) home = join(homedir(), home.slice(2));
  return join(resolve(home), 'fishersave');
}
async function readText(path:string,limit=MAX_BYTES):Promise<string> {
  if((await stat(path)).size>limit)throw new Error('SAVE_TOO_LARGE');
  const text=await readFile(path,'utf8');if(Buffer.byteLength(text)>limit)throw new Error('SAVE_TOO_LARGE');return text;
}
async function readSave(path:string):Promise<Save> {return decodeSave(await readText(path)).save;}
function errorCode(error: unknown): string { return String((error as NodeJS.ErrnoException)?.code ?? ''); }
async function replaceFile(source: string, target: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try { await rename(source, target); return; }
    catch (error) {
      if (attempt >= 3 || !['EPERM', 'EACCES', 'EBUSY'].includes(errorCode(error))) throw error;
      await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
}
async function atomicFile(path: string, text: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(text, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await replaceFile(temporary, path);
  } finally { await unlink(temporary).catch(() => {}); }
}

export class SaveStore {
  readonly directory: string;
  issue: string | null = null;
  private mutex: Server | undefined;
  private previous: Save | undefined;
  private closed = false;
  private locked=false;
  private workDisabled=false;
  private pendingReset:string|null=null;
  get canManage():boolean {return !this.closed&&this.locked;}
  constructor(directory = saveDirectory()) { this.directory = directory; }
  async load(): Promise<Save> {
    await mkdir(this.directory, { recursive: true });
    // An OS-owned loopback socket gives one writer per canonical directory, including after a crash.
    // A port collision fails closed; choosing another port would bypass mutual exclusion.
    const canonical = await realpath(this.directory);
    const key = process.platform === 'win32' ? canonical.toLowerCase() : canonical;
    const port = 20000 + createHash('sha256').update(key).digest().readUInt32BE(0) % 25000;
    const mutex = createServer(socket => socket.destroy());
    try {
      await new Promise<void>((resolve, reject) => {
        mutex.once('error', reject);
        mutex.listen({ host: '127.0.0.1', port, exclusive: true }, () => { mutex.removeListener('error', reject); resolve(); });
      });
      mutex.on('error', () => { this.locked=false;this.issue = '存档写入锁已失效，请重启插件'; });
      mutex.unref(); this.mutex = mutex;this.locked=true;
    } catch { this.issue = '存档正在被另一个宿主使用，或写入锁暂不可用'; mutex.close(); }
    try {
      const marker=object(JSON.parse(await readText(join(this.directory,'disabled.json'),512)));
      if(marker.version!==1||marker.workDisabled!==true)throw new Error('INVALID_DISABLE_MARKER');
      this.workDisabled=true;
      if(marker.resetId!==undefined)this.pendingReset=id(marker.resetId);
    } catch(error) {
      if(errorCode(error)!=='ENOENT'){this.workDisabled=true;this.issue='禁用标记未通过校验，已保留文件；请先导出再恢复';}
    }
    if(this.pendingReset) {
      const save=emptySave();save.id=this.pendingReset;
      if(this.canManage)try{await this.reset(save);}catch{/* The reset marker will resume the operation after restart. */}
      return save;
    }
    try {
      const save = await readSave(join(this.directory, 'save.json'));
      if(this.workDisabled)save.work.enabled=false;
      const original=await readFile(join(this.directory,'save.json'),'utf8');
      const source=object(object(JSON.parse(original)).save),sourceVersion=source.formatVersion;
      const backupName=sourceVersion===1||sourceVersion===2||sourceVersion===3?`save.before-v${sourceVersion+1}.json`
        :source.contentVersion===2?'save.before-content3.json':null;
      if (!this.issue && backupName) {
        const backupPath=join(this.directory,backupName);
        try {
          const backup=await open(backupPath,'wx',0o600);
          try { await backup.writeFile(original,'utf8');await backup.sync(); } finally { await backup.close(); }
        } catch (error) {
          const existing=errorCode(error)==='EEXIST'?await readFile(backupPath,'utf8').catch(()=>null):null;
          if (existing!==original) this.issue='旧存档备份未完成或不一致，已暂停升级';
        }
      }
      this.previous = save;
      return save;
    } catch (error) {
      if (errorCode(error) === 'ENOENT') {
        // Never create a fresh save over an orphaned backup.
        try { await stat(join(this.directory, 'save.backup.json')); }
        catch (backupError) {
          if (errorCode(backupError) !== 'ENOENT') throw backupError;
          const save = emptySave();
          if (!this.issue) await this.write(save);
          return save;
        }
      }
      if (error instanceof Error && error.message === 'UNSUPPORTED_SAVE_VERSION') {
        this.issue = '此存档需要其他版本的插件，已保留原文件';
        return emptySave();
      }
      this.issue = '存档未通过校验，已保留原文件；请先备份后恢复';
      try { const save=await readSave(join(this.directory,'save.backup.json'));if(this.workDisabled)save.work.enabled=false;this.previous=save;return save; } catch { return emptySave(); }
    }
  }
  async write(save: Save): Promise<void> {
    if (this.closed || !this.locked || this.pendingReset || this.issue) throw new Error(this.issue ?? 'STORE_CLOSED');
    const body = encode(save);
    if (this.previous) await atomicFile(join(this.directory, 'save.backup.json'), encode(this.previous));
    await atomicFile(join(this.directory, 'save.json'), body);
    if(this.workDisabled&&save.work.enabled) {
      try{await unlink(join(this.directory,'disabled.json'));}catch(error){if(errorCode(error)!=='ENOENT')throw error;}
      this.workDisabled=false;
    }
    this.previous = structuredClone(save);
  }
  async exportOriginal():Promise<string> {
    try{return await readText(join(this.directory,'save.json'));}
    catch(error){if(errorCode(error)!=='ENOENT')throw error;return readText(join(this.directory,'save.backup.json'));}
  }
  async backupText():Promise<string> {return readText(join(this.directory,'save.backup.json'));}
  private async suppressWork(resetId?:string):Promise<void> {
    await atomicFile(join(this.directory,'disabled.json'),JSON.stringify({version:1,workDisabled:true,...(resetId?{resetId}:{})}));
    this.workDisabled=true;this.pendingReset=resetId??null;
  }
  private async preserveOriginal():Promise<void> {
    let original:string;
    try{original=await readText(join(this.directory,'save.json'));}
    catch(error){if(errorCode(error)==='ENOENT')return;throw error;}
    try{const previous=await readText(join(this.directory,'save.before-restore.1.json'));await atomicFile(join(this.directory,'save.before-restore.2.json'),previous);}
    catch(error){if(errorCode(error)!=='ENOENT')throw error;}
    await atomicFile(join(this.directory,'save.before-restore.1.json'),original);
  }
  async replace(save:Save):Promise<void> {
    if(!this.canManage||this.pendingReset)throw new Error('STORE_NOT_WRITABLE');
    const body=encode(save);if(save.work.enabled)throw new Error('IMPORT_MUST_DISABLE_WORK');
    try {
      await this.preserveOriginal();await this.suppressWork();
      await atomicFile(join(this.directory,'save.backup.json'),encode(this.previous??save));
      await atomicFile(join(this.directory,'save.json'),body);
      this.previous=structuredClone(save);this.issue=null;
    } catch(error) {this.issue='存档替换没有完成，原文件或恢复备份已保留；请重试或重启插件';throw error;}
  }
  async reset(save:Save):Promise<void> {
    if(!this.canManage)throw new Error('STORE_NOT_WRITABLE');
    const body=encode(save);if(save.work.enabled)throw new Error('RESET_MUST_DISABLE_WORK');
    try {
      await this.suppressWork(save.id);
      // The durable reset intent precedes removal of this plugin's enumerated save files.
      const owned=/^save(?:\.backup|\.before-v[234]|\.before-content3|\.before-restore\.[12])?\.json(?:\.[0-9a-f-]{36}\.tmp)?$/;
      for(const name of await readdir(this.directory))if(owned.test(name))await unlink(join(this.directory,name));
      await atomicFile(join(this.directory,'save.backup.json'),body);
      await atomicFile(join(this.directory,'save.json'),body);
      await this.suppressWork();
      this.previous=structuredClone(save);this.issue=null;
    } catch(error) {this.issue='删除尚未完成，工作补给已停止；请重试，重启也会继续删除';throw error;}
  }
  async close(): Promise<void> {
    this.closed = true;this.locked=false;
    const mutex = this.mutex; this.mutex = undefined;
    if (mutex) await new Promise<void>(resolve => mutex.close(() => resolve()));
  }
}
