const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8000';

export async function initializeCsrf() {
  const response = await fetch(`${backendOrigin}/sanctum/csrf-cookie`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Unable to initialize CSRF protection (${response.status}).`);
  }
}

export function csrfToken() {
  const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : null;
}
