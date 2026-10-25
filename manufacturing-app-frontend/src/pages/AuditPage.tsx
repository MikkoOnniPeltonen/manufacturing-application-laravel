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
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100 space-y-5">
      <Link to="/orders" className="underline">
        Orders
      </Link>
      <h1 className="text-3xl font-bold">Audit trail</h1>
      <p>Changes include the actor, reason, and values before and after the operation.</p>
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
      {data?.data.map(event => (
        <article key={event.id} className="border border-slate-700 rounded p-4 space-y-2">
          <div className="font-semibold">
            {event.action} — {event.actor_name}
          </div>
          <div>{event.reason}</div>
          <time>{new Date(event.created_at).toLocaleString()}</time>
          <div className="text-sm font-mono">
            {event.subject_type}: {event.subject_id}
          </div>
          <details>
            <summary className="cursor-pointer">Changed values</summary>
            <div className="grid md:grid-cols-2 gap-4">
              <pre className="overflow-auto">Before: {JSON.stringify(event.before, null, 2)}</pre>
              <pre className="overflow-auto">After: {JSON.stringify(event.after, null, 2)}</pre>
            </div>
          </details>
        </article>
      ))}
      <div className="flex gap-4 items-center">
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
