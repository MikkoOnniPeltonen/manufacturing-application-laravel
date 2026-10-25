import { apiClient } from './client';
import { initializeCsrf } from './csrf';
import type { components } from './generated';

type User = components['schemas']['UserResource'];

export async function currentUser(): Promise<User | null> {
  const { data, error, response } = await apiClient.GET('/v1/me');
  if (response.status === 401) return null;
  if (error || !data) throw new Error('Unable to verify your session.');
  return data;
}

export async function loginUser(email: string, password: string): Promise<User> {
  await initializeCsrf();
  const { data, error } = await apiClient.POST('/v1/login', { body: { email, password } });
  if (error || !data) throw new Error(error?.message ?? 'Login failed.');
  return data.user;
}

export async function logoutUser(): Promise<void> {
  const { error } = await apiClient.POST('/v1/logout');
  if (error) throw new Error('Unable to log out. Please try again.');
}
