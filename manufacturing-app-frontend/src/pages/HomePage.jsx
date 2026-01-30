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
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';


function HomePage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLineId, setSelectedLineId] = useState(null);

  // 1. Fetch Production Lines
  const { data: productionLines = [], isLoading: prodLinesLoading } = useQuery({
    queryKey: ['production-lines'],
    queryFn: async () => {
      const { data } = await api.get('/production-lines');
      return data;
    },
  });

  // 2. Fetch Sales (Dependent on selectedLineId)
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedLineId],
    queryFn: async () => {
      const { data } = await api.get('/sales', {
        params: { production_line_id: selectedLineId },
      });
      return data;
    },
    enabled: !!selectedLineId,
  });

  // Derived state for charts
  const salesStats = {
    pending: sales.filter(s => s.status === 'pending').length,
    delivered: sales.filter(s => s.status === 'delivered').length,
  };

  // 3. Mutation: Generate Sales
  const generateSalesMutation = useMutation({
    mutationFn: async ({ lineId, count }) => {
      return api.post(`/sales/generate`, {
        production_line_id: lineId,
        count,
      });
    },
    onSuccess: () => {
      toast.success('Random sales generated successfully!');
      queryClient.invalidateQueries(['production-lines']);
      queryClient.invalidateQueries(['sales', selectedLineId]);
    },
    onError: () => {
      toast.error('Failed to generate sales');
    },
  });

  // 4. Mutation: Clear Sales
  const clearSalesMutation = useMutation({
    mutationFn: async lineId => {
      return api.delete(`/sales/${lineId}/clear`);
    },
    onSuccess: () => {
      toast.success('Pending sales cleared!');
      queryClient.invalidateQueries(['production-lines']);
      queryClient.invalidateQueries(['sales', selectedLineId]);
    },
    onError: () => {
      toast.error('Failed to clear sales');
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

  const handleClearSales = () => {
    if (!selectedLineId) {
      toast.error('Please select a production line first');
      return;
    }
    if (!window.confirm('Are you sure you want to clear all pending sales for this line?')) return;

    clearSalesMutation.mutate(selectedLineId);
  };

  const salesLoading = generateSalesMutation.isPending; // Alias for UI compatibility

  if (prodLinesLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const pieData = [
    { name: 'Pending', value: salesStats.pending, color: '#f59e0b' },
    { name: 'Completed', value: salesStats.delivered, color: '#10b981' },
  ].filter(d => d.value > 0);

  // const COLORS = ['#f59e0b', '#10b981']; // Unused now

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-sm flex flex-col items-start text-left">
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold text-white mb-3">Manufacturing Dashboard</h1>
            <p className="text-slate-400 text-lg">
              Welcome back, <span className="text-blue-400 font-semibold">{user?.name}</span>.
            </p>
            <p className="text-slate-500">
              Overview of production status and sales distribution.
            </p>
          </div>

          {/* Admin Quick Access */}
          {isAdmin && (
            <Link to="/customers">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-purple-500/25 flex items-center gap-2">
                Manage Customers Database
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </section>

        {/* Dashboard Content */}
        <section className="grid md:grid-cols-2 gap-8">
          {/* Sales Control Card */}
          <Card className="bg-slate-800 border-slate-700 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-slate-900/50 border-b border-slate-700 p-6">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <span className="p-2 bg-blue-900/30 rounded-lg">📊</span>
                Production Control
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Select Production Line target
                  </label>
                  <Select onValueChange={setSelectedLineId} value={selectedLineId || ''}>
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white h-11">
                      <SelectValue placeholder="Choose a line..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {productionLines.map(line => (
                        <SelectItem
                          key={line.id}
                          value={line.id}
                          className="cursor-pointer focus:bg-slate-700 focus:text-white"
                        >
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin Only Controls */}
                {isAdmin ? (
                  <div className="pt-4 space-y-3">
                    <Button
                      onClick={handleGenerateSales}
                      disabled={salesLoading || !selectedLineId}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11"
                    >
                      {salesLoading ? 'Generating...' : 'Generate Random Sales'}
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
                    <p className="text-slate-400 text-sm">
                      Admin access required to generate sales.
                    </p>
                  </div>
                )}

                {salesLoading && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <p className="text-sm text-blue-400 text-center animate-pulse">
                      Processing orders...
                    </p>
                    <Progress
                      value={66}
                      className="h-2 bg-slate-700"
                      indicatorClassName="bg-blue-500"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI / Pie Chart Card */}
          <Card className="bg-slate-800 border-slate-700 shadow-sm flex flex-col h-full">
            <CardHeader className="bg-slate-900/50 border-b border-slate-700 p-6">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <span className="p-2 bg-purple-900/30 rounded-lg">📈</span>
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
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                        }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {(
                        (salesStats.delivered / (salesStats.pending + salesStats.delivered)) *
                        100
                      ).toFixed(0)}
                      % <span className="text-sm font-normal text-slate-400">Completion Rate</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-slate-900 rounded-full inline-block">
                    <span className="text-4xl opacity-50">📉</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">No Data Available</h3>
                    <p className="text-slate-400 text-sm mt-1">
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
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="h-8 w-1 bg-blue-500 rounded-full" />
              Active Production Lines
            </h2>
            {isAdmin && (
              <Link to="/admin/history">
                <Button
                  variant="outline"
                  className="border-amber-600/50 text-amber-500 hover:bg-amber-900/20 hover:text-amber-400 hover:border-amber-500 transition-colors"
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
                  <Card className="h-full bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden relative">
                    <div className="h-40 overflow-hidden relative bg-slate-900">
                      <img
                        src={line.product_logo_url}
                        alt={line.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {line.has_sales ? (
                        <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-sm">
                          Action Required
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-sm">
                          On Track
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-white group-hover:text-blue-400 transition-colors">
                        {line.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-400 text-sm">
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
