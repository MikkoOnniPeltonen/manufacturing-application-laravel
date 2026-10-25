import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import type { components } from '../api/generated';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type Sale = components['schemas']['SaleResource'];
type Status = components['schemas']['SaleStatus'];
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const inputClass = 'rounded border border-slate-600 bg-slate-800 p-2 text-white';

export default function OrdersPage() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [editing, setEditing] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState<Sale | null>(null);
  const [message, setMessage] = useState('');
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
    onError: () =>
      setMessage(
        'Unable to save. Check the fields; only pending orders can be edited or cancelled.',
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
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100 space-y-6">
      <div className="flex gap-5">
        <Link to="/">Dashboard</Link>
        <Link to="/admin/audit">Audit trail</Link>
        <Link to="/admin/operations">Operations</Link>
      </div>
      <h1 className="text-3xl font-bold">Orders</h1>
      {message && <output>{message}</output>}
      {(orders.error || customers.error || customer.error) && (
        <p role="alert">Unable to load order data. Reload to retry.</p>
      )}
      <section className="rounded border border-slate-700 p-4">
        <h2 className="text-xl mb-3">Create order</h2>
        <form onSubmit={e => submit(e, 'create')} className="flex flex-wrap gap-4 items-end">
          <label className="grid gap-1">
            Customer
            <select
              className={inputClass}
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
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
          <label className="grid gap-1">
            Product
            <select
              key={customerId}
              name="product"
              className={inputClass}
              defaultValue=""
              required
              disabled={!customer.data}
            >
              <option value="">Select assigned product</option>
              {customer.data?.selected_products?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Quantity
            <Input name="quantity" type="number" min={1} max={1000000} defaultValue={10} required />
          </label>
          <label className="grid gap-1">
            Delivery date
            <Input name="date" type="date" defaultValue={tomorrow()} required />
          </label>
          <label className="grid gap-1">
            Reason
            <Input
              name="reason"
              minLength={3}
              maxLength={500}
              defaultValue="New customer order"
              required
            />
          </label>
          <Button disabled={mutation.isPending || !customer.data?.selected_products?.length}>
            Create order
          </Button>
        </form>
        {customer.data && !customer.data.selected_products?.length && (
          <p className="mt-3">
            Assign products on the{' '}
            <Link className="underline" to={`/customers/${customerId}/edit`}>
              customer page
            </Link>{' '}
            before creating an order.
          </p>
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
      <div className="overflow-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              {[
                'Order',
                'Customer / product',
                'Quantity',
                'Delivery date',
                'Status',
                'Actions',
              ].map(h => (
                <th className="p-3" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.data?.data.map(order => (
              <tr key={order.id} className="border-t border-slate-700">
                <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                <td className="p-3">
                  {order.customer?.name} / {order.product?.name}
                </td>
                <td>{order.quantity}</td>
                <td>{order.date_to_deliver.slice(0, 10)}</td>
                <td>{order.status.replaceAll('_', ' ')}</td>
                <td className="flex gap-2 py-3">
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
          key={editing.id}
          className="flex flex-wrap gap-4 border border-blue-500 p-4"
          onSubmit={e => submit(e, 'edit', editing)}
        >
          <h2>Edit pending order {editing.id.slice(0, 8)}</h2>
          <label>
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
          <label>
            Delivery date
            <Input
              name="date"
              type="date"
              defaultValue={editing.date_to_deliver.slice(0, 10)}
              required
            />
          </label>
          <label>
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
          className="flex gap-4 border border-red-500 p-4"
          onSubmit={e => submit(e, 'cancel', cancelling)}
        >
          <label>
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
      <div className="flex gap-4 items-center">
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
