import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(rootDirectory, "dist");
const port = Number(process.env.STATIC_PORT ?? process.env.PORT ?? 5173);
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:5000";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const isHashedAsset = /[/\\]assets[/\\].+-[a-zA-Z0-9_-]+\.[a-z0-9]+$/i.test(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache"
    });
    res.end(content);
  });
}

function proxyApi(req, res) {
  const target = new URL(req.url ?? "/", backendOrigin);
  const proxyRequest = http.request(
    target,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host
      }
    },
    (proxyResponse) => {
      const headers = { ...proxyResponse.headers };
      delete headers["content-length"];
      res.writeHead(proxyResponse.statusCode ?? 502, headers);
      proxyResponse.pipe(res);
    }
  );

  proxyRequest.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Unable to reach backend." }));
  });

  req.pipe(proxyRequest);
}

const server = http.createServer((req, res) => {
  if (!fs.existsSync(path.join(distDirectory, "index.html"))) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Frontend build not found. Run npm run build outside restricted sandboxes, then npm run serve:static.");
    return;
  }

  const requestPath = new URL(req.url ?? "/", `http://localhost:${port}`).pathname;

  if (requestPath.startsWith("/api/") || requestPath === "/health") {
    proxyApi(req, res);
    return;
  }

  const normalizedPath = path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\])+/, "");
  const candidatePath = path.resolve(distDirectory, normalizedPath);
  const isInsideDist = candidatePath === distDirectory || candidatePath.startsWith(`${distDirectory}${path.sep}`);
  const resolvedPath = isInsideDist && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    ? candidatePath
    : path.join(distDirectory, "index.html");

  sendFile(res, resolvedPath);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static frontend running on http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  console.error(`Static server failed: ${error.message}`);
  process.exitCode = 1;
});
