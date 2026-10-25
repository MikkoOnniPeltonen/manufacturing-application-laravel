import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function OperationsPage() {
  const { data, error } = useQuery({
    queryKey: ['operations'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/operations');
      if (error || !data) throw new Error('Unable to load operations.');
      return data;
    },
    refetchInterval: 15000,
  });
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 space-y-5">
      <Link to="/" className="underline">
        Dashboard
      </Link>
      <h1 className="text-3xl font-bold">Operations</h1>
      {error && <p role="alert">Unable to load operational status.</p>}
      <p>Live database, cache, worker, scheduler, failed-job, and backup verification signals.</p>
      {data && !data.alerts_configured && (
        <output className="text-amber-300">
          Errors are logged locally. Configure an HTTPS error alert endpoint for external
          notifications.
        </output>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(data?.checks ?? {}).map(([name, check]) => (
          <article
            key={name}
            className={`border rounded p-4 ${check.ok ? 'border-emerald-600' : 'border-amber-500'}`}
          >
            <h2 className="font-semibold">
              {name.replaceAll('_', ' ')}: {check.ok ? 'Healthy' : 'Needs attention'}
            </h2>
            <p>{check.message}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
