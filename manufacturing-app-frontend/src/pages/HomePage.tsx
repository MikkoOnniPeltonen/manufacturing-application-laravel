import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ChartNoAxesCombined, Factory, Gauge } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import { apiErrorMessage } from '../api/errors';
import { useAuth } from '../contexts/AuthContext';

function HomePage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);

  // 1. Fetch Production Lines
  const { data: productionLines = [], isLoading: prodLinesLoading } = useQuery({
    queryKey: ['production-lines'],
    queryFn: async () => {
      return fetchCollection(page =>
        apiClient.GET('/v1/production-lines', { params: { query: { page, per_page: 100 } } }),
      );
    },
  });

  const selectedLine = productionLines.find(line => line.id === selectedLineId);
  const salesStats = {
    pending: selectedLine?.pending_sales_count ?? 0,
    inProduction: selectedLine?.in_production_sales_count ?? 0,
    delivered: selectedLine?.delivered_sales_count ?? 0,
  };

  // 3. Mutation: Generate Sales
  const generateSalesMutation = useMutation({
    mutationFn: async ({ lineId, count }: { lineId: number; count: number }) => {
      const { error } = await apiClient.POST('/v1/sales/generate', {
        body: { production_line_id: lineId, count },
      });
      if (error)
        throw new Error(apiErrorMessage(error, 'Unable to generate sales. Please try again.'));
    },
    onSuccess: () => {
      toast.success('Random sales generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['production-lines'] });
      queryClient.invalidateQueries({ queryKey: ['sales', selectedLineId] });
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleGenerateSales = () => {
    if (!selectedLineId) {
      toast.error('Please select a production line first');
      return;
    }
    const count = Math.floor(Math.random() * 5) + 3;
    generateSalesMutation.mutate({ lineId: selectedLineId, count });
  };

  const salesLoading = generateSalesMutation.isPending; // Alias for UI compatibility

  if (prodLinesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/25" />
      </div>
    );
  }

  const pieData = [
    { name: 'Pending', value: salesStats.pending, color: 'hsl(var(--chart-1))' },
    { name: 'In production', value: salesStats.inProduction, color: 'hsl(var(--chart-2))' },
    { name: 'Completed', value: salesStats.delivered, color: 'hsl(var(--chart-3))' },
  ].filter(d => d.value > 0);

  return (
    <div className="workspace-page">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <section className="bg-primary border border-primary rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-start text-left">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-primary-foreground mb-3">
              Manufacturing Dashboard
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              Welcome back, <span className="text-accent font-semibold">{user?.name}</span>.
            </p>
            <p className="text-primary-foreground/70">
              Overview of production status and sales distribution.
            </p>
          </div>

          {/* Admin Quick Access */}
          {isAdmin() && (
            <Link to="/customers">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-sm flex items-center gap-2">
                Manage Customers Database
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </section>

        {/* Dashboard Content */}
        <section className="grid md:grid-cols-2 gap-8">
          {/* Sales Control Card */}
          <Card className="bg-card border-border shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-background/50 border-b border-border p-6">
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="p-2 bg-accent/30 rounded-lg">
                  <Factory className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                Production Control
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="production-line" className="text-sm font-medium text-foreground">
                    Production line
                  </label>
                  <Select
                    onValueChange={value => {
                      setSelectedLineId(Number(value));
                      generateSalesMutation.reset();
                    }}
                    value={selectedLineId ? String(selectedLineId) : ''}
                  >
                    <SelectTrigger
                      id="production-line"
                      className="w-full bg-background border-border text-foreground h-11"
                    >
                      <SelectValue placeholder="Choose a line..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {productionLines.map(line => (
                        <SelectItem
                          key={line.id}
                          value={String(line.id)}
                          className="cursor-pointer focus:bg-secondary focus:text-foreground"
                        >
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin Only Controls */}
                {isAdmin() ? (
                  <div className="pt-4 space-y-3">
                    <Button
                      onClick={handleGenerateSales}
                      disabled={salesLoading || !selectedLineId}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                    >
                      {salesLoading ? 'Generating...' : 'Generate Random Sales'}
                    </Button>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Creates 3–7 sample orders for customers assigned products on this line.
                    </p>
                    {generateSalesMutation.error && (
                      <div
                        role="alert"
                        className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm leading-6"
                      >
                        <p>{generateSalesMutation.error.message}</p>
                        <Link
                          className="mt-2 inline-block font-medium text-primary underline underline-offset-4"
                          to="/orders"
                        >
                          Set up customer products
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 p-4 bg-background/50 rounded-lg border border-border text-center">
                    <p className="text-muted-foreground text-sm">
                      Admin access required to generate sales.
                    </p>
                  </div>
                )}

                {salesLoading && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <p className="text-sm text-primary text-center animate-pulse">
                      Processing orders...
                    </p>
                    <Progress
                      value={66}
                      className="h-2 bg-secondary"
                      indicatorClassName="bg-primary"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI / Pie Chart Card */}
          <Card className="bg-card border-border shadow-sm flex flex-col h-full">
            <CardHeader className="bg-background/50 border-b border-border p-6">
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="p-2 bg-accent/30 rounded-lg">
                  <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                Production Velocity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col items-center justify-center min-h-[300px]">
              {selectedLineId && pieData.length > 0 ? (
                <div className="w-full h-full flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {pieData.map(entry => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {(
                        (salesStats.delivered /
                          (salesStats.pending + salesStats.inProduction + salesStats.delivered)) *
                        100
                      ).toFixed(0)}
                      %{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        Completion Rate
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-background rounded-full inline-block">
                    <ChartNoAxesCombined
                      className="h-10 w-10 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground">No Data Available</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Select a production line with active data.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Production Lines Overview */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="h-8 w-1 bg-primary rounded-full" />
              Active Production Lines
            </h2>
            {isAdmin() && (
              <Link to="/admin/history">
                <Button
                  variant="outline"
                  className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning hover:border-warning transition-colors"
                >
                  View History Mode
                </Button>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {productionLines.map(line => (
              <div key={line.id} className="block group relative">
                {/* Only clickable relative to role access - logic is in ManagerView/ProtectedRoute but visually we can wrap/unwrap */}
                {/* We leave it as Link, ManagerRoute will handle bounce */}
                <Link to="/manager-view">
                  <Card className="h-full bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm overflow-hidden relative">
                    <div className="h-40 overflow-hidden relative bg-background">
                      <img
                        src={line.product_logo_url ?? undefined}
                        alt={line.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {line.has_sales ? (
                        <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-warning text-primary-foreground text-xs font-bold rounded-full shadow-sm">
                          Action Required
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-success text-primary-foreground text-xs font-bold rounded-full shadow-sm">
                          On Track
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-foreground group-hover:text-primary transition-colors">
                        {line.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        {line.has_sales
                          ? 'Pending orders waiting for production processing.'
                          : 'All orders processed. Line is running efficiently.'}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;
