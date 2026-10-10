export async function proxyToApi(request, env, routePath) {
  if (!env.API_PROXY_TARGET) {
    return Response.json({ success: false, message: 'API_PROXY_TARGET belum dikonfigurasi.' }, { status: 503 });
  }

  const targetBase = String(env.API_PROXY_TARGET).replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(routePath, `${targetBase}/`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));

  return fetch(new Request(targetUrl, { method: request.method, headers, body: request.body, redirect: 'manual' }));
}
