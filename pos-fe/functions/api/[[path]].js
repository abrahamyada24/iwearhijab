import { proxyToApi } from '../_shared/proxy.js';

export function onRequest({ request, env, params }) {
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  return proxyToApi(request, env, `/api/${path}`);
}
