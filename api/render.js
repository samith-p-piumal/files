const https = require('https');

function forwardToRender(path, method, authHeader) {
  return new Promise((resolve, reject) => {
    if (!authHeader) {
      reject({ status: 401, body: { error: 'Missing Authorization header' } });
      return;
    }

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const serviceId = req.query.serviceId;
  const action = req.query.action; // optional resume/suspend

  if (!serviceId) {
    res.status(400).json({ error: 'Missing serviceId query parameter' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  let path = `/v1/services/${serviceId}`;
  let method = 'GET';

  if (req.method === 'POST') {
    if (!action || (action !== 'resume' && action !== 'suspend')) {
      res.status(400).json({ error: 'Invalid action. Use resume or suspend' });
      return;
    }
    path = `/v1/services/${serviceId}/${action}`;
    method = 'POST';
  } else if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const result = await forwardToRender(path, method, authHeader);
    if (result.status === 404) {
      res.status(404).json({ error: 'Render service not found, check serviceId and API key', details: result.body });
      return;
    }
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(error.status || 502).json(error.body || { error: 'proxy error' });
  }
};
