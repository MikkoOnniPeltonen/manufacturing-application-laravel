import createClient from 'openapi-fetch';

import { csrfToken } from './csrf';
import type { paths } from './generated';

const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8000';

export const apiClient = createClient<paths>({
  baseUrl: `${backendOrigin}/api`,
  credentials: 'include',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.use({
  onRequest({ request }) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const token = csrfToken();
      if (token) request.headers.set('X-XSRF-TOKEN', token);
    }
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401) window.dispatchEvent(new Event('auth:expired'));
  },
});
