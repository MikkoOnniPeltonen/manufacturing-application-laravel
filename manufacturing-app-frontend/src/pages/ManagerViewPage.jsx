import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { collectionItems } from '../api/collections';

function ManagerViewPage() {
  // const [productionLines, setProductionLines] = useState([]); // Managed by Query
  const [selectedLineId, setSelectedLineId] = useState(null);

  // Staging state remains local as it's UI only until saved
  const [stagedItemsByLine, setStagedItemsByLine] = useState({});
  const selectedItems = stagedItemsByLine[selectedLineId] || [];

  // In-Production state managed via derived state/mutations, but for processing loop we still need a list
  // Actually, we can derive "inProductionItems" from the query data for rendering,
  // but for the "processing simulation" loop which updates one by one, we might need to rely on the query data refreshing or optimistic updates.
  // For simplicity: We will trigger simulator off the query data.

  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const parentRef = useRef(null);
  useAutoAnimate(parentRef);

  // 1. Fetch Production Lines
  const { data: productionLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['production-lines'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/production-lines');
      if (error || !data) throw error ?? new Error('Unable to load production lines.');
      const lines = collectionItems(data);
      if (!selectedLineId && lines.length > 0) {
        setSelectedLineId(lines[0].id);
      }
      return lines;
    },
  });

  // 2. Fetch Sales for Selected Line
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedLineId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/sales/{productionLine}', {
        params: { path: { productionLine: selectedLineId } },
      });
      if (error || !data) throw error ?? new Error('Unable to load sales.');
      return collectionItems(data);
    },
    enabled: !!selectedLineId,
  });

  // Derived State
  // "salesByLine" is now "sales"
  // "inProductionItems" derived from sales
  const inProductionItems = sales.filter(s => s.status === 'in_production');

  // 3. Mutation: Save to Production (Move from Staging to Sales)
  const saveToProductionMutation = useMutation({
    mutationFn: async ({ lineId, saleIds }) => {
      const { error } = await apiClient.PATCH('/v1/productions/{productionLine}', {
        params: { path: { productionLine: lineId } },
        body: { sale_ids: saleIds, status: 'in_production' },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Items moved to production');
      queryClient.invalidateQueries(['sales', selectedLineId]);
      queryClient.invalidateQueries(['production-lines']); // For has_sales badges
      // Clear staged items
      setStagedItemsByLine(prev => ({ ...prev, [selectedLineId]: [] }));
    },
    onError: () => toast.error('Failed to save changes'),
  });

  // 4. Mutation: Process Item (One by one)
  const processItemMutation = useMutation({
    mutationFn: async itemId => {
      const { error } = await apiClient.POST('/v1/productions/process/{sale}', {
        params: { path: { sale: itemId } },
      });
      if (error) throw error;
    },
    // We do NOT invalidate immediately after EACH item to avoid flickering if we loop fast.
    // Instead we invalidate at the end of the batch in the handler.
    // OR we can invalidate each time if we want to see it disappear.
    // Let's invalidate each time for correctness, or handle it in the loop.
  });

  // Loading state
  const loading = linesLoading; // Initial load

  // Move items in selection list
  const moveItem = useCallback(
    (index, direction) => {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId] || [];
        const newItems = [...currentLineItems];
        const [movedItem] = newItems.splice(index, 1);
        newItems.splice(index + direction, 0, movedItem);
        return { ...prev, [selectedLineId]: newItems };
      });
    },
    [selectedLineId],
  );

  // Move single item to selection (stage)
  const handleStageItem = useCallback(
    item => {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId] || [];
        // Prevent duplicates if already selected
        if (currentLineItems.find(i => i.id === item.id)) return prev;
        return { ...prev, [selectedLineId]: [...currentLineItems, item] };
      });
    },
    [selectedLineId],
  );

  // Remove item from selection (unstage)
  const handleUnstageItem = useCallback(
    item => {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId] || [];
        return { ...prev, [selectedLineId]: currentLineItems.filter(i => i.id !== item.id) };
      });
    },
    [selectedLineId],
  );

  const handleEdit = useCallback(() => {
    const lineSales = sales; // NEW (from query)
    const pending = lineSales.filter(s => s.status === 'pending');
    if (pending.length > 0) {
      setStagedItemsByLine(prev => {
        const currentLineItems = prev[selectedLineId] || [];
        // Avoid duplicates
        const existingIds = new Set(currentLineItems.map(i => i.id));
        const newItems = pending.filter(i => !existingIds.has(i.id));
        return { ...prev, [selectedLineId]: [...currentLineItems, ...newItems] };
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

  // Process items one by one
  const processItems = useCallback(async () => {
    // Current Items derived from query
    if (inProductionItems.length === 0) return;

    setIsProcessing(true);
    // Copy items to process loop
    const itemsToProcess = [...inProductionItems];
    let processedCount = 0;

    for (const item of itemsToProcess) {
      try {
        const line = productionLines.find(l => l.id === selectedLineId);
        // Faster processing for demo purposes
        const timeToProcess = (item.quantity / (line?.capacity || 1000)) * 5000;
        await new Promise(resolve => setTimeout(resolve, Math.min(timeToProcess, 5000)));

        await processItemMutation.mutateAsync(item.id);

        // We can optionally manually update local state for visuals if query is slow,
        // but typically invalidateQueries is fast enough for local dev.
        // If we want immediate feedback "removal" from list, we rely on React Query's eventual consistency or optimistic updates.
        // For this batch loop, let's just wait for loop to finish to invalidate or verify?
        // Actually, mutation is async, so we await it.

        processedCount++;
        toast.success(`Processed: ${item.product?.name || 'Item'}`, { duration: 2000 });
      } catch (error) {
        console.error('Error processing item: ', error);
        toast.error('Processing error');
        break;
      }
    }

    toast.success(`Batch completed: ${processedCount} items processed`);

    // Refresh data at the end to ensure synchronization
    queryClient.invalidateQueries(['sales', selectedLineId]);
    queryClient.invalidateQueries(['production-lines']);

    setIsProcessing(false);
  }, [inProductionItems, selectedLineId, productionLines, processItemMutation, queryClient]);

  // Begin production
  const handleStart = useCallback(() => {
    if (isProcessing || inProductionItems.length === 0) return;
    processItems();
  }, [isProcessing, inProductionItems, processItems]);

  const selectedLine = productionLines.find(l => l.id === selectedLineId);
  // Filter out items that are already selected to avoid duplication in UI
  const selectedIds = new Set(selectedItems.map(i => i.id));
  const pendingSales = sales.filter(s => s.status === 'pending' && !selectedIds.has(s.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans">
      <div className="flex gap-6 h-[calc(100vh-100px)]">
        {/* Sidebar - Production Lines */}
        <aside className="w-72 space-y-4 pr-2">
          <Link
            to="/"
            className="flex items-center text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h2 className="text-xl font-bold text-white mb-4 pl-1">Production Lines</h2>
          {productionLines.map(line => (
            <div
              key={line.id}
              onClick={() => !isProcessing && !isSaving && setSelectedLineId(line.id)}
              className={`
                cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border relative group
                ${
                  selectedLineId === line.id
                    ? 'border-blue-500 bg-slate-800 shadow-lg ring-1 ring-blue-500'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
                }
                ${isProcessing || isSaving ? 'opacity-80' : ''}
              `}
            >
              <img
                src={line.product_logo_url}
                alt={line.name}
                className="w-full h-32 object-cover"
                onError={e => {
                  e.target.src = 'https://via.placeholder.com/200x100?text=No+Image';
                }}
              />
              <div className="p-3 bg-slate-800">
                <h3 className="text-white font-bold text-lg">{line.name}</h3>
                {line.has_sales ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-medium text-amber-500">Pending Actions</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-medium text-emerald-500">All Caught Up</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Status Header */}
          <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {selectedLine?.name || 'Select a Line'}
              </h1>
              <p className="text-slate-400 text-sm">Manage production workflow and processing</p>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-900/30 border border-blue-800 rounded-full animate-pulse">
                <Loader2 className="animate-spin text-blue-400 h-5 w-5" />
                <span className="text-blue-300 font-medium">Production in progress...</span>
              </div>
            )}

            {isSaving && (
              <div className="flex items-center gap-3 px-4 py-2 bg-amber-900/30 border border-amber-800 rounded-full">
                <Loader2 className="animate-spin text-amber-500 h-5 w-5" />
                <span className="text-amber-400 font-medium">Saving changes...</span>
              </div>
            )}
          </div>

          {/* Three Column Workflow */}
          <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
            {/* Sales Column */}
            <Card className="flex flex-col bg-slate-800/50 border-slate-700 shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-slate-900/50 border-b border-slate-700 py-4 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <CardTitle className="text-white tracking-wide text-lg">Sales Orders</CardTitle>
                </div>
                <div className="px-2 py-1 bg-blue-900/30 rounded text-xs font-mono text-blue-300 border border-blue-800">
                  {pendingSales.length}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar bg-slate-900/30">
                {pendingSales.length > 0 ? (
                  <ul className="p-3 space-y-2">
                    {pendingSales.map(item => (
                      <li
                        key={item.id}
                        onDoubleClick={() => handleStageItem(item)}
                        title="Double-click to stage"
                        className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-all duration-200 group/item shadow-sm cursor-pointer select-none hover:bg-slate-700/50"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-white">{item.product?.name}</span>
                          <span className="text-xs font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">
                            {item.quantity} units
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-xs text-slate-400">
                            <p>{item.customer?.name}</p>
                            <p className="text-slate-500 mt-0.5">
                              {new Date(item.date_to_deliver).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <div className="bg-slate-800/50 p-4 rounded-full mb-3">
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
              <div className="p-3 border-t border-slate-700 bg-slate-800">
                <Button
                  onClick={handleEdit}
                  disabled={pendingSales.length === 0 || isProcessing || isSaving}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white shadow-sm transition-all duration-300"
                >
                  Select All for Production
                </Button>
              </div>
            </Card>

            {/* Selection Column */}
            <Card className="flex flex-col bg-slate-800/50 border-slate-700 shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-slate-900/50 border-b border-slate-700 py-4 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <CardTitle className="text-white tracking-wide text-lg">Staging</CardTitle>
                </div>
                <div className="px-2 py-1 bg-emerald-900/30 rounded text-xs font-mono text-emerald-300 border border-emerald-800">
                  {selectedItems.length}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar bg-slate-900/30">
                {selectedItems.length > 0 ? (
                  <ul ref={parentRef} className="p-3 space-y-2">
                    {selectedItems.map((item, index) => (
                      <li
                        key={item.id}
                        onDoubleClick={() => handleUnstageItem(item)}
                        title="Double-click to unstage"
                        className="p-3 rounded-lg bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-200 shadow-sm relative pl-4 pr-12 cursor-pointer select-none hover:bg-slate-700/50"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-lg"></div>
                        <div className="font-semibold text-white mb-1">{item.product?.name}</div>
                        <div className="text-xs text-slate-400">
                          {item.customer?.name} • {item.quantity} units
                        </div>

                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                            className="h-6 w-6 p-0 text-slate-500 hover:text-emerald-400 disabled:opacity-30 transition-colors hover:bg-transparent"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === selectedItems.length - 1}
                            className="h-6 w-6 p-0 text-slate-500 hover:text-emerald-400 disabled:opacity-30 transition-colors hover:bg-transparent"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <div className="bg-slate-800/50 p-4 rounded-full mb-3">
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
              <div className="p-3 border-t border-slate-700 bg-slate-800">
                <Button
                  onClick={handleSave}
                  disabled={selectedItems.length === 0 || isProcessing || isSaving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all duration-300 font-semibold"
                >
                  Confirm to Production
                </Button>
              </div>
            </Card>

            {/* In Production Column */}
            <Card className="flex flex-col bg-slate-800/50 border-slate-700 shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-slate-900/50 border-b border-slate-700 py-4 px-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <CardTitle className="text-white tracking-wide text-lg">In Production</CardTitle>
                </div>
                <div className="px-2 py-1 bg-purple-900/30 rounded text-xs font-mono text-purple-300 border border-purple-800">
                  {inProductionItems.length}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar bg-slate-900/30">
                {inProductionItems.length > 0 ? (
                  <ul className="p-3 space-y-2">
                    {inProductionItems.map(item => (
                      <li
                        key={item.id}
                        className={`p-3 rounded-lg border transition-all duration-500 ${isProcessing ? 'bg-purple-900/20 border-purple-500/40 shadow-md' : 'bg-slate-800 border-slate-700'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span
                            className={`font-semibold ${isProcessing ? 'text-purple-300' : 'text-white'}`}
                          >
                            {item.product?.name}
                          </span>
                          {isProcessing && (
                            <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex justify-between">
                          <span>{item.quantity} units</span>
                          <span
                            className={
                              isProcessing ? 'text-purple-400 font-medium' : 'text-slate-500'
                            }
                          >
                            {isProcessing ? 'Processing' : 'Queued'}
                          </span>
                        </div>
                        {isProcessing && (
                          <div className="mt-2 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 animate-progress"></div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <div className="bg-slate-800/50 p-4 rounded-full mb-3">
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
              <div className="p-3 border-t border-slate-700 bg-slate-800">
                <Button
                  onClick={handleStart}
                  disabled={inProductionItems.length === 0 || isProcessing || isSaving}
                  className={`w-full text-white shadow-sm transition-all duration-300 font-bold ${isProcessing ? 'bg-purple-800 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'}`}
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
