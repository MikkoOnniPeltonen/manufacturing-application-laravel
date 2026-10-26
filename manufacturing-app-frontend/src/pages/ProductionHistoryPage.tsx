import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, RotateCcw } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { collectionItems, fetchCollection } from '../api/collections';
import type { paths } from '../api/generated';
import type { SaleStatus } from '../types';

function ProductionHistoryPage() {
  const [page, setPage] = useState(1);
  const [lineSelection, setSelectedLineId] = useState<number | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState('range'); // 'range' | 'search'

  // History State
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  // Search Params State
  const [searchParams, setSearchParams] = useState({
    product_name: '',
    customer_name: '',
    status: '',
    min_quantity: '',
    max_quantity: '',
  });
  // New state to hold parameters that actually trigger the query
  const [activeSearchParams, setActiveSearchParams] = useState(searchParams);

  // Data

  const [parentRef] = useAutoAnimate();

  // 1. Fetch Production Lines
  const { data: productionLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['production-lines'],
    queryFn: async () => {
      return fetchCollection(page =>
        apiClient.GET('/v1/production-lines', { params: { query: { page, per_page: 100 } } }),
      );
    },
  });

  const selectedLineId = lineSelection ?? productionLines[0]?.id ?? null;

  // 2. Fetch History Data (Dependent on Line + Filters)
  const {
    data: queryHistoryData,
    isFetching,
    error: historyError,
  } = useQuery({
    queryKey: ['history', selectedLineId, viewMode, dateRange, activeSearchParams, page], // DEPEND ON activeSearchParams
    queryFn: async () => {
      const params: NonNullable<
        paths['/v1/production-lines/{productionLine}/history']['get']['parameters']['query']
      > =
        viewMode === 'range'
          ? { start_date: dateRange.start, end_date: dateRange.end }
          : {
              search_mode: true,
              product_name: activeSearchParams.product_name || undefined,
              customer_name: activeSearchParams.customer_name || undefined,
              status: (activeSearchParams.status || undefined) as SaleStatus | undefined,
              min_quantity:
                activeSearchParams.min_quantity === ''
                  ? undefined
                  : Number(activeSearchParams.min_quantity),
              max_quantity:
                activeSearchParams.max_quantity === ''
                  ? undefined
                  : Number(activeSearchParams.max_quantity),
            };

      const { data, error } = await apiClient.GET('/v1/production-lines/{productionLine}/history', {
        params: {
          path: { productionLine: selectedLineId },
          query: { ...params, page, per_page: 50 },
        },
      });
      if (error || !data) throw error ?? new Error('Unable to load production history.');
      return { ...data, sales: collectionItems(data.sales), pagination: data.sales };
    },
    enabled: !!selectedLineId, // Only fetch if line is selected
    placeholderData: previousData => previousData, // Keep previous data while fetching new
  });

  // Sync query data to local state if needed OR just use it directly
  // Using `queryHistoryData` directly is better
  const currentHistoryData = queryHistoryData || { sales: [], pagination: undefined };

  // Derived loading state
  const loading = linesLoading;
  const fetchingHistory = isFetching;

  const handleSearchClick = () => {
    // Trigger query by updating active params
    if (selectedLineId) {
      // Ensure min_quantity is 0 if max is set but min is empty, to satisfy backend validation
      const safeParams = { ...searchParams };
      if (safeParams.max_quantity && !safeParams.min_quantity) {
        safeParams.min_quantity = '0';
      }
      setPage(1);
      setActiveSearchParams(safeParams);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleReset = () => {
    const emptyParams = {
      product_name: '',
      customer_name: '',
      status: '',
      min_quantity: '',
      max_quantity: '',
    };
    setSearchParams(emptyParams);
    setActiveSearchParams(emptyParams);
  };

  const selectedLine = productionLines.find(l => l.id === selectedLineId);

  const handleSetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setPage(1);
    setDateRange({ start: today, end: today });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/25"></div>
      </div>
    );
  }

  return (
    <div className="workspace-page !max-w-[1600px]">
      {historyError && (
        <p role="alert" className="mb-4 text-destructive">
          Unable to load history. Check the filters and try again.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-6 text-foreground">
        <Button disabled={page <= 1 || isFetching} onClick={() => setPage(p => p - 1)}>
          Previous history
        </Button>
        <span>
          Page {page} of {currentHistoryData.pagination?.last_page ?? 1}
        </span>
        <Button
          disabled={page >= (currentHistoryData.pagination?.last_page ?? 1) || isFetching}
          onClick={() => setPage(p => p + 1)}
        >
          Next history
        </Button>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar - Production Lines */}
        <aside className="w-full space-y-4 lg:w-56 lg:shrink-0">
          <div className="mb-6">
            <Link
              to="/"
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="bg-warning/10 border border-warning/50 rounded-lg p-3">
              <h2 className="text-warning font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                HISTORY MODE
              </h2>
              <p className="text-xs text-warning/70 mt-1">Viewing historical state. Read-only.</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-4">Production Lines</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {productionLines.map(line => (
              <button
                type="button"
                aria-pressed={selectedLineId === line.id}
                key={line.id}
                onClick={() => {
                  setSelectedLineId(line.id);
                  setPage(1);
                }}
                className={`
                w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border relative group
                ${
                  selectedLineId === line.id
                    ? 'border-primary bg-card shadow-sm ring-1 ring-ring'
                    : 'border-border bg-background/50 hover:bg-card hover:border-border'
                }
              `}
              >
                <img
                  src={line.product_logo_url ?? undefined}
                  alt={line.name}
                  className="w-full h-20 lg:h-24 object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                  onError={e => {
                    e.currentTarget.src = 'https://via.placeholder.com/200x100?text=No+Image';
                  }}
                />
                <div className="p-3 bg-card/80 backdrop-blur-sm">
                  <h3 className="text-foreground font-bold text-base">{line.name}</h3>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0 flex-1 flex flex-col gap-5">
          {/* Controls Header */}
          <div className="bg-background/80 p-4 rounded-xl border border-border shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-3">
                  {selectedLine?.name || 'Select a Line'}
                  <span className="text-lg font-normal text-muted-foreground">History Viewer</span>
                </h1>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-card rounded-lg p-1 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('range');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'range'
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Date Range
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('search');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'search'
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
              {viewMode === 'range' ? (
                <div className="grid min-w-0 flex-1 grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <label className="grid min-w-0 gap-2 text-sm text-muted-foreground">
                    From:
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full min-w-0 bg-card border border-border text-foreground rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm text-muted-foreground">
                    To:
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full min-w-0 bg-card border border-border text-foreground rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </label>
                  <Button
                    onClick={handleSetToday}
                    variant="outline"
                    size="sm"
                    className="border-primary/25 text-primary hover:bg-accent/30"
                  >
                    Today
                  </Button>
                </div>
              ) : (
                /* Advanced Search Filters */
                <div
                  className="flex flex-wrap items-end gap-4 flex-1 pb-2"
                  onKeyDown={handleKeyDown}
                >
                  <label className="space-y-1 block">
                    <span className="text-xs text-muted-foreground">Product</span>
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={searchParams.product_name}
                      onChange={e =>
                        setSearchParams(prev => ({ ...prev, product_name: e.target.value }))
                      }
                      className="w-32 bg-card border border-border text-foreground rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs text-muted-foreground">Customer</span>
                    <input
                      type="text"
                      placeholder="Customer"
                      value={searchParams.customer_name}
                      onChange={e =>
                        setSearchParams(prev => ({ ...prev, customer_name: e.target.value }))
                      }
                      className="w-32 bg-card border border-border text-foreground rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <select
                      value={searchParams.status}
                      onChange={e => setSearchParams(prev => ({ ...prev, status: e.target.value }))}
                      className="w-32 bg-card border border-border text-foreground rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option value="">Any Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_production">In Production</option>
                      <option value="delivered">Completed</option>
                    </select>
                  </label>
                  <div className="space-y-1 flex items-end gap-1">
                    <label>
                      <span className="text-xs text-muted-foreground block">Qty Min</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={searchParams.min_quantity}
                        onChange={e =>
                          setSearchParams(prev => ({ ...prev, min_quantity: e.target.value }))
                        }
                        className="w-16 bg-card border border-border text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        min={0}
                      />
                    </label>
                    <span className="mb-2 text-muted-foreground">-</span>
                    <label>
                      <span className="text-xs text-muted-foreground block">Max</span>
                      <input
                        type="number"
                        placeholder="∞"
                        value={searchParams.max_quantity}
                        onChange={e =>
                          setSearchParams(prev => ({ ...prev, max_quantity: e.target.value }))
                        }
                        className="w-16 bg-card border border-border text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        min={0}
                      />
                    </label>
                  </div>

                  <Button
                    onClick={handleSearchClick}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground ml-2"
                  >
                    Search
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="icon"
                    className="ml-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {fetchingHistory && (
                <div className="flex items-center gap-2 text-warning text-sm ml-auto">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Updating...
                </div>
              )}
            </div>
          </div>

          {/* Content Views */}
          <div ref={parentRef} className="min-w-0 flex-1 relative">
            {fetchingHistory && (
              <div className="absolute inset-0 bg-muted/60 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-warning flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin"></div>
                  Loading history...
                </div>
              </div>
            )}

            {/* Unified 3-Column View for Both Modes */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {/* Total Sales Input / Search Results Column */}
              <Card className="flex flex-col bg-background/30 border-border shadow-sm overflow-hidden h-full opacity-90">
                <CardHeader className="bg-background/80 border-b border-border py-4 px-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary/50"></div>
                    <CardTitle className="text-foreground tracking-wide text-lg">
                      {viewMode === 'range' ? 'All Sales (Range)' : 'Search Results'}
                    </CardTitle>
                  </div>
                  <div className="px-2 py-1 bg-card rounded text-xs font-mono text-muted-foreground border border-border">
                    {currentHistoryData.sales?.length || 0}
                  </div>
                </CardHeader>
                <CardContent className="max-h-[32rem] flex-1 p-0 overflow-y-auto custom-scrollbar">
                  <ul className="p-3 space-y-2">
                    {currentHistoryData.sales?.map(item => (
                      <li
                        key={item.id}
                        className="p-3 rounded-lg bg-card/50 border border-border/50 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-foreground">
                            {item.product?.name}
                          </span>
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap justify-between items-center gap-4 mt-2">
                          <span>{item.customer?.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              item.status === 'delivered'
                                ? 'border-success text-success'
                                : item.status === 'in_production'
                                  ? 'border-primary/25 text-primary'
                                  : 'border-border text-muted-foreground'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </li>
                    ))}
                    {(!currentHistoryData.sales || currentHistoryData.sales.length === 0) && (
                      <div className="mt-10 text-center text-muted-foreground italic">
                        No sales found
                      </div>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* In Production Column */}
              <Card className="flex flex-col bg-background/30 border-border shadow-sm overflow-hidden h-full opacity-90">
                <CardHeader className="bg-background/80 border-b border-border py-4 px-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary/50"></div>
                    <CardTitle className="text-foreground tracking-wide text-lg">
                      In Production
                    </CardTitle>
                  </div>
                  <div className="px-2 py-1 bg-card rounded text-xs font-mono text-muted-foreground border border-border">
                    {currentHistoryData.sales?.filter(s => s.status === 'in_production').length ||
                      0}
                  </div>
                </CardHeader>
                <CardContent className="max-h-[32rem] flex-1 p-0 overflow-y-auto custom-scrollbar">
                  <ul className="p-3 space-y-2">
                    {currentHistoryData.sales
                      ?.filter(s => s.status === 'in_production')
                      .map(item => (
                        <li
                          key={item.id}
                          className="p-3 rounded-lg bg-card/50 border border-border/50 shadow-sm"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
                            <span className="font-semibold text-foreground">
                              {item.product?.name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>{item.quantity} units</span>
                            <span className="text-primary/70 font-medium">Processing</span>
                          </div>
                        </li>
                      ))}
                    {(!currentHistoryData.sales ||
                      currentHistoryData.sales.filter(s => s.status === 'in_production').length ===
                        0) && (
                      <div className="mt-10 text-center text-muted-foreground italic">
                        No matching production items
                      </div>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Completed Column */}
              <Card className="flex flex-col bg-background/30 border-border shadow-sm overflow-hidden h-full opacity-90">
                <CardHeader className="bg-background/80 border-b border-border py-4 px-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success/50" />
                    <CardTitle className="text-foreground tracking-wide text-lg">
                      Completed
                    </CardTitle>
                  </div>
                  <div className="px-2 py-1 bg-card rounded text-xs font-mono text-muted-foreground border border-border">
                    {currentHistoryData.sales?.filter(s => s.status === 'delivered').length || 0}
                  </div>
                </CardHeader>
                <CardContent className="max-h-[32rem] flex-1 p-0 overflow-y-auto custom-scrollbar">
                  <ul className="p-3 space-y-2">
                    {currentHistoryData.sales
                      ?.filter(s => s.status === 'delivered')
                      .map(item => (
                        <li
                          key={item.id}
                          className="p-3 rounded-lg bg-card/50 border border-border/50 shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-4 mb-1">
                            <span className="font-semibold text-foreground">
                              {item.product?.name}
                            </span>
                            <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded">
                              Done
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>{item.quantity} units</span>
                            <span>{item.customer?.name}</span>
                          </div>
                        </li>
                      ))}
                    {(!currentHistoryData.sales ||
                      currentHistoryData.sales.filter(s => s.status === 'delivered').length ===
                        0) && (
                      <div className="mt-10 text-center text-muted-foreground italic">
                        No matching completed sales
                      </div>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductionHistoryPage;
