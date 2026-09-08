import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { WebServer } from '@deepseek-ai/dsh-host-webserver';
import { API, VERSION } from './protocol.ts';
import type { Bootstrap } from './protocol.ts';

export const name = 'dsh-fisher';
export const inject = ['webServer', 'connection'];

type HostContext = Context & { webServer: WebServer; connection: HostConnectionHandle };

export function apply(ctx: HostContext): void {
  if (typeof ctx.connection.requestRejection !== 'function') {
    throw new Error('dsh-fisher requires the authenticated DSH Web connection service.');
  }

  ctx.effect(() => {
    const snapshot: Bootstrap = {
      protocolVersion: 1, version: VERSION, generation: randomUUID(), revision: 0, gameplayAvailable: false,
    };
    const streams = new Map<ServerResponse, IncomingMessage>();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let disposed = false;
    let gameScript: Promise<Buffer> | undefined;

    const stopHeartbeat = () => {
      if (heartbeat !== undefined) clearInterval(heartbeat);
      heartbeat = undefined;
    };
    const close = () => {
      disposed = true;
      stopHeartbeat();
      for (const response of streams.keys()) response.end();
      streams.clear();
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
        const known = [`${API}/bootstrap`, `${API}/state`, `${API}/events`, `${API}/client/game.js`];
        if (!known.includes(pathname)) { json(response, 404, { error: 'NOT_FOUND' }); return; }
        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET');
          json(response, 405, { error: 'METHOD_NOT_ALLOWED' });
          return;
        }
        if (pathname === `${API}/bootstrap` || pathname === `${API}/state`) {
          json(response, 200, snapshot);
          return;
        }
        if (pathname === `${API}/client/game.js`) {
          try {
            gameScript ??= readFile(new URL('./game.js', import.meta.url));
            const body = await gameScript;
            if (disposed || response.destroyed) { response.end(); return; }
            response.writeHead(200, {
              'Content-Type': 'text/javascript; charset=utf-8',
              'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            });
            response.end(body);
          } catch {
            gameScript = undefined;
            if (!response.destroyed) json(response, 503, { error: 'CLIENT_UNAVAILABLE' });
          }
          return;
        }
        if (streams.size >= 16) { json(response, 429, { error: 'TOO_MANY_CONNECTIONS' }); return; }
        response.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no',
        });
        response.flushHeaders();
        if (!response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`)) {
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
