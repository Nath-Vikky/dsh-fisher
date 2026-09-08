export const VERSION = '0.1.0-dev.1';
export const API = '/api/dsh-fisher/v1';

export interface Bootstrap {
  protocolVersion: 1;
  version: string;
  generation: string;
  revision: number;
  gameplayAvailable: boolean;
}

export interface GameProps {
  lowPerformance: boolean;
}

export function isBootstrap(value: unknown): value is Bootstrap {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return data.protocolVersion === 1 && typeof data.version === 'string'
    && typeof data.generation === 'string' && data.generation.length > 0
    && typeof data.revision === 'number' && Number.isSafeInteger(data.revision) && data.revision >= 0
    && typeof data.gameplayAvailable === 'boolean';
}
