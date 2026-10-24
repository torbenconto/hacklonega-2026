// Browser requests stay on the Expo origin; native clients call FastAPI directly.
const allowed = new Map([
  ['/leaderboards', 'GET'], ['/species', 'GET'], ['/predict', 'POST'], ['/auth/me', 'GET'],
  ['/auth/login', 'POST'], ['/catches', 'GET POST'],
  ['/regulations/check', 'POST'], ['/regulations/summary', 'GET'],
]);

async function forward(request: Request) {
  const path = new URL(request.url).searchParams.get('path') || '';
  const pathname = path.split('?')[0];
  const catchUpdate = /^\/catches\/\d+$/.test(pathname) && request.method === 'PATCH';
  if (!catchUpdate && !allowed.get(pathname)?.split(' ').includes(request.method)) {
    return Response.json({ detail: 'Unknown API route.' }, { status: 404 });
  }
  const headers = new Headers();
  for (const name of ['content-type', 'x-username']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const body = request.method === 'GET' ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 11 * 1024 * 1024) {
      return Response.json({ detail: 'Upload exceeds the request limit.' }, { status: 413 });
    }
    const backend = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const response = await fetch(`${backend}${path}`, {
      method: request.method, headers, body, signal: request.signal,
    });
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ detail: 'The fishing server is unavailable. Please try again.' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;

export const PATCH = forward;
