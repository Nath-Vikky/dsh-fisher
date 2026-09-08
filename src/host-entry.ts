import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { WebServer } from '@deepseek-ai/dsh-host-webserver';
import { API, COAST_ASSET } from './protocol.ts';
import { SPRITES } from './game/content.ts';
import { GEAR_ART } from './game/gear.ts';
import { ActionError, FisherService } from './host/service.ts';

export const name = 'dsh-fisher';
export const inject = ['webServer', 'connection'];

type HostContext = Context & { webServer: WebServer; connection: HostConnectionHandle };

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
    const assets = new Map<string, { file: URL; contentType: string; cacheControl: string; buffer?: Promise<Buffer> }>([
      [`${API}/client/game.js`, { file: new URL('./game.js', import.meta.url),
        contentType: 'text/javascript; charset=utf-8', cacheControl: 'no-store' }],
      [COAST_ASSET, { file: new URL('../assets/runtime/coast-pixel-ink-v1.png', import.meta.url),
        contentType: 'image/png', cacheControl: 'private, max-age=604800, immutable' }],
    ]);
    for (const filename of new Set([...Object.values(SPRITES).flatMap(variants=>Object.values(variants)),...Object.values(GEAR_ART)])) {
      assets.set(`${API}/assets/${filename}`, { file: new URL(`../assets/runtime/${filename}`, import.meta.url),
        contentType: 'image/png', cacheControl: 'private, max-age=604800, immutable' });
    }
    const revisionEvent = () => {
      const state = service.snapshot();
      return `event: revision\ndata: ${JSON.stringify({ generation: state.generation, revision: state.revision, gameplayAvailable: state.gameplayAvailable })}\n\n`;
    };
    const unsubscribe = service.subscribe(() => {
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
        const known = [`${API}/bootstrap`, `${API}/state`, `${API}/events`, `${API}/actions`, `${API}/cast-input`];
        if (!known.includes(pathname) && !assets.has(pathname)) { json(response, 404, { error: 'NOT_FOUND' }); return; }
        const mutation = pathname === `${API}/actions` || pathname === `${API}/cast-input`;
        if (request.method !== (mutation ? 'POST' : 'GET')) {
          response.setHeader('Allow', mutation ? 'POST' : 'GET');
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
            const limit = pathname.endsWith('/cast-input') ? 65536 : 32768;
            if (Number(request.headers['content-length'] ?? 0) > limit) throw new ActionError('请求过大', 413);
            const body = await readJson(request, limit);
            if (disposed) throw new ActionError('插件已停止', 503);
            const result = await service.mutate(body, pathname.endsWith('/cast-input'));
            json(response, 200, result);
          } catch (error) {
            if (!response.destroyed) json(response, error instanceof ActionError ? error.status : 400,
              { error: error instanceof ActionError ? error.message : '请求内容不正确', snapshot: service.snapshot() });
          }
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
