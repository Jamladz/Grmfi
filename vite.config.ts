import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'ton-connect-manifest-plugin',
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url && req.url.startsWith('/tonconnect-manifest.json')) {
              const protocol = req.headers['x-forwarded-proto'] || 'https';
              const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
              const origin = `${protocol}://${host}`;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({
                url: origin,
                name: 'GRMF Fi',
                iconUrl: 'https://raw.githubusercontent.com/ton-community/ton-connect/main/assets/icon.png',
                termsOfUseUrl: origin,
                privacyPolicyUrl: origin
              }));
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
