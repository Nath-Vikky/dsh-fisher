import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { WebServer } from '@deepseek-ai/dsh-host-webserver';
import type { SessionStore } from '@deepseek-ai/dsh-session';
import { API } from './protocol.ts';
import { SPRITES } from './game/content.ts';
import { GEAR_ART } from './game/gear.ts';
import { imageContentType,thumbnailAsset } from './game/art.ts';
import { SCENE_ART,visualIllustrations } from './game/visuals.ts';
import { ActionError, FisherService, workClock } from './host/service.ts';
import { WorkAdapter } from './host/work-adapter.ts';
import { MAX_SAVE_BYTES } from './host/save-codec.ts';

export const name = 'dsh-fisher';
export const inject = ['webServer', 'connection', 'sessions'];

type HostContext = Context & { webServer: WebServer; connection: HostConnectionHandle; sessions: SessionStore };

export function apply(ctx: HostContext): void {
  if (typeof ctx.connection.requestRejection !== 'function') {
    throw new Error('dsh-fisher requires the authenticated DSH Web connection service.');
  }

  ctx.effect(() => {
    const service = new FisherService();
    const ready = service.initialize();
    // Keep initialization rejection handled even when the UI is never opened.
    void ready.catch(() => {});
    const streams = new Map<ServerResponse, IncomingMessage>();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let disposed = false;
    let observation: { epoch: number; dispose: () => void } | undefined;
    const syncObservation = () => {
      if (observation && (disposed || !service.observingWork || observation.epoch !== service.workEpoch)) {
        observation.dispose(); observation = undefined;
      }
      if (!observation && !disposed && service.observingWork) {
        const epoch = service.workEpoch;
        const adapter = new WorkAdapter(ctx.sessions, event => service.observe(event, epoch), workClock);
        const stopEvents = ctx.on('session/event', (session, event) => adapter.observe(session, event));
        const stopDisposed = ctx.on('session/disposed', session => adapter.dispose(session));
        observation = { epoch, dispose: () => { stopEvents(); stopDisposed(); } };
      }
    };
    void ready.then(syncObservation).catch(() => {});
    const assets = new Map<string, { file: URL; contentType: string; cacheControl: string; buffer?: Promise<Buffer> }>([
      [`${API}/client/game.js`, { file: new URL('./game.js', import.meta.url),
        contentType: 'text/javascript; charset=utf-8', cacheControl: 'no-store' }],
    ]);
    const illustrations=[...Object.values(SPRITES).flatMap(variants=>Object.values(variants)),...Object.values(GEAR_ART),...visualIllustrations()];
    for (const filename of new Set([...illustrations.flatMap(file=>[file,thumbnailAsset(file)]),...Object.values(SCENE_ART)])) {
      assets.set(`${API}/assets/${filename}`, { file: new URL(`../assets/runtime/${filename}`, import.meta.url),
        contentType: imageContentType(filename), cacheControl: 'private, max-age=604800, immutable' });
    }
    const revisionEvent = () => {
      const state = service.snapshot();
      return `event: revision\ndata: ${JSON.stringify({ generation: state.generation, revision: state.revision, gameplayAvailable: state.gameplayAvailable, pluginEnabled:service.preferences().enabled })}\n\n`;
    };
    const unsubscribe = service.subscribe(() => {
      syncObservation();
      for (const [stream, request] of streams) {
        if (ctx.connection.requestRejection(request) !== undefined || stream.destroyed || !stream.write(revisionEvent())) {
          stream.end(); streams.delete(stream);
        }
      }
    });

    const stopHeartbeat = () => {
      if (heartbeat !== undefined) clearInterval(heartbeat);
      heartbeat = undefined;
    };
    const close = () => {
      disposed = true;
      syncObservation();
      stopHeartbeat();
      for (const response of streams.keys()) response.end();
      streams.clear();
      unsubscribe();
      void ready.catch(() => {}).then(() => service.close());
    };
    const json = (response: ServerResponse, status: number, body: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(body));
    };

    const unregister = ctx.webServer.register({
      kind: 'prefix', path: API,
      async handler(request, response) {
        const rejection = ctx.connection.requestRejection(request);
        if (rejection !== undefined) {
          json(response, rejection, { error: rejection === 401 ? 'AUTH_REQUIRED' : 'FORBIDDEN' });
          return;
        }
        if (disposed) { json(response, 503, { error: 'UNAVAILABLE' }); return; }
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const preferences=pathname===`${API}/preferences`;
        const known = [`${API}/preferences`,`${API}/bootstrap`, `${API}/state`, `${API}/events`, `${API}/actions`, `${API}/cast-input`,`${API}/save/preview`,`${API}/save/export`];
        if (!known.includes(pathname) && !assets.has(pathname)) { json(response, 404, { error: 'NOT_FOUND' }); return; }
        const preview=pathname===`${API}/save/preview`;
        const mutation = pathname === `${API}/actions` || pathname === `${API}/cast-input` || preview || preferences&&request.method==='POST';
        if (request.method !== (mutation ? 'POST' : 'GET')) {
          response.setHeader('Allow', preferences?'GET, POST':mutation ? 'POST' : 'GET');
          json(response, 405, { error: 'METHOD_NOT_ALLOWED' });
          return;
        }
        if (mutation || !assets.has(pathname)) {
          try { await ready; }
          catch { json(response, 503, { error: '存档暂时无法打开，请检查目录权限后重启插件' }); return; }
          if (disposed) { json(response, 503, { error: 'UNAVAILABLE' }); return; }
        }
        if (mutation) {
          try {
            if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new ActionError('请使用 JSON 请求', 415);
            const limit = preview?MAX_SAVE_BYTES*2+4096:pathname.endsWith('/cast-input') ? 65536 : 32768;
            if (Number(request.headers['content-length'] ?? 0) > limit) throw new ActionError('请求过大', 413);
            const body = await readJson(request, limit);
            if (disposed) throw new ActionError('插件已停止', 503);
            if(preferences){json(response,200,await service.setEnabled(body));return;}
            if(preview){json(response,200,await service.previewSave(body));return;}
            const result = await service.mutate(body, pathname.endsWith('/cast-input'));
            json(response, 200, result);
          } catch (error) {
            if (!response.destroyed) json(response, error instanceof ActionError ? error.status : 400,
              { error: error instanceof ActionError ? error.message : preferences?'插件设置未能保存，请重试':'请求内容不正确', snapshot: service.snapshot() });
          }
          return;
        }
        if(preferences){json(response,200,service.preferences());return;}
        if(pathname===`${API}/save/export`) {
          try {
            const body=await service.exportSave();
            if(disposed||response.destroyed)return;
            response.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Disposition':'attachment; filename="dsh-fisher-save.json"','X-Content-Type-Options':'nosniff'});response.end(body);
          } catch {json(response,503,{error:'暂时无法导出，请稍后重试；原文件没有修改'});}
          return;
        }
        if (pathname === `${API}/bootstrap` || pathname === `${API}/state`) {
          json(response, 200, service.snapshot());
          return;
        }
        const asset = assets.get(pathname);
        if (asset) {
          try {
            asset.buffer ??= readFile(asset.file);
            const body = await asset.buffer;
            if (disposed || response.destroyed) { response.end(); return; }
            response.writeHead(200, {
              'Content-Type': asset.contentType,
              'Cache-Control': asset.cacheControl, 'X-Content-Type-Options': 'nosniff',
            });
            response.end(body);
          } catch {
            delete asset.buffer;
            if (!response.destroyed) json(response, 503, { error: 'ASSET_UNAVAILABLE' });
          }
          return;
        }
        if (streams.size >= 16) { json(response, 429, { error: 'TOO_MANY_CONNECTIONS' }); return; }
        response.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no',
        });
        response.flushHeaders();
        if (!response.write(revisionEvent())) {
          response.end();
          return;
        }
        streams.set(response, request);
        response.once('close', () => {
          streams.delete(response);
          if (streams.size === 0) stopHeartbeat();
        });
        if (heartbeat === undefined) {
          heartbeat = setInterval(() => {
            for (const [stream, originalRequest] of streams) {
              if (ctx.connection.requestRejection(originalRequest) !== undefined || stream.destroyed
                || !stream.write(': heartbeat\n\n')) {
                stream.end();
                streams.delete(stream);
              }
            }
            if (streams.size === 0) stopHeartbeat();
          }, 15_000);
          heartbeat.unref();
        }
      },
    });
    return () => { close(); unregister(); };
  }, 'dsh-fisher: authenticated routes');
}

async function readJson(request: IncomingMessage, limit: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    let bytes = 0;
    const cleanup = () => {
      clearTimeout(timer); request.removeListener('data', data); request.removeListener('end', end);
      request.removeListener('error', fail); request.removeListener('aborted', aborted);
    };
    const fail = (error: Error) => { cleanup(); request.resume(); reject(error); };
    const aborted = () => fail(new ActionError('请求已中断', 400));
    const data = (part: Buffer) => {
      bytes += part.length;
      if (bytes > limit) fail(new ActionError('请求过大', 413));
      else parts.push(part);
    };
    const end = () => {
      cleanup();
      try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8'))); }
      catch { reject(new ActionError('JSON 格式不正确', 400)); }
    };
    const timer = setTimeout(() => fail(new ActionError('请求超时', 408)), 10000);
    request.on('data', data); request.once('end', end); request.once('error', fail); request.once('aborted', aborted);
  });
}
