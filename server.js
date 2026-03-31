const http = require("http");
const https = require("https");

const PORT = 3001;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse: /proxy/<action>  with Authorization header forwarded
  const match = req.url.match(/^\/proxy\/(.+)$/);
  if (!match) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found. Use /proxy/<serviceId>/<action>" }));
    return;
  }

  const path = match[1]; // e.g. "srv-xxx/suspend" or "srv-xxx/resume" or "srv-xxx"
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Missing Authorization header" }));
    return;
  }

  const options = {
    hostname: "api.render.com",
    path: `/v1/services/${path}`,
    method: req.method,
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`Render proxy running at http://localhost:${PORT}`);
  console.log(`Usage: GET/POST http://localhost:${PORT}/proxy/<serviceId>/<action>`);
});
