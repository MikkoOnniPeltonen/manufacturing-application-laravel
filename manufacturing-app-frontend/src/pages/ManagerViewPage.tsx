import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import type { Sale } from '../types';

function ManagerViewPage() {
  // const [productionLines, setProductionLines] = useState([]); // Managed by Query
  const [lineSelection, setSelectedLineId] = useState<number | null>(null);

  // Staging state remains local as it's UI only until saved
  const [stagedItemsByLine, setStagedItemsByLine] = useState<Record<number, Sale[]>>({});

  const queryClient = useQueryClient();

  const [parentRef] = useAutoAnimate();

  // 1. Fetch Production Lines
  const {
    data: productionLines = [],
    isLoading: linesLoading,
    error: linesError,
  } = useQuery({
    queryKey: ['production-lines'],
    queryFn: async () => {
      return fetchCollection(page =>
        apiClient.GET('/v1/production-lines', { params: { query: { page, per_page: 100 } } }),
      );
    },
    refetchInterval: 5000,
  });

  const selectedLineId = lineSelection ?? productionLines[0]?.id ?? null;

  const selectedItems = stagedItemsByLine[selectedLineId ?? 0] || [];

  // 2. Fetch Sales for Selected Line
  const { data: sales = [], error: salesError } = useQuery({
    queryKey: ['sales', selectedLineId],
    queryFn: async () => {
      const groups = await Promise.all(
        (['pending', 'in_production'] as const).map(status =>
          fetchCollection(page =>
            apiClient.GET('/v1/sales', {
              params: {
                query: { production_line_id: selectedLineId, status, page, per_page: 100 },
              },
            }),
          ),
        ),
      );
      return groups.flat();
    },
    enabled: !!selectedLineId,
    refetchInterval: 1000,
  });

  // Derived State
  // "salesByLine" is now "sales"
  // "inProductionItems" derived from sales
  const inProductionItems = sales.filter(s => s.status === 'in_production');

  // 3. Mutation: Save to Production (Move from Staging to Sales)
  const saveToProductionMutation = useMutation({
    mutationFn: async ({ lineId, saleIds }: { lineId: number; saleIds: string[] }) => {
      const { error } = await apiClient.PATCH('/v1/productions/{productionLine}', {
        params: { path: { productionLine: lineId } },
        body: { sale_ids: saleIds, status: 'in_production' },
      });
      if (error) throw error;
    },
    onSuccess: (_data, { lineId }) => {
      toast.success('Items moved to production');
      queryClient.invalidateQueries({ queryKey: ['sales', lineId] });
      queryClient.invalidateQueries({ queryKey: ['production-lines'] }); // For has_sales badges
      // Clear staged items
      setStagedItemsByLine(prev => ({ ...prev, [lineId]: [] }));
    },
    onError: () => toast.error('Failed to save changes'),
  });

  const { data: runs } = useQuery({
    queryKey: ['production-runs', selectedLineId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/production-runs', {
        params: { query: { production_line_id: selectedLineId, per_page: 10 } },
      });
      if (error || !data) throw new Error('Unable to load production runs.');
      return data;
    },
    enabled: !!selectedLineId,
    refetchInterval: 1000,
  });
  const activeRun = runs?.data.find(run => ['queued', 'running'].includes(run.status));
  const latestRun = runs?.data[0];
  const isProcessing = !!activeRun;
  const startRun = useMutation({
    mutationFn: async () => {
      if (!selectedLineId) throw new Error('No line selected.');
      const { error } = await apiClient.POST('/v1/production-runs', {
        body: { production_line_id: selectedLineId ?? 0 },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-runs'] });
      toast.success('Production queued. It continues when you leave this page.');
    },
    onError: () => toast.error('Unable to queue production. Check that orders are staged.'),
  });
  const retryRun = useMutation({
    mutationFn: async () => {
      if (!latestRun) throw new Error('No run selected.');
      const { error } = await apiClient.POST('/v1/production-runs/{productionRun}/retry', {
        params: { path: { productionRun: latestRun.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production-runs'] }),
    onError: () => toast.error('Unable to retry this run.'),
  });

  // Loading state
  const loading = linesLoading; // Initial load

  // Move items in selection list
  const moveItem = useCallback(
    (index: number, direction: number) => {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId ?? 0] || [];
        const newItems = [...currentLineItems];
        const [movedItem] = newItems.splice(index, 1);
        newItems.splice(index + direction, 0, movedItem);
        return { ...prev, [selectedLineId ?? 0]: newItems };
      });
    },
    [selectedLineId],
  );

  // Move single item to selection (stage)
  const handleStageItem = useCallback(
    (item: Sale) => {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId ?? 0] || [];
        // Prevent duplicates if already selected
        if (currentLineItems.find(i => i.id === item.id) || currentLineItems.length >= 100)
          return prev;
        return { ...prev, [selectedLineId ?? 0]: [...currentLineItems, item] };
      });
    },
    [selectedLineId],
  );

  // Remove item from selection (unstage)
  const handleUnstageItem = useCallback(
    (item: Sale) => {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId ?? 0] || [];
        return { ...prev, [selectedLineId ?? 0]: currentLineItems.filter(i => i.id !== item.id) };
      });
    },
    [selectedLineId],
  );

  const handleEdit = useCallback(() => {
    const lineSales = sales; // NEW (from query)
    const pending = lineSales.filter(s => s.status === 'pending');
    if (pending.length > 0) {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId ?? 0] || [];
        // Avoid duplicates
        const existingIds = new Set(currentLineItems.map(i => i.id));
        const newItems = pending
          .filter(i => !existingIds.has(i.id))
          .slice(0, 100 - currentLineItems.length);
        return { ...prev, [selectedLineId ?? 0]: [...currentLineItems, ...newItems] };
      });
    } else {
      toast('No pending sales to edit', { icon: 'ℹ️' });
    }
  }, [selectedLineId, sales]);

  // Handle Save - move selected items to production
  const handleSave = async () => {
    if (selectedItems.length === 0) return;
    const saleIds = selectedItems.map(s => s.id);
    saveToProductionMutation.mutate({ lineId: selectedLineId, saleIds });
  };

  const isSaving = saveToProductionMutation.isPending;

  const handleStart = () => {
    if (!isProcessing && !startRun.isPending) startRun.mutate();
  };

  const selectedLine = productionLines.find(l => l.id === selectedLineId);
  // Filter out items that are already selected to avoid duplication in UI
  const selectedIds = new Set(selectedItems.map(i => i.id));
  const pendingSales = sales.filter(s => s.status === 'pending' && !selectedIds.has(s.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/25"></div>
      </div>
    );
  }

  return (
    <div className="workspace-page !max-w-[1600px]">
      {(linesError || salesError) && (
        <p role="alert" className="mb-4 text-destructive">
          Unable to load production data. Reload to try again.
        </p>
      )}
      {latestRun && (
        <output className="mb-6 block rounded-xl border border-border bg-card p-4 text-sm leading-6 text-foreground">
          Production run: {latestRun.status} — {latestRun.processed_count} / {latestRun.total_count}{' '}
          orders.
          {activeRun && <span> Processing continues on the server. You can close this page.</span>}
          {latestRun.last_error && <p>{latestRun.last_error}</p>}
          {latestRun.status === 'failed' && (
            <Button onClick={() => retryRun.mutate()} disabled={retryRun.isPending}>
              Retry production run
            </Button>
          )}
        </output>
      )}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar - Production Lines */}
        <aside className="w-full space-y-4 lg:w-56 lg:shrink-0">
          <Link
            to="/"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h2 className="text-lg font-semibold text-foreground mb-4">Production Lines</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {productionLines.map(line => (
              <button
                type="button"
                aria-pressed={selectedLineId === line.id}
                key={line.id}
                onClick={() => !isProcessing && !isSaving && setSelectedLineId(line.id)}
                className={`
                w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border relative group
                ${
                  selectedLineId === line.id
                    ? 'border-primary/25 bg-card shadow-lg ring-1 ring-ring'
                    : 'border-border bg-card/50 hover:bg-card hover:border-border'
                }
                ${isProcessing || isSaving ? 'opacity-80' : ''}
              `}
              >
                <img
                  src={line.product_logo_url ?? undefined}
                  alt={line.name}
                  className="w-full h-20 lg:h-28 object-cover"
                  onError={e => {
                    e.currentTarget.src = 'https://via.placeholder.com/200x100?text=No+Image';
                  }}
                />
                <div className="p-3 bg-card">
                  <h3 className="text-foreground font-bold text-lg">{line.name}</h3>
                  {line.has_sales ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning"></span>
                      </span>
                      <span className="text-xs font-medium text-warning">Pending Actions</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-2 w-2 rounded-full bg-success"></span>
                      <span className="text-xs font-medium text-success">All Caught Up</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0 flex-1 flex flex-col gap-5">
          {/* Status Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 bg-card/80 p-4 rounded-xl border border-border shadow-sm">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {selectedLine?.name || 'Select a Line'}
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage production workflow and processing
              </p>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-3 px-4 py-2 bg-accent/30 border border-primary/25 rounded-full animate-pulse">
                <Loader2 className="animate-spin text-primary h-5 w-5" />
                <span className="text-primary font-medium">Production in progress...</span>
              </div>
            )}

            {isSaving && (
              <div className="flex items-center gap-3 px-4 py-2 bg-warning/10 border border-warning rounded-full">
                <Loader2 className="animate-spin text-warning h-5 w-5" />
                <span className="text-warning font-medium">Saving changes...</span>
              </div>
            )}
          </div>

          {/* Three Column Workflow */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Sales Column */}
            <Card className="flex flex-col bg-card/50 border-border shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-background/50 border-b border-border py-4 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <CardTitle className="text-foreground tracking-wide text-lg">
                    Sales Orders
                  </CardTitle>
                </div>
                <div className="px-2 py-1 bg-accent/30 rounded text-xs font-mono text-primary border border-primary/25">
                  {pendingSales.length}
                </div>
              </CardHeader>
              <CardContent className="max-h-[32rem] flex-1 p-0 overflow-y-auto custom-scrollbar bg-background/30">
                {pendingSales.length > 0 ? (
                  <ul className="p-3 space-y-2">
                    {pendingSales.map(item => (
                      <li
                        key={item.id}
                        onDoubleClick={() => handleStageItem(item)}
                        title="Double-click to stage"
                        className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-200 group/item shadow-sm cursor-pointer select-none hover:bg-secondary/50"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-foreground">
                            {item.product?.name}
                          </span>
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {item.quantity} units
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-xs text-muted-foreground">
                            <p>{item.customer?.name}</p>
                            <p className="text-muted-foreground mt-0.5">
                              {new Date(item.date_to_deliver).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <div className="bg-card/50 p-4 rounded-full mb-3">
                      <svg
                        className="w-8 h-8 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p>No pending sales</p>
                  </div>
                )}
              </CardContent>
              <div className="p-3 border-t border-border bg-card">
                <Button
                  onClick={handleEdit}
                  disabled={pendingSales.length === 0 || isProcessing || isSaving}
                  className="w-full bg-secondary hover:bg-secondary text-foreground shadow-sm transition-all duration-300"
                >
                  Select up to 100 for Production
                </Button>
              </div>
            </Card>

            {/* Selection Column */}
            <Card className="flex flex-col bg-card/50 border-border shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-background/50 border-b border-border py-4 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <CardTitle className="text-foreground tracking-wide text-lg">Staging</CardTitle>
                </div>
                <div className="px-2 py-1 bg-success/10 rounded text-xs font-mono text-success border border-success">
                  {selectedItems.length}
                </div>
              </CardHeader>
              <CardContent className="max-h-[32rem] flex-1 p-0 overflow-y-auto custom-scrollbar bg-background/30">
                {selectedItems.length > 0 ? (
                  <ul ref={parentRef} className="p-3 space-y-2">
                    {selectedItems.map((item, index) => (
                      <li
                        key={item.id}
                        onDoubleClick={() => handleUnstageItem(item)}
                        title="Double-click to unstage"
                        className="p-3 rounded-lg bg-card border border-success/30 hover:border-success/60 transition-all duration-200 shadow-sm relative pl-4 pr-12 cursor-pointer select-none hover:bg-secondary/50"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-success rounded-l-lg"></div>
                        <div className="font-semibold text-foreground mb-1">
                          {item.product?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.customer?.name} • {item.quantity} units
                        </div>

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-success disabled:opacity-30 transition-colors hover:bg-transparent"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === selectedItems.length - 1}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-success disabled:opacity-30 transition-colors hover:bg-transparent"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <div className="bg-card/50 p-4 rounded-full mb-3">
                      <svg
                        className="w-8 h-8 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <p>Select items to stage</p>
                  </div>
                )}
              </CardContent>
              <div className="p-3 border-t border-border bg-card">
                <Button
                  onClick={handleSave}
                  disabled={selectedItems.length === 0 || isProcessing || isSaving}
                  className="w-full bg-success hover:bg-success/90 text-primary-foreground shadow-sm transition-all duration-300 font-semibold"
                >
                  Confirm to Production
                </Button>
              </div>
            </Card>

            {/* In Production Column */}
            <Card className="flex flex-col bg-card/50 border-border shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-background/50 border-b border-border py-4 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <CardTitle className="text-foreground tracking-wide text-lg">
                    In Production
                  </CardTitle>
                </div>
                <div className="px-2 py-1 bg-accent/30 rounded text-xs font-mono text-primary border border-primary/25">
                  {inProductionItems.length}
                </div>
              </CardHeader>
              <CardContent className="max-h-[32rem] flex-1 p-0 overflow-y-auto custom-scrollbar bg-background/30">
                {inProductionItems.length > 0 ? (
                  <ul className="p-3 space-y-2">
                    {inProductionItems.map(item => (
                      <li
                        key={item.id}
                        className={`p-3 rounded-lg border transition-all duration-500 ${isProcessing ? 'bg-accent/20 border-primary/40 shadow-md' : 'bg-card border-border'}`}
                      >
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
                          <span
                            className={`font-semibold ${isProcessing ? 'text-primary' : 'text-foreground'}`}
                          >
                            {item.product?.name}
                          </span>
                          {isProcessing && (
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>{item.quantity} units</span>
                          <span
                            className={
                              isProcessing ? 'text-primary font-medium' : 'text-muted-foreground'
                            }
                          >
                            {isProcessing ? 'Processing' : 'Queued'}
                          </span>
                        </div>
                        {isProcessing && (
                          <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary animate-progress"></div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <div className="bg-card/50 p-4 rounded-full mb-3">
                      <svg
                        className="w-8 h-8 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p>Ready to start</p>
                  </div>
                )}
              </CardContent>
              <div className="p-3 border-t border-border bg-card">
                <Button
                  onClick={handleStart}
                  disabled={
                    inProductionItems.length === 0 || isProcessing || isSaving || startRun.isPending
                  }
                  className={`w-full text-primary-foreground shadow-sm transition-all duration-300 font-bold ${isProcessing ? 'bg-primary cursor-not-allowed' : 'bg-primary hover:bg-primary'}`}
                >
                  {isProcessing ? 'Processing...' : 'START PRODUCTION'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagerViewPage;
