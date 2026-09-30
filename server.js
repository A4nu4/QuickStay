import fs from "node:fs";
import path from "node:path";
import express from "express";

const isProduction = process.env.NODE_ENV === "production";

async function createServer() {
  console.log("1. Starting server initialization...");
  const app = express();
  let vite;

  if (!isProduction) {
    console.log("2. DEV MODE: Instantiating Vite dev server...");
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    console.log("3. DEV MODE: Vite middleware attached.");
  } else {
    console.log("2. PROD MODE: Configuring static asset serving...");
    app.use(
      express.static(path.resolve(import.meta.dirname, "dist/client"), {
        index: false,
      }),
    );
    console.log("3. PROD MODE: Static assets ready.");
  }

  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    console.log(`[Request] Incoming request for: ${url}`);

    try {
      let template, render;

      if (!isProduction) {
        template = fs.readFileSync(
          path.resolve(import.meta.dirname, "index.html"),
          "utf-8",
        );
        template = await vite.transformIndexHtml(url, template);
        const module = await vite.ssrLoadModule("/src/entry-server.jsx");
        render = module.render;
      } else {
        template = fs.readFileSync(
          path.resolve(import.meta.dirname, "dist/client/index.html"),
          "utf-8",
        );
        const module = await import("./dist/server/entry-server.js");
        render = module.render;
      }

      console.log(`[Request] Rendering HTML for: ${url}`);
      const appHtml = await render(url);

      const html = template.replace(`<!--ssr-outlet-->`, () => appHtml);

      console.log(`[Request] Successfully sending response for: ${url}`);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      console.error(`[Error] Failed to process ${url}:`, e);
      if (!isProduction) vite.ssrFixStacktrace(e);
      res.status(500).end(e.stack);
    }
  });

  console.log("4. Attempting to bind to port 5173...");
  app.listen(5173, () => {
    console.log(
      `Server running at http://localhost:5173 (${isProduction ? "Production" : "Development"})`,
    );
  });
}

createServer();
