import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

// Link previews (Facebook, LinkedIn, X…) need absolute image URLs, and search
// engines want a canonical address. The site's public address comes from
// SITE_URL, or from Replit's deployment domain; without either, the relative
// image path is kept (fine for WhatsApp, Discord…) and no canonical is added.
function absoluteShareImage(): Plugin {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  const siteUrl = (process.env.SITE_URL ?? (domain ? `https://${domain}` : ''))
    .replace(/\/+$/, '');
  return {
    name: 'absolute-share-image',
    transformIndexHtml(html) {
      if (!siteUrl) return html;
      const prefix = siteUrl + basePath.replace(/\/+$/, '');
      return html
        .replace(
          /(<meta (?:property|name)="(?:og:image|twitter:image)" content=")\//g,
          `$1${prefix}/`,
        )
        .replace(
          '</head>',
          `    <link rel="canonical" href="${prefix}/" />\n    <meta property="og:url" content="${prefix}/" />\n  </head>`,
        );
    },
  };
}

// Libraries every screen needs: React, the socket client and the Radix
// primitives. (runtimeErrorOverlay below only applies to the dev server.)
const VENDOR_PACKAGES =
  /[\\/]node_modules[\\/](?:react|react-dom|scheduler|socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser|@socket\.io[\\/][^\\/]+|@radix-ui[\\/][^\\/]+)[\\/]/;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    absoluteShareImage(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Libraries change far less often than the app: keeping them in their
        // own file means a deploy doesn't make returning players download
        // them again.
        manualChunks(id) {
          return VENDOR_PACKAGES.test(id) ? 'vendor' : undefined;
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
