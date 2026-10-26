import { useQuery } from '@tanstack/react-query';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Suspense, lazy, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import OrderTable from '../components/OrderTable';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import type { ChartPoint, Customer, ProductionLine, SaleRow, SaleStatus } from '../types';
const OrderChart = lazy(() => import('../components/OrderChart'));

function chartFor(customer: Customer, peers: Customer[], lines: ProductionLine[]): ChartPoint[] {
  return lines.map(line => {
    const own = (status: SaleStatus) =>
      (customer.sales_summary ?? [])
        .filter(s => s.production_line_id === line.id && s.status === status)
        .reduce((sum, s) => sum + s.quantity, 0);
    const other = peers
      .filter(c => c.id !== customer.id)
      .map(c => {
        const summaries = (c.sales_summary ?? []).filter(s => s.production_line_id === line.id);
        return {
          active: summaries
            .filter(s => ['pending', 'in_production'].includes(s.status))
            .reduce((sum, s) => sum + s.quantity, 0),
          delivered: summaries
            .filter(s => s.status === 'delivered')
            .reduce((sum, s) => sum + s.quantity, 0),
        };
      });
    const pending = own('pending');
    const production = own('in_production');
    const delivered = own('delivered');
    const total =
      pending + production + delivered + other.reduce((sum, p) => sum + p.active + p.delivered, 0);
    const share = (quantity: number) => (total ? Number(((100 * quantity) / total).toFixed(1)) : 0);
    const average = (key: 'active' | 'delivered') => {
      const active = other.filter(p => p[key] > 0);
      return active.length ? active.reduce((sum, p) => sum + p[key], 0) / active.length : 0;
    };
    return {
      productionLine: line.name,
      pending: share(pending),
      in_production: share(production),
      delivered: share(delivered),
      avg_pending: share(average('active')),
      avg_delivered: share(average('delivered')),
    };
  });
}

export default function CustomerPage() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const customer = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/customers/{customer}', {
        params: { path: { customer: id } },
      });
      if (error || !data) throw new Error('Customer unavailable.');
      return data;
    },
  });
  const peers = useQuery({
    queryKey: ['customer-summaries'],
    queryFn: () =>
      fetchCollection(page =>
        apiClient.GET('/v1/customers', { params: { query: { page, per_page: 100 } } }),
      ),
  });
  const lines = useQuery({
    queryKey: ['production-lines'],
    queryFn: () =>
      fetchCollection(page =>
        apiClient.GET('/v1/production-lines', { params: { query: { page, per_page: 100 } } }),
      ),
  });
  const sales = useQuery({
    queryKey: ['customer-sales', customerId, page],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/sales', {
        params: { query: { customer_id: id, page, per_page: 25 } },
      });
      if (error || !data) throw new Error('Orders unavailable.');
      return data;
    },
  });
  const rows: SaleRow[] = useMemo(
    () =>
      sales.data?.data.map(sale => ({
        saleId: sale.id,
        productName: sale.product?.name ?? 'Unknown',
        status: sale.status,
        dateToDeliver: sale.date_to_deliver.slice(0, 10),
        quantity: sale.quantity,
      })) ?? [],
    [sales.data],
  );
  const columns = useMemo<ColumnDef<SaleRow>[]>(
    () => [
      { accessorKey: 'saleId', header: 'Order' },
      { accessorKey: 'productName', header: 'Product' },
      { accessorKey: 'status', header: 'Status' },
      { accessorKey: 'dateToDeliver', header: 'Delivery date' },
      { accessorKey: 'quantity', header: 'Quantity' },
    ],
    [],
  );
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    state: { sorting, columnFilters: filters },
  });
  const chart = useMemo(
    () => (customer.data ? chartFor(customer.data, peers.data ?? [], lines.data ?? []) : []),
    [customer.data, peers.data, lines.data],
  );
  if (customer.error)
    return (
      <p role="alert" className="p-6 text-destructive">
        Customer not found or unavailable.
      </p>
    );
  if (!customer.data) return <p className="p-6">Loading customer…</p>;
  const current = customer.data;
  return (
    <main className="workspace-page space-y-6">
      <Link to="/customers" className="underline">
        Back to All Customers
      </Link>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <h1 className="workspace-title">{current.name}</h1>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>Contact: {current.contact}</p>
            <p>Address: {current.address}</p>
            {current.customer_logo_url && (
              <img
                src={current.customer_logo_url}
                alt={current.name}
                className="h-48 object-contain"
              />
            )}
            <Link to={`/customers/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <h2 className="text-lg font-semibold">Selected Products</h2>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {lines.data?.map(line => (
                <AccordionItem key={line.id} value={String(line.id)}>
                  <AccordionTrigger>{line.name}</AccordionTrigger>
                  <AccordionContent>
                    {(current.selected_products ?? [])
                      .filter(p => p.production_line_id === line.id)
                      .map(p => (
                        <p key={p.id}>
                          {p.name} — {p.description || 'No description'}
                        </p>
                      ))}
                    {!(current.selected_products ?? []).some(
                      p => p.production_line_id === line.id,
                    ) && <p>No products selected for this line.</p>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Customer orders</h2>
        {sales.error && <p role="alert">Unable to load orders.</p>}
        <Input
          placeholder="Filter by name"
          value={String(table.getColumn('productName')?.getFilterValue() ?? '')}
          onChange={e => table.getColumn('productName')?.setFilterValue(e.target.value)}
        />
        <OrderTable table={table} />
        <div className="flex flex-wrap gap-3 items-center">
          <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous orders
          </Button>
          <span>
            Page {page} of {sales.data?.last_page ?? 1}
          </span>
          <Button
            disabled={page >= (sales.data?.last_page ?? 1)}
            onClick={() => setPage(p => p + 1)}
          >
            Next orders
          </Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Production share</h2>
        {(peers.error || lines.error) && <p role="alert">Unable to load comparison data.</p>}
        <Suspense fallback={<p>Loading chart…</p>}>
          <OrderChart chartData={chart} productionLines={lines.data ?? []} />
        </Suspense>
      </section>
    </main>
  );
}
