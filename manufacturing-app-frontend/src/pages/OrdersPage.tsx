import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import { apiErrorMessage } from '../api/errors';
import type { components } from '../api/generated';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Sale = components['schemas']['SaleResource'];
type Status = components['schemas']['SaleStatus'];
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function OrdersPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [editing, setEditing] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState<Sale | null>(null);
  const [message, setMessage] = useState('');
  const actionForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!editing && !cancelling) return;
    actionForm.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
    actionForm.current?.querySelector('input')?.focus({ preventScroll: true });
  }, [editing, cancelling]);
  const customers = useQuery({
    queryKey: ['order-customers'],
    queryFn: () =>
      fetchCollection(page =>
        apiClient.GET('/v1/customers', { params: { query: { page, per_page: 100 } } }),
      ),
  });
  const customer = useQuery({
    queryKey: ['customer', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/customers/{customer}', {
        params: { path: { customer: Number(customerId) } },
      });
      if (error || !data) throw new Error('Unable to load customer products.');
      return data;
    },
  });
  const products = useQuery({
    queryKey: ['order-products'],
    queryFn: () =>
      fetchCollection(page =>
        apiClient.GET('/v1/products', { params: { query: { page, per_page: 100 } } }),
      ),
  });
  const assignedProducts = customer.data?.selected_products ?? [];
  const unassignedProducts = (products.data ?? []).filter(
    product => !assignedProducts.some(assigned => assigned.id === product.id),
  );
  const productIsAssigned = assignedProducts.some(product => String(product.id) === productId);
  const assignment = useMutation({
    mutationFn: async (selection: { customerId: string; productId: string }) => {
      const { data, error } = await apiClient.POST('/v1/customers/{customer}/products/{product}', {
        params: {
          path: { customer: Number(selection.customerId), product: Number(selection.productId) },
        },
      });
      if (error || !data) throw new Error(apiErrorMessage(error, 'Unable to assign this product.'));
      return data;
    },
    onSuccess: (data, selection) => {
      client.setQueryData(['customer', selection.customerId], data);
      client.invalidateQueries({ queryKey: ['customers'] });
      client.invalidateQueries({ queryKey: ['order-customers'] });
      setMessage('Product assigned. You can now create the order.');
    },
    onError: error => setMessage(error.message),
  });
  const orders = useQuery({
    queryKey: ['orders', page, status],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/orders', {
        params: { query: { page, per_page: 25, status: status || undefined } },
      });
      if (error || !data) throw new Error('Unable to load orders.');
      return data;
    },
    refetchInterval: 5000,
  });
  const saved = () => {
    setMessage('Order saved.');
    setEditing(null);
    setCancelling(null);
    for (const key of [
      'orders',
      'sales',
      'customer-sales',
      'customers',
      'customer',
      'production-lines',
      'audit',
    ])
      client.invalidateQueries({ queryKey: [key] });
  };
  const mutation = useMutation({
    mutationFn: async ({
      form,
      mode,
      sale,
    }: { form: FormData; mode: 'create' | 'edit' | 'cancel'; sale?: Sale }) => {
      const reason = String(form.get('reason'));
      if (mode === 'cancel' && sale) {
        const { error } = await apiClient.POST('/v1/orders/{sale}/cancel', {
          params: { path: { sale: sale.id } },
          body: { reason },
        });
        if (error) throw error;
        return;
      }
      const body = {
        quantity: Number(form.get('quantity')),
        date_to_deliver: String(form.get('date')),
        reason,
      };
      if (mode === 'edit' && sale) {
        const { error } = await apiClient.PATCH('/v1/orders/{sale}', {
          params: { path: { sale: sale.id } },
          body,
        });
        if (error) throw error;
      } else {
        const { error } = await apiClient.POST('/v1/orders', {
          body: {
            ...body,
            customer_id: Number(customerId),
            product_id: Number(form.get('product')),
          },
        });
        if (error) throw error;
      }
    },
    onSuccess: saved,
    onError: error =>
      setMessage(
        apiErrorMessage(
          error,
          'Unable to save. Check the fields; only pending orders can be edited or cancelled.',
        ),
      ),
  });
  const submit = (
    event: FormEvent<HTMLFormElement>,
    mode: 'create' | 'edit' | 'cancel',
    sale?: Sale,
  ) => {
    event.preventDefault();
    setMessage('');
    mutation.mutate({ form: new FormData(event.currentTarget), mode, sale });
  };
  return (
    <main className="workspace-page space-y-6">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link to="/">Dashboard</Link>
        <Link to="/admin/audit">Audit trail</Link>
        <Link to="/admin/operations">Operations</Link>
      </div>
      <header className="space-y-2">
        <h1 className="workspace-title">Orders</h1>
        <p className="workspace-subtitle">
          Create customer orders, review delivery dates, and manage pending changes.
        </p>
      </header>
      {message && (
        <output
          className="block rounded-lg border border-border bg-card px-4 py-3 text-sm"
          aria-live="polite"
        >
          {message}
        </output>
      )}
      {(orders.error || customers.error || customer.error || products.error) && (
        <p role="alert">Unable to load order data. Reload to retry.</p>
      )}
      <section className="workspace-panel space-y-5">
        <h2 className="text-lg font-semibold">Create order</h2>
        <form
          onSubmit={e => submit(e, 'create')}
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 items-end"
        >
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Customer
            <select
              className={inputClass}
              value={customerId}
              onChange={e => {
                setCustomerId(e.target.value);
                setProductId('');
                setMessage('');
                assignment.reset();
              }}
              disabled={assignment.isPending || mutation.isPending}
              required
            >
              <option value="">Select customer</option>
              {customers.data?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Product
            <select
              name="product"
              className={inputClass}
              value={productId}
              onChange={e => {
                setProductId(e.target.value);
                setMessage('');
                assignment.reset();
              }}
              required
              disabled={
                !customer.data || products.isPending || assignment.isPending || mutation.isPending
              }
            >
              <option value="">{!customerId ? 'Choose a customer first' : 'Select product'}</option>
              {assignedProducts.length > 0 && (
                <optgroup label="Assigned to customer">
                  {assignedProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {unassignedProducts.length > 0 && (
                <optgroup label="Available to assign">
                  {unassignedProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Quantity
            <Input name="quantity" type="number" min={1} max={1000000} defaultValue={10} required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Delivery date
            <Input name="date" type="date" defaultValue={tomorrow()} required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium">
            Reason
            <Input
              name="reason"
              minLength={3}
              maxLength={500}
              defaultValue="New customer order"
              required
            />
          </label>
          <Button disabled={mutation.isPending || assignment.isPending || !productIsAssigned}>
            Create order
          </Button>
        </form>
        {customer.data && productId && !productIsAssigned && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-accent/20 p-4">
            <p className="max-w-xl text-sm leading-6">
              This product is not assigned to {customer.data.name} yet. Assign it here to enable
              ordering and sales generation for its production line.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={assignment.isPending}
              onClick={() => assignment.mutate({ customerId, productId })}
            >
              {assignment.isPending ? 'Assigning…' : 'Assign to customer'}
            </Button>
          </div>
        )}
        {customer.data && !productId && !assignedProducts.length && (
          <p className="text-sm leading-6 text-muted-foreground">
            This customer has no assigned products. Choose a product from the catalog, then assign
            it here before creating an order.
          </p>
        )}
        {customer.data && products.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No products are available in the catalog.</p>
        )}
      </section>
      <label className="flex gap-3 items-center">
        Order status
        <select
          className={inputClass}
          value={status}
          onChange={e => {
            setStatus(e.target.value as Status | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {['pending', 'in_production', 'delivered', 'cancelled'].map(s => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      {orders.isLoading && <p>Loading orders…</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] text-left text-sm [&_td]:px-4 [&_td]:py-4">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {[
                'Order',
                'Customer / product',
                'Quantity',
                'Delivery date',
                'Status',
                'Actions',
              ].map(h => (
                <th className="px-4 py-4 font-medium" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!orders.isLoading && !orders.error && orders.data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground">
                  No orders match this filter.
                </td>
              </tr>
            )}
            {orders.data?.data.map(order => (
              <tr key={order.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                <td className="p-3">
                  {order.customer?.name} / {order.product?.name}
                </td>
                <td>{order.quantity}</td>
                <td>{order.date_to_deliver.slice(0, 10)}</td>
                <td>{order.status.replaceAll('_', ' ')}</td>
                <td className="flex flex-wrap items-center gap-2 py-3">
                  {order.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => {
                          setEditing(order);
                          setCancelling(null);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setCancelling(order);
                          setEditing(null);
                        }}
                      >
                        Cancel order
                      </Button>
                    </>
                  )}
                  <Link className="underline p-2" to={`/admin/audit?subject_id=${order.id}`}>
                    Audit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <form
          ref={actionForm}
          key={editing.id}
          className="workspace-panel grid items-end gap-5 border-primary/30 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={e => submit(e, 'edit', editing)}
        >
          <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">
            Edit pending order {editing.id.slice(0, 8)}
          </h2>
          <label className="grid gap-2 text-sm font-medium">
            Quantity
            <Input
              name="quantity"
              type="number"
              min={1}
              max={1000000}
              defaultValue={editing.quantity}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Delivery date
            <Input
              name="date"
              type="date"
              defaultValue={editing.date_to_deliver.slice(0, 10)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Reason
            <Input name="reason" minLength={3} maxLength={500} required />
          </label>
          <Button disabled={mutation.isPending}>Save order</Button>
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>
            Close edit
          </Button>
        </form>
      )}
      {cancelling && (
        <form
          ref={actionForm}
          className="workspace-panel flex flex-wrap items-end gap-4 border-destructive/40"
          onSubmit={e => submit(e, 'cancel', cancelling)}
        >
          <label className="grid gap-2 text-sm font-medium">
            Cancellation reason
            <Input name="reason" minLength={3} maxLength={500} required />
          </label>
          <Button variant="destructive" disabled={mutation.isPending}>
            Confirm cancellation
          </Button>
          <Button type="button" variant="outline" onClick={() => setCancelling(null)}>
            Keep order
          </Button>
        </form>
      )}
      <div className="flex flex-wrap gap-3 items-center">
        <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          Previous orders
        </Button>
        <span>
          Page {page} of {orders.data?.last_page ?? 1}
        </span>
        <Button
          disabled={page >= (orders.data?.last_page ?? 1)}
          onClick={() => setPage(p => p + 1)}
        >
          Next orders
        </Button>
      </div>
    </main>
  );
}
