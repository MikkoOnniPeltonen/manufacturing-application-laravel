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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans border-t-4 border-amber-600">
      {historyError && (
        <p role="alert" className="mb-4 text-red-400">
          Unable to load history. Check the filters and try again.
        </p>
      )}
      <div className="flex items-center gap-4 mb-4 text-slate-300">
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
      <div className="flex gap-6 h-[calc(100vh-100px)]">
        {/* Sidebar - Production Lines */}
        <aside className="w-72 space-y-4 pr-2">
          <div className="mb-6">
            <Link
              to="/"
              className="flex items-center text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-3">
              <h2 className="text-amber-500 font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                HISTORY MODE
              </h2>
              <p className="text-xs text-amber-400/70 mt-1">Viewing historical state. Read-only.</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-4 pl-1">Production Lines</h2>
          {productionLines.map(line => (
            <div
              key={line.id}
              onClick={() => {
                setSelectedLineId(line.id);
                setPage(1);
              }}
              className={`
                cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border relative group
                ${
                  selectedLineId === line.id
                    ? 'border-amber-600 bg-slate-800 shadow-lg ring-1 ring-amber-600'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700'
                }
              `}
            >
              <img
                src={line.product_logo_url ?? undefined}
                alt={line.name}
                className="w-full h-24 object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                onError={e => {
                  e.currentTarget.src = 'https://via.placeholder.com/200x100?text=No+Image';
                }}
              />
              <div className="p-3 bg-slate-800/80 backdrop-blur-sm">
                <h3 className="text-white font-bold text-base">{line.name}</h3>
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Controls Header */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  {selectedLine?.name || 'Select a Line'}
                  <span className="text-lg font-normal text-slate-500">History Viewer</span>
                </h1>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('range');
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'range'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
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
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t border-slate-800 pt-4">
              {viewMode === 'range' ? (
                <div className="flex items-center gap-4 flex-1">
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    From:
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    To:
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </label>
                  <Button
                    onClick={handleSetToday}
                    variant="outline"
                    size="sm"
                    className="border-amber-600/50 text-amber-500 hover:bg-amber-900/20"
                  >
                    Today
                  </Button>
                </div>
              ) : (
                /* Advanced Search Filters */
                <div
                  className="flex items-end gap-3 flex-1 overflow-x-auto pb-2"
                  onKeyDown={handleKeyDown}
                >
                  <label className="space-y-1 block">
                    <span className="text-xs text-slate-500">Product</span>
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={searchParams.product_name}
                      onChange={e =>
                        setSearchParams(prev => ({ ...prev, product_name: e.target.value }))
                      }
                      className="w-32 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs text-slate-500">Customer</span>
                    <input
                      type="text"
                      placeholder="Customer"
                      value={searchParams.customer_name}
                      onChange={e =>
                        setSearchParams(prev => ({ ...prev, customer_name: e.target.value }))
                      }
                      className="w-32 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs text-slate-500">Status</span>
                    <select
                      value={searchParams.status}
                      onChange={e => setSearchParams(prev => ({ ...prev, status: e.target.value }))}
                      className="w-32 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Any Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_production">In Production</option>
                      <option value="delivered">Completed</option>
                    </select>
                  </label>
                  <div className="space-y-1 flex items-end gap-1">
                    <label>
                      <span className="text-xs text-slate-500 block">Qty Min</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={searchParams.min_quantity}
                        onChange={e =>
                          setSearchParams(prev => ({ ...prev, min_quantity: e.target.value }))
                        }
                        className="w-16 bg-slate-800 border border-slate-700 text-white rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        min={0}
                      />
                    </label>
                    <span className="mb-2 text-slate-500">-</span>
                    <label>
                      <span className="text-xs text-slate-500 block">Max</span>
                      <input
                        type="number"
                        placeholder="∞"
                        value={searchParams.max_quantity}
                        onChange={e =>
                          setSearchParams(prev => ({ ...prev, max_quantity: e.target.value }))
                        }
                        className="w-16 bg-slate-800 border border-slate-700 text-white rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        min={0}
                      />
                    </label>
                  </div>

                  <Button
                    onClick={handleSearchClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                  >
                    Search
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="icon"
                    className="ml-2 border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {fetchingHistory && (
                <div className="flex items-center gap-2 text-amber-500 text-sm ml-auto">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Updating...
                </div>
              )}
            </div>
          </div>

          {/* Content Views */}
          <div ref={parentRef} className="flex-1 overflow-hidden relative">
            {fetchingHistory && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-amber-500 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading history...
                </div>
              </div>
            )}

            {/* Unified 3-Column View for Both Modes */}
            <div className="grid grid-cols-3 gap-6 h-full">
              {/* Total Sales Input / Search Results Column */}
              <Card className="flex flex-col bg-slate-900/30 border-slate-800 shadow-sm overflow-hidden h-full opacity-90">
                <CardHeader className="bg-slate-900/80 border-b border-slate-800 py-4 px-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500/50"></div>
                    <CardTitle className="text-slate-300 tracking-wide text-lg">
                      {viewMode === 'range' ? 'All Sales (Range)' : 'Search Results'}
                    </CardTitle>
                  </div>
                  <div className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400 border border-slate-700">
                    {currentHistoryData.sales?.length || 0}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                  <ul className="p-3 space-y-2">
                    {currentHistoryData.sales?.map(item => (
                      <li
                        key={item.id}
                        className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-slate-300">{item.product?.name}</span>
                          <span className="text-xs font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-500">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between items-center mt-2">
                          <span>{item.customer?.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              item.status === 'delivered'
                                ? 'border-green-800 text-green-500'
                                : item.status === 'in_production'
                                  ? 'border-purple-800 text-purple-500'
                                  : 'border-slate-700 text-slate-500'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </li>
                    ))}
                    {(!currentHistoryData.sales || currentHistoryData.sales.length === 0) && (
                      <div className="mt-10 text-center text-slate-600 italic">No sales found</div>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* In Production Column */}
              <Card className="flex flex-col bg-slate-900/30 border-slate-800 shadow-sm overflow-hidden h-full opacity-90">
                <CardHeader className="bg-slate-900/80 border-b border-slate-800 py-4 px-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500/50"></div>
                    <CardTitle className="text-slate-300 tracking-wide text-lg">
                      In Production
                    </CardTitle>
                  </div>
                  <div className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400 border border-slate-700">
                    {currentHistoryData.sales?.filter(s => s.status === 'in_production').length ||
                      0}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                  <ul className="p-3 space-y-2">
                    {currentHistoryData.sales
                      ?.filter(s => s.status === 'in_production')
                      .map(item => (
                        <li
                          key={item.id}
                          className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 shadow-sm"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-slate-300">
                              {item.product?.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex justify-between">
                            <span>{item.quantity} units</span>
                            <span className="text-purple-400/70 font-medium">Processing</span>
                          </div>
                        </li>
                      ))}
                    {(!currentHistoryData.sales ||
                      currentHistoryData.sales.filter(s => s.status === 'in_production').length ===
                        0) && (
                      <div className="mt-10 text-center text-slate-600 italic">
                        No matching production items
                      </div>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Completed Column */}
              <Card className="flex flex-col bg-slate-900/30 border-slate-800 shadow-sm overflow-hidden h-full opacity-90">
                <CardHeader className="bg-slate-900/80 border-b border-slate-800 py-4 px-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500/50" />
                    <CardTitle className="text-slate-300 tracking-wide text-lg">
                      Completed
                    </CardTitle>
                  </div>
                  <div className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400 border border-slate-700">
                    {currentHistoryData.sales?.filter(s => s.status === 'delivered').length || 0}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
                  <ul className="p-3 space-y-2">
                    {currentHistoryData.sales
                      ?.filter(s => s.status === 'delivered')
                      .map(item => (
                        <li
                          key={item.id}
                          className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-300">
                              {item.product?.name}
                            </span>
                            <span className="text-xs bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">
                              Done
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex justify-between">
                            <span>{item.quantity} units</span>
                            <span>{item.customer?.name}</span>
                          </div>
                        </li>
                      ))}
                    {(!currentHistoryData.sales ||
                      currentHistoryData.sales.filter(s => s.status === 'delivered').length ===
                        0) && (
                      <div className="mt-10 text-center text-slate-600 italic">
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
