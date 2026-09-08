import type * as ReactTypes from 'react';
import type { GameProps } from '../protocol.ts';
import { createGameView } from './game-view.tsx';

// Share the React instance supplied by the DSH client module loader.
export function createGame(React: typeof ReactTypes): ReactTypes.ComponentType<GameProps> {
  return createGameView(React);
}
