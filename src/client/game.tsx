import type * as ReactTypes from 'react';
import type { GameProps } from '../protocol.ts';
import { createGameView } from './game-view.tsx';
import { configureDialogs } from './dialog.tsx';
import type { PortalRenderer } from './dialog.tsx';

// Share the React instance supplied by the DSH client module loader.
export function createGame(React: typeof ReactTypes, createPortal:PortalRenderer): ReactTypes.ComponentType<GameProps> {
  configureDialogs(createPortal);
  return createGameView(React);
}
