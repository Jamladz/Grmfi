export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Dynamic TonConnect Manifest with CORS support for all TON wallets
    if (url.pathname === '/tonconnect-manifest.json') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }

      const manifest = {
        url: url.origin,
        name: 'GRMF Fi',
        iconUrl: 'https://raw.githubusercontent.com/ton-community/ton-connect/main/assets/icon.png',
        termsOfUseUrl: url.origin,
        privacyPolicyUrl: url.origin,
      };

      return new Response(JSON.stringify(manifest, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Serve static SPA assets from ./dist
    return env.ASSETS.fetch(request);
  },
};
