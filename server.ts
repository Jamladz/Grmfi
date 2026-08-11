import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Admin API Routes (Placeholder for Admin functionality)
  app.get("/api/admin/users", (req, res) => {
    // Ideally use Firebase Admin SDK to fetch users
    res.json({ error: "Admin SDK not initialized" });
  });

  app.get('/tonconnect-manifest.json', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const origin = `${protocol}://${host}`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      url: origin,
      name: 'GRMF Fi',
      iconUrl: 'https://raw.githubusercontent.com/ton-community/ton-connect/main/assets/icon.png',
      termsOfUseUrl: origin,
      privacyPolicyUrl: origin
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
