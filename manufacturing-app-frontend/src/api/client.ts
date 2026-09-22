import createClient from 'openapi-fetch';

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
