import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, role: 'admin' | 'manager') {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${role}@manufacturing.com`);
  await page.getByLabel('Password', { exact: true }).fill('SecurePass2026!');
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Manufacturing Dashboard' })).toBeVisible();
}

test('admin can manage production and logout destroys the server session', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/manager-view');
  await expect(page.getByRole('heading', { name: 'Production Lines', exact: true })).toBeVisible();
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/logout'));
  await page.getByRole('button', { name: 'Log Out' }).click();
  expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  const me = await page.request.get('http://localhost:8000/api/v1/me', { headers: { Accept: 'application/json', Origin: 'http://localhost:5173' } });
  expect(me.status()).toBe(401);
});

test('manager cannot access admin pages or reset demo data', async ({ page }) => {
  await login(page, 'manager');
  await expect(page.getByRole('link', { name: 'Manage Customers Database' })).toHaveCount(0);
  await page.goto('/customers');
  await expect(page).toHaveURL('http://localhost:5173/');
  const status = await page.evaluate(async () => {
    const cookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
    const response = await fetch('http://localhost:8000/api/v1/reset-demo', {
      method: 'POST', credentials: 'include',
      headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(cookie?.slice(11) ?? '') },
    });
    return response.status;
  });
  expect(status).toBe(403);
});

test('history search accepts browser query parameters', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/history');
  await expect(page.getByText('HISTORY MODE', { exact: true })).toBeVisible();
  const pending = page.waitForResponse(r => r.url().includes('/history?') && r.url().includes('search_mode='));
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const response = await pending;
  expect(response.status()).toBe(200);
});

test('customer detail and editing preserve local logo URLs', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/customers');
  await page.getByRole('link', { name: 'View', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Selected Products' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Brand Logo URL')).toHaveValue(/\/images\//);
  const pending = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().includes('/api/v1/customers/'));
  await page.getByRole('button', { name: 'Update Customer', exact: true }).click();
  expect((await pending).status()).toBe(200);
});

test('admin creates, edits and cancels an order with a readable audit trail', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/orders');
  await page.getByRole('combobox', { name: 'Customer', exact: true }).selectOption({ index: 1 });
  await expect(page.getByRole('combobox', { name: 'Product', exact: true }).locator('option')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Product', exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Quantity', { exact: true }).fill('35');
  await page.getByLabel('Reason', { exact: true }).fill('Browser purchase order');
  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create order', exact: true }).click();
  expect((await created).status()).toBe(201);
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '35', exact: true }) });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const editForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Save order', exact: true }) });
  await editForm.getByLabel('Quantity').fill('40');
  await editForm.getByLabel('Reason').fill('Customer revised quantity');
  const updated = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/api/v1/orders/'));
  await editForm.getByRole('button', { name: 'Save order' }).click();
  expect((await updated).status()).toBe(200);
  const updatedRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '40', exact: true }) });
  await updatedRow.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await page.getByLabel('Cancellation reason').fill('Customer withdrew request');
  const cancelled = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/cancel'));
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  expect((await cancelled).status()).toBe(200);
  await expect(updatedRow.getByRole('cell', { name: 'cancelled', exact: true })).toBeVisible();
  await updatedRow.getByRole('link', { name: 'Audit', exact: true }).click();
  await expect(page.getByText('Customer revised quantity', { exact: true })).toBeVisible();
  await expect(page.getByText('Customer withdrew request', { exact: true })).toBeVisible();
});

test('manager stages orders, queues production and sees completion after leaving the page', async ({ page }) => {
  await login(page, 'manager');
  await page.goto('/manager-view');
  await page.getByRole('button', { name: 'Select up to 100 for Production' }).click();
  const staged = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/api/v1/productions/'));
  await page.getByRole('button', { name: 'Confirm to Production' }).click();
  expect((await staged).status()).toBe(200);
  const queued = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/v1/production-runs'));
  await page.getByRole('button', { name: 'START PRODUCTION', exact: true }).click();
  expect((await queued).status()).toBe(202);
  await page.goto('/');
  await page.goto('/manager-view');
  await expect(page.getByRole('status').filter({ hasText: 'Production run: completed' })).toBeVisible({ timeout: 15000 });
  const denied = await page.request.get('http://localhost:8000/api/v1/orders', { headers: { Accept: 'application/json', Origin: 'http://localhost:5173' } });
  expect(denied.status()).toBe(403);
});
