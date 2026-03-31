const https = require('https');

function forwardToRender(pathParts, method, authHeader) {
  return new Promise((resolve, reject) => {
    if (!authHeader) {
      reject({ status: 401, body: { error: 'Missing Authorization header' } });
      return;
    }

    const path = `/v1/services/${pathParts.join('/')}`;
    const options = {
      hostname: 'api.render.com',
      path,
      method,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: proxyRes.statusCode || 200, body: json });
        } catch (err) {
          reject({ status: 502, body: { error: 'Invalid JSON response from Render API' } });
        }
      });
    });

    proxyReq.on('error', (err) => {
      reject({ status: 502, body: { error: err.message } });
    });

    proxyReq.end();
  });
}

module.exports = async (req, res) => {
  // Support Vercel/X-Proxy routing as array or direct path
  let pathParts = req.query.path || [];
  if (!Array.isArray(pathParts)) {
    if (typeof pathParts === 'string' && pathParts.length) {
      pathParts = [pathParts];
    } else {
      pathParts = [];
    }
  }

  if (pathParts.length === 0) {
    // Fallback: extract from request URL path if query not populated
    const reqPath = (req.url || '').split('?')[0];
    const prefix = '/api/proxy/';
    if (reqPath.startsWith(prefix)) {
      const subPath = reqPath.slice(prefix.length).replace(/\/+$/, '');
      if (subPath) {
        pathParts = subPath.split('/');
      }
    }
  }

  if (pathParts.length === 0) {
    res.status(404).json({ error: 'Not found. Use /proxy/<serviceId> or /proxy/<serviceId>/<action>' });
    return;
  }

  // Keep debug in response for easier diagnosis in browser devtools
  res.setHeader('x-proxy-forward-path', pathParts.join('/'));

  const method = req.method;
  const authHeader = req.headers.authorization;

  if (!['GET', 'POST', 'OPTIONS'].includes(method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.status(204).end();
    return;
  }

  try {
    const result = await forwardToRender(pathParts, method, authHeader);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(error.status || 502).json(error.body || { error: 'proxy error' });
  }
};
