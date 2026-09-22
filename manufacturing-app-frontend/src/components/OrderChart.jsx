import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function OrderChart({ chartData, productionLines }) {
  // Merge production lines with data to ensure all lines appear even if empty
  const completeChartData = productionLines.map(line => {
    const existingData = chartData.find(d => d.productionLine === line.name) || {};
    return {
      productionLine: line.name,
      pending: existingData.pending || 0,
      in_production: existingData.in_production || 0,
      delivered: existingData.delivered || 0,
      avg_pending: existingData.avg_pending || 0,
      avg_delivered: existingData.avg_delivered || 0,
    };
  });

  return (
    <div className="w-full bg-slate-900 rounded-lg p-4 border border-slate-700 shadow-sm">
      <ResponsiveContainer width="100%" height={400} className="min-h-[400px]">
        <BarChart data={completeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <pattern
              id="stripedPending"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="8" fill="#f59e0b" />
              <rect x="4" width="4" height="8" fill="#b45309" />
            </pattern>
            <pattern
              id="stripedBlue"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="8" fill="#60a5fa" />
              <rect x="4" width="4" height="8" fill="#2563eb" />
            </pattern>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-700" vertical={false} />
          <XAxis
            dataKey="productionLine"
            tickFormatter={value => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
            interval={0}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={{ stroke: '#475569' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={{ stroke: '#475569' }}
            unit="%"
            domain={[0, 100]}
          />
          <Tooltip
            cursor={{ fill: '#1e293b', opacity: 0.5 }}
            formatter={value => [`${value}%`, undefined]}
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              color: '#f8fafc',
              borderRadius: '0.5rem',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          {/* Customer Stack (Stack A) */}
          <Bar
            dataKey="pending"
            name="Your Share (Pending)"
            stackId="a"
            fill="url(#stripedPending)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="in_production"
            name="Your Share (In Prod)"
            stackId="a"
            fill="#a855f7" // Purple-500
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="delivered"
            name="Your Share (Done)"
            stackId="a"
            fill="#10b981" // Emerald-500
            radius={[4, 4, 0, 0]}
          />

          {/* Average Stack (Stack B) */}
          <Bar
            dataKey="avg_pending"
            name="Avg Market Share (Pending)"
            stackId="b"
            fill="url(#stripedBlue)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="avg_delivered"
            name="Avg Market Share (Done)"
            stackId="b"
            fill="#1d4ed8" // Blue-700
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OrderChart;
