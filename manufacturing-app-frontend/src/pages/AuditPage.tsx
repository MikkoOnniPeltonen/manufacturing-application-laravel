import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/button';

export default function AuditPage() {
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const subject = params.get('subject_id') || undefined;
  const { data, error, isLoading } = useQuery({
    queryKey: ['audit', subject, page],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/audit-events', {
        params: { query: { page, per_page: 25, subject_id: subject } },
      });
      if (error || !data) throw new Error('Unable to load audit trail.');
      return data;
    },
  });
  return (
    <main className="workspace-page space-y-6">
      <Link to="/orders" className="underline">
        Orders
      </Link>
      <header className="space-y-2">
        <h1 className="workspace-title">Audit trail</h1>
        <p className="workspace-subtitle">
          Review who changed an order, why it changed, and the values before and after.
        </p>
      </header>
      {subject && (
        <p>
          Showing subject {subject}.{' '}
          <Link className="underline" to="/admin/audit">
            Show all
          </Link>
        </p>
      )}
      {error && <p role="alert">Unable to load audit events.</p>}
      {isLoading && <p>Loading…</p>}
      {data?.data.length === 0 && (
        <p className="workspace-panel text-muted-foreground">
          No audit events found. Order and production changes will appear here.
        </p>
      )}
      {data?.data.map(event => (
        <article key={event.id} className="workspace-panel space-y-3">
          <div className="font-semibold">
            {event.action} — {event.actor_name}
          </div>
          <div>{event.reason}</div>
          <time className="text-sm text-muted-foreground">
            {new Date(event.created_at).toLocaleString()}
          </time>
          <div className="break-all text-xs font-mono text-muted-foreground">
            {event.subject_type}: {event.subject_id}
          </div>
          <details>
            <summary className="cursor-pointer py-2 font-medium text-primary">
              Changed values
            </summary>
            <div className="grid md:grid-cols-2 gap-4">
              <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs leading-6">
                Before: {JSON.stringify(event.before, null, 2)}
              </pre>
              <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs leading-6">
                After: {JSON.stringify(event.after, null, 2)}
              </pre>
            </div>
          </details>
        </article>
      ))}
      <div className="flex flex-wrap gap-3 items-center">
        <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          Previous events
        </Button>
        <span>
          Page {page} of {data?.last_page ?? 1}
        </span>
        <Button disabled={page >= (data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>
          Next events
        </Button>
      </div>
    </main>
  );
}
