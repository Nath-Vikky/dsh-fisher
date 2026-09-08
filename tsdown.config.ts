import type { UserConfig } from 'tsdown';

const common = { outDir: 'lib', target: 'es2023', dts: false, clean: false, sourcemap: false } as const;

const host: UserConfig = {
  ...common,
  entry: { index: 'src/host-entry.ts' },
  format: 'esm',
  platform: 'node',
  fixedExtension: false,
  deps: { neverBundle: [/^@deepseek-ai\//] },
};

const client: UserConfig = {
  ...common,
  entry: { client: 'src/client-entry.tsx' },
  format: 'cjs',
  platform: 'browser',
  minify: true,
  deps: { neverBundle: ['react', /^@deepseek-ai\//] },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({id:"@nath-vikky/dsh-fisher",factory:(require)=>{',
    intro: 'var module={exports:{}};var exports=module.exports;',
    footer: 'return module.exports;}});',
  },
};

const game: UserConfig = {
  ...common,
  entry: { game: 'src/client/game.tsx' },
  format: 'esm',
  platform: 'browser',
  fixedExtension: false,
  minify: true,
  plugins: [{
    name: 'shared-react-only',
    resolveId(source: string) {
      if (source === 'react' || source.startsWith('react/') || source.startsWith('react-dom')) {
        throw new Error('The deferred game receives React from its host entry. Do not bundle another React runtime.');
      }
      return null;
    },
  }],
};

export default [host, client, game];
