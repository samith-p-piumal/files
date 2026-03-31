# Render Instance Manager

A tiny Node.js proxy + HTML frontend to start/stop your Render.com service manually or on a schedule.

## Why a proxy?
Render's API does not set CORS headers, so browsers can't call it directly.
`server.js` runs locally (or on any server) and forwards requests to Render.

## Quick start (local)

```bash
node server.js        # starts proxy on http://localhost:3001
open index.html       # open frontend in browser
```

No npm install needed — uses only Node.js built-ins.

## Quick start (Vercel)

```bash
# from project root
npm install -g vercel        # if not installed
vercel login                 # one-time
vercel deploy --prod         # deploy to Vercel
# then open https://<your-project>.vercel.app
```

Set `Proxy base URL` in `index.html` UI to:

- `https://<your-project>.vercel.app`

### Vercel files included

- `vercel.json` routes `/proxy/*` to `/api/proxy/*`
- `api/proxy/[...path].js` forwards to Render API with CORS support

## Usage
1. Open `index.html` in your browser
2. Enter your Render API key and Service ID
3. Click **Save & verify** — it checks the current status
4. Use **start instance** / **stop instance** buttons
5. Enable **Auto schedule** and set your resume/suspend times

## Deploying to Vercel (no local proxy needed)

This deploys the serverless API directly:

- `GET  /api/render?serviceId=<id>`
- `POST /api/render?serviceId=<id>&action=resume`
- `POST /api/render?serviceId=<id>&action=suspend`

The frontend calls this endpoint, and it forwards to Render API.

## Endpoints
- `GET  /api/render?serviceId=<id>`
- `POST /api/render?serviceId=<id>&action=resume`
- `POST /api/render?serviceId=<id>&action=suspend`

