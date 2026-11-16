import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Lists the override files Daniel has dropped into public/assets, so the game
 * only requests files that actually exist (no 404s, and they get cached offline).
 * Exposed to the game as the virtual module `virtual:asset-overrides`.
 */
function assetOverrides(): Plugin {
  const id = 'virtual:asset-overrides';
  const resolved = '\0' + id;
  const root = path.resolve(__dirname, 'public/assets');
  const list = (sub: string, ext: RegExp) => {
    const dir = path.join(root, sub);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => ext.test(f)).map((f) => f.replace(ext, ''));
  };
  return {
    name: 'asset-overrides',
    resolveId(source) {
      return source === id ? resolved : undefined;
    },
    load(loadId) {
      if (loadId !== resolved) return;
      const data = {
        sprites: list('sprites', /\.png$/i),
        sfx: list('audio/sfx', /\.mp3$/i),
        music: list('audio/music', /\.mp3$/i),
      };
      return `export default ${JSON.stringify(data)};`;
    },
    configureServer(server) {
      // Reload the game when an override file is added or removed during development.
      server.watcher.add(root);
      const refresh = (file: string) => {
        if (!file.startsWith(root)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

export default defineConfig({
  // Relative base so the same build works on GitHub Pages (/repo-name/) or any host root.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).version),
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    assetOverrides(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'assets/**/*'],
      manifest: {
        name: 'Ewe and Me',
        short_name: 'Ewe and Me',
        description: 'A cozy fiber farm and yarn shop.',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#2B1E1E',
        theme_color: '#2B1E1E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,mp3,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
});
