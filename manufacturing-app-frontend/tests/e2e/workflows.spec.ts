import { expect, test, type Page } from '@playwright/test';

const apiOrigin = `http://localhost:${process.env.E2E_API_PORT || '8000'}`;
const frontendOrigin = `http://localhost:${process.env.E2E_FRONTEND_PORT || '5173'}`;

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
  const me = await page.request.get(`${apiOrigin}/api/v1/me`, { headers: { Accept: 'application/json', Origin: frontendOrigin } });
  expect(me.status()).toBe(401);
});

test('manager cannot access admin pages or reset demo data', async ({ page }) => {
  await login(page, 'manager');
  await expect(page.getByRole('link', { name: 'Manage Customers Database' })).toHaveCount(0);
  await page.goto('/customers');
  await expect(page).toHaveURL(`${frontendOrigin}/`);
  const status = await page.evaluate(async (apiOrigin) => {
    const cookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
    const response = await fetch(`${apiOrigin}/api/v1/reset-demo`, {
      method: 'POST', credentials: 'include',
      headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(cookie?.slice(11) ?? '') },
    });
    return response.status;
  }, apiOrigin);
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
  await expect(page.getByRole('combobox', { name: 'Product', exact: true }).locator('optgroup[label="Assigned to customer"] option')).toHaveCount(1);
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
  const denied = await page.request.get(`${apiOrigin}/api/v1/orders`, { headers: { Accept: 'application/json', Origin: frontendOrigin } });
  expect(denied.status()).toBe(403);
});

test('customer lifecycle preserves product selection and confirms deletion', async ({ page }) => {
  await login(page, 'admin');
  await page.getByRole('navigation', { name: 'Workspace', exact: true }).getByRole('link', { name: 'Customers', exact: true }).click();
  await page.getByRole('link', { name: 'Add New Customer' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Workflow Test Customer');
  await page.getByLabel('Contact', { exact: true }).fill('Test contact');
  await page.getByLabel('Address', { exact: true }).fill('Synthetic address');
  await page.getByLabel('Products', { exact: true }).click();
  await page.getByRole('option').first().click();
  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/customers') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create Customer', exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(page).toHaveURL(/\/customers$/);
  await page.getByPlaceholder('Search customers...').fill('Workflow Test Customer');
  const row = page.getByRole('row').filter({ hasText: 'Workflow Test Customer' });
  await row.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Contact', { exact: true })).toHaveValue('Test contact');
  await expect(page.locator('.react-select__multi-value')).toHaveCount(1);
  await page.getByLabel('Contact', { exact: true }).fill('Updated test contact');
  const updated = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().includes('/api/v1/customers/'));
  await page.getByRole('button', { name: 'Update Customer' }).click();
  expect((await updated).status()).toBe(200);
  await expect(page).toHaveURL(/\/customers$/);
  await page.getByPlaceholder('Search customers...').fill('Workflow Test Customer');
  await row.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Contact', { exact: true })).toHaveValue('Updated test contact');
  await page.getByRole('button', { name: 'Delete Customer', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Delete Customer', exact: true }).click();
  const deleted = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('/api/v1/customers/'));
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await deleted).ok()).toBe(true);
  await expect(page).toHaveURL(/\/customers$/);
  await page.getByPlaceholder('Search customers...').fill('Workflow Test Customer');
  await expect(row).toHaveCount(0);
});

test('all workspace pages remain readable without horizontal page overflow', async ({ page }) => {
  await login(page, 'admin');
  const paths = ['/', '/orders', '/customers', '/customers/create', '/customers/1', '/customers/1/edit', '/manager-view', '/admin/history', '/admin/audit', '/admin/operations'];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await test.step(`${width}px: ${path}`, async () => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Workspace', exact: true })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (path === '/admin/history') {
          await page.getByRole('button', { name: 'Search', exact: true }).click();
          await expect(page.getByPlaceholder('Product Name')).toBeVisible();
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
      });
    }
  }
  await page.goto('/admin/operations');
  await expect(page.getByRole('heading', { name: 'database: Healthy', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'cache: Healthy', exact: true })).toBeVisible();
});

test('sign-in shows invalid credentials and password visibility works', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('invalid@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('IncorrectPassword123!');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  const denied = page.waitForResponse(r => r.url().endsWith('/api/v1/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await denied).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeEnabled();
});

test('unassigned products can be assigned inline, ordered, and used to generate sales', async ({ page }) => {
  await login(page, 'admin');
  const headers = { Accept: 'application/json', Origin: frontendOrigin };
  const catalog = await (await page.request.get(`${apiOrigin}/api/v1/products`, { headers })).json() as { data: { id: number; production_line_id: number }[] };
  const lines = await (await page.request.get(`${apiOrigin}/api/v1/production-lines`, { headers })).json() as { data: { id: number; name: string }[] };
  const line = lines.data[1];
  const product = catalog.data.find(product => product.production_line_id === line.id);
  expect(product).toBeDefined();
  await page.getByRole('combobox', { name: 'Production line', exact: true }).click();
  await page.getByRole('option', { name: line.name, exact: true }).click();
  const blocked = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/v1/sales/generate'));
  await page.getByRole('button', { name: 'Generate Random Sales', exact: true }).click();
  expect((await blocked).status()).toBe(422);
  await expect(page.getByRole('alert')).toContainText('No customers are assigned products');
  await page.getByRole('link', { name: 'Set up customer products' }).click();
  await page.getByRole('combobox', { name: 'Customer', exact: true }).selectOption({ index: 2 });
  await page.getByRole('combobox', { name: 'Product', exact: true }).selectOption(String(product?.id));
  await expect(page.getByRole('button', { name: 'Create order', exact: true })).toBeDisabled();
  const assigned = page.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/api/v1/customers/') && r.url().includes('/products/'));
  await page.getByRole('button', { name: 'Assign to customer', exact: true }).click();
  expect((await assigned).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Create order', exact: true })).toBeEnabled();
  const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/v1/orders'));
  await page.getByRole('button', { name: 'Create order', exact: true }).click();
  expect((await created).status()).toBe(201);
  await page.getByRole('navigation', { name: 'Workspace', exact: true }).getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Manufacturing Dashboard', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Production line', exact: true }).click();
  await page.getByRole('option', { name: line.name, exact: true }).click();
  const generated = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/v1/sales/generate'));
  await page.getByRole('button', { name: 'Generate Random Sales', exact: true }).click();
  const response = await generated;
  expect(response.status()).toBe(201);
  const sales = await response.json() as { production_line_id: number; product_id: number }[];
  expect(sales.length).toBeGreaterThanOrEqual(3);
  expect(sales.length).toBeLessThanOrEqual(7);
  expect(sales.every(sale => sale.production_line_id === line.id && sale.product_id === product?.id)).toBe(true);
});
