import { ArrowLeft, ArrowUpDown, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useQuery } from '@tanstack/react-query';
import { Suspense, lazy, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { collectionItems } from '../api/collections';

import LoadingSpinner from '../components/LoadingSpinner';

const OrderTable = lazy(() => import('../components/OrderTable'));
const OrderChart = lazy(() => import('../components/OrderChart'));

function CustomerPage() {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

  const { customerId } = useParams();
  const location = useLocation();
  const idAsNumber = Number(customerId);

  // Parallel Queries
  const { data: allCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/customers');
      if (error || !data) throw error ?? new Error('Unable to load customers.');
      return collectionItems(data);
    },
  });

  const { data: productionLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['production-lines'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/production-lines');
      if (error || !data) throw error ?? new Error('Unable to load production lines.');
      return collectionItems(data);
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/products');
      if (error || !data) throw error ?? new Error('Unable to load products.');
      return collectionItems(data);
    },
  });

  const loading = customersLoading || linesLoading || productsLoading;

  // Derived Maps for easier access (similar to previous "dataMap")
  const dataMap = useMemo(() => {
    if (loading) return new Map();

    // Convert products to Map for O(1) lookup
    const productsMap = new Map(products.map(p => [p.id, p]));

    const map = new Map();
    map.set('allCustomers', allCustomers);
    map.set(
      'currentCustomer',
      allCustomers.find(c => c.id === idAsNumber),
    );
    map.set('productionLines', productionLines);
    map.set('products', productsMap);

    return map;
  }, [loading, allCustomers, productionLines, products, idAsNumber]);

  const processCustomerData = useMemo(() => {
    if (!dataMap.has('currentCustomer'))
      return { displaySelection: [], tableData: [], chartData: [] };

    const customer = dataMap.get('currentCustomer');
    const products = dataMap.get('products');
    const productionLines = dataMap.get('productionLines');
    const allCustomers = dataMap.get('allCustomers');

    // SELECTED PRODUCTS ACCORDIONS
    const displaySelection = productionLines.map(line => {
      const productsForLine =
        customer.selected_products
          ?.filter(product => product.production_line_id === line.id)
          .map(product => ({
            id: product.id,
            name: product.name,
            description: products.get(product.id)?.description || 'No description',
          })) || [];

      return {
        id: line.id,
        productionLine: line.name,
        productionLogo: line.product_logo_url,
        productsByProductionLine:
          productsForLine.length > 0
            ? productsForLine
            : [{ id: line.id, text: 'No products selected for this line.' }],
      };
    });

    // TABLE CONTENT
    const tableData = (customer.sales || []).map(sale => ({
      saleId: sale.id,
      productName: products.get(sale.product_id)?.name || 'Unknown',
      status: sale.status,
      dateToDeliver: new Date(sale.date_to_deliver).toLocaleDateString(),
      quantity: sale.quantity,
    }));

    // CHART CONTENT
    const customersWithOrders = allCustomers.filter(oneCustomer => oneCustomer.id !== idAsNumber);

    const productionLineMap = productionLines.reduce((acc, line) => {
      acc[line.id] = line.name;
      return acc;
    }, {});

    // Calculate current customer stats
    const currentCustomerStats = (customer.sales || []).reduce((acc, sale) => {
      const lineName = productionLineMap[sale.production_line_id];
      if (!lineName) return acc;

      if (!acc[lineName]) {
        acc[lineName] = { pending: 0, in_production: 0, delivered: 0 };
      }

      if (sale.status === 'pending') acc[lineName].pending += sale.quantity;
      else if (sale.status === 'in_production') acc[lineName].in_production += sale.quantity;
      else if (sale.status === 'delivered') acc[lineName].delivered += sale.quantity;

      return acc;
    }, {});

    // Calculate averages from other customers
    const otherCustomersStats = customersWithOrders.reduce((acc, oneCustomer) => {
      const customerSales = oneCustomer.sales || [];

      customerSales.forEach(sale => {
        const lineName = productionLineMap[sale.production_line_id];
        if (!lineName) return;

        if (!acc[lineName]) {
          acc[lineName] = {
            pendingTotal: 0,
            deliveredTotal: 0,
            pendingCount: new Set(),
            deliveredCount: new Set(),
          };
        }

        if (sale.status === 'pending' || sale.status === 'in_production') {
          // Group in_production with pending for "Active" comparison or just add to total?
          // For simplicity and matching the previous 'pending' bar, let's group them or just count them.
          // Let's add them to pendingTotal to ensure the "Total" volume is accurate.
          acc[lineName].pendingTotal += sale.quantity;
          acc[lineName].pendingCount.add(oneCustomer.id);
        } else if (sale.status === 'delivered') {
          acc[lineName].deliveredTotal += sale.quantity;
          acc[lineName].deliveredCount.add(oneCustomer.id);
        }
      });
      return acc;
    }, {});

    // Combine into chart data
    const chartData = productionLines.map(line => {
      const lineName = line.name;
      const myStats = currentCustomerStats[lineName] || {
        pending: 0,
        in_production: 0,
        delivered: 0,
      };
      const otherStats = otherCustomersStats[lineName] || {
        pendingTotal: 0,
        deliveredTotal: 0,
        pendingCount: new Set(),
        deliveredCount: new Set(),
      };

      // Calculate Grand Total for this line (My sales + All other sales)
      // Note: otherStats.pendingTotal includes pending + in_production from others?
      // Checking logic above: "if (sale.status === 'pending')" -> pendingTotal.
      // It seems 'in_production' was missed in 'otherCustomersStats' logic previously or grouped?
      // Let's verify otherCustomersStats logic quick:
      // Lines 172-177 only check 'pending' and 'delivered'. 'in_production' might be missing from "Avg" calc.
      // For proper "Total Production Share", we should sum EVERYTHING.

      const myTotal = myStats.pending + myStats.in_production + myStats.delivered;
      // Re-calculating other total properly would require iterating all sales again,
      // but we can trust the 'otherStats' accumulation if i fix it, or just use what we have.
      // Let's assume Grand Total = My Total + Other's Observed Total.

      const otherTotal = otherStats.pendingTotal + otherStats.deliveredTotal; // This might exclude in_production for others if not added.
      // Let's treat the denominator as (My Total + Other Total Stored).
      const grandTotalLine = myTotal + otherTotal;

      const toPercent = val =>
        grandTotalLine === 0 ? 0 : Number.parseFloat(((val / grandTotalLine) * 100).toFixed(1));

      const avgPendingQty =
        otherStats.pendingCount.size > 0
          ? otherStats.pendingTotal / otherStats.pendingCount.size
          : 0;
      const avgDeliveredQty =
        otherStats.deliveredCount.size > 0
          ? otherStats.deliveredTotal / otherStats.deliveredCount.size
          : 0;

      return {
        productionLine: lineName,
        // Values as Percentages of Total Line Traffic
        pending: toPercent(myStats.pending),
        in_production: toPercent(myStats.in_production),
        delivered: toPercent(myStats.delivered),

        // Averages also converted to % share of the line
        avg_pending: toPercent(avgPendingQty),
        avg_delivered: toPercent(avgDeliveredQty),

        // Keep raw values for tooltip if needed? No, user wants share.
      };
    });

    return { displaySelection, tableData, chartData };
  }, [dataMap]);

  const columns = useMemo(
    () => [
      { accessorKey: 'saleId', header: 'Id' },
      { accessorKey: 'productName', header: 'Product' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue();
          const colors = {
            delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            in_production: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          };
          return (
            <div className="text-center">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[status] || 'bg-slate-800 text-slate-400'}`}
              >
                {status?.replace('_', ' ') || 'Unknown'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'dateToDeliver',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white p-0 hover:bg-transparent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: info => <div className="text-center">{info.getValue()}</div>,
      },
      { accessorKey: 'quantity', header: 'Quantity' },
    ],
    [],
  );

  const table = useReactTable({
    data: processCustomerData.tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  });

  if (loading) {
    return <div className="p-6 bg-slate-900 min-h-screen text-white">Loading...</div>;
  }

  const currentCustomer = dataMap.get('currentCustomer');

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Navigation */}
      <div className="max-w-7xl mx-auto mb-6">
        <Link
          to="/customers"
          className="flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Customers
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/5">
          <article className="mb-6 h-full flex flex-col">
            <Card className="shadow-lg rounded-lg overflow-hidden border border-slate-700 bg-slate-800 mb-6 flex-grow">
              <CardHeader className="p-4 border-b border-slate-700">
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-xl font-bold text-white tracking-tight mb-1">
                      {currentCustomer.name}
                    </CardTitle>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm text-slate-300">
                        <span className="text-slate-500 font-medium w-20">Contact:</span>
                        <span>{currentCustomer.contact}</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-300">
                        <span className="text-slate-500 font-medium w-20">Address:</span>
                        <span>{currentCustomer.address}</span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/customers/${customerId}/edit`} state={{ from: location.pathname }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center relative overflow-hidden">
                <div className="w-full h-64 relative overflow-hidden bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                  <img
                    src={currentCustomer.customer_logo_url}
                    alt={currentCustomer.name}
                    className="max-w-full max-h-full object-contain p-4"
                    onError={e => {
                      e.target.src = 'https://via.placeholder.com/200?text=Logo';
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <section className="flex-grow">
              <Card className="shadow-lg rounded-lg overflow-hidden border border-slate-700 bg-slate-800 h-full">
                <CardHeader className="p-4 border-b border-slate-700">
                  <CardTitle className="text-lg font-semibold text-white">
                    Selected Products
                  </CardTitle>
                </CardHeader>
                <CardContent
                  className="p-4 overflow-y-auto"
                  style={{ maxHeight: 'calc(100% - 60 px)' }}
                >
                  <Accordion type="single" collapsible className="w-full space-y-2">
                    {processCustomerData.displaySelection.map(oneItem => (
                      <AccordionItem
                        key={oneItem.id}
                        value={`item-${oneItem.id}`}
                        className="border border-slate-700 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-700 transition-all duration-200">
                          <div className="flex items-center gap-3">
                            {oneItem.productionLogo && (
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-600 bg-white flex-shrink-0">
                                <img
                                  src={oneItem.productionLogo}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <span className="text-base">{oneItem.productionLine}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-slate-900/50 px-4 py-3 text-slate-300 border-t border-slate-700">
                          {oneItem.productsByProductionLine.map(oneObject =>
                            oneObject.text ? (
                              <p key={oneObject.id} className="py-1 text-slate-500 italic">
                                {oneObject.text}
                              </p>
                            ) : (
                              <div key={oneObject.id} className="py-2 first:pt-0 last:pb-0">
                                <p className="font-medium text-white">{oneObject.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5 pl-2 border-l-2 border-slate-700">
                                  {oneObject.description}
                                </p>
                              </div>
                            ),
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          </article>
        </div>
        <div className="lg:w-3/5">
          <article className="bg-slate-800 rounded-lg shadow-md h-full border border-slate-700">
            <Card className="bg-slate-800 rounded-lg shadow-md h-full border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Customer Data</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)]">
                <Tabs defaultValue="table" className="h-full flex flex-col">
                  <TabsList className="flex border-b border-slate-700 bg-slate-900">
                    <TabsTrigger
                      value="table"
                      className="px-4 py-2 text-sm font-medium text-slate-300 rounded-t-md hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out"
                    >
                      Orders
                    </TabsTrigger>
                    <TabsTrigger
                      value="chart"
                      className="px-4 py-2 text-sm font-medium text-slate-300 rounded-t-md hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out"
                    >
                      Charts
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="table"
                    className="bg-slate-900 p-6 rounded-b-lg shadow-inner flex-grow overflow-auto"
                  >
                    <div className="flex items-center py-4">
                      <Input
                        placeholder="Filter by name"
                        value={table.getColumn('productName')?.getFilterValue() || ''}
                        onChange={event =>
                          table.getColumn('productName').setFilterValue(event.target.value)
                        }
                        className="max-w-sm border border-slate-700 bg-slate-800 text-white rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                      />
                    </div>
                    <Suspense fallback={<LoadingSpinner />}>
                      <OrderTable table={table} />
                    </Suspense>
                  </TabsContent>
                  <TabsContent
                    value="chart"
                    className="bg-slate-900 p-6 rounded-b-lg shadow-inner flex-grow overflow-auto"
                  >
                    <Suspense fallback={<LoadingSpinner />}>
                      <OrderChart
                        chartData={processCustomerData.chartData}
                        productionLines={dataMap.get('productionLines')}
                      />
                    </Suspense>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </article>
        </div>
      </div>
    </div>
  );
}

export default CustomerPage;
