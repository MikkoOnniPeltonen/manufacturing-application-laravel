import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export default function OperationsPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['operations'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/operations');
      if (error || !data) throw new Error('Unable to load operations.');
      return data;
    },
    refetchInterval: 15000,
  });
  return (
    <main className="workspace-page space-y-6">
      <Link to="/" className="underline">
        Dashboard
      </Link>
      <header className="space-y-2">
        <h1 className="workspace-title">Operations</h1>
        <p className="workspace-subtitle">
          Check service health and see which operational tasks need attention.
        </p>
      </header>
      {error && <p role="alert">Unable to load operational status.</p>}
      {isLoading && (
        <output className="workspace-panel block text-muted-foreground">
          Checking system health…
        </output>
      )}
      {data && !data.alerts_configured && (
        <output className="text-warning">
          Errors are logged locally. Configure an HTTPS error alert endpoint for external
          notifications.
        </output>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(data?.checks ?? {}).map(([name, check]) => (
          <article
            key={name}
            className={`workspace-panel space-y-2 ${check.ok ? 'border-success' : 'border-warning'}`}
          >
            <h2 className="font-semibold capitalize">
              {name.replaceAll('_', ' ')}: {check.ok ? 'Healthy' : 'Needs attention'}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{check.message}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
