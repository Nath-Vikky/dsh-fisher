import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { Server } from 'node:net';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { emptySave, object, validateSave } from './model.ts';
import type { Save } from './model.ts';

const MAX_BYTES = 2 * 1024 * 1024;
export function saveDirectory(): string {
  let home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh');
  if (home === '~') home = homedir();
  else if (home.startsWith('~/') || home.startsWith('~\\')) home = join(homedir(), home.slice(2));
  return join(resolve(home), 'fishersave');
}
function digest(body: string): string { return createHash('sha256').update(body).digest('hex'); }
function encode(save: Save): string {
  validateSave(save);
  const body = JSON.stringify(save);
  const result = JSON.stringify({ checksum: digest(body), save });
  if (Buffer.byteLength(result) > MAX_BYTES) throw new Error('SAVE_TOO_LARGE');
  return result;
}
async function readSave(path: string): Promise<Save> {
  if ((await stat(path)).size > MAX_BYTES) throw new Error('SAVE_TOO_LARGE');
  const wrapper = object(JSON.parse(await readFile(path, 'utf8')));
  validateSave(wrapper.save);
  if (wrapper.checksum !== digest(JSON.stringify(wrapper.save))) throw new Error('SAVE_CHECKSUM_MISMATCH');
  return wrapper.save;
}
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
      mutex.on('error', () => { this.issue = '存档写入锁已失效，请重启插件'; });
      mutex.unref(); this.mutex = mutex;
    } catch { this.issue = '存档正在被另一个宿主使用，或写入锁暂不可用'; mutex.close(); }
    try {
      const save = await readSave(join(this.directory, 'save.json'));
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
      try { return await readSave(join(this.directory, 'save.backup.json')); } catch { return emptySave(); }
    }
  }
  async write(save: Save): Promise<void> {
    if (this.closed || !this.mutex || this.issue) throw new Error(this.issue ?? 'STORE_CLOSED');
    const body = encode(save);
    if (this.previous) await atomicFile(join(this.directory, 'save.backup.json'), encode(this.previous));
    await atomicFile(join(this.directory, 'save.json'), body);
    this.previous = structuredClone(save);
  }
  async close(): Promise<void> {
    this.closed = true;
    const mutex = this.mutex; this.mutex = undefined;
    if (mutex) await new Promise<void>(resolve => mutex.close(() => resolve()));
  }
}
