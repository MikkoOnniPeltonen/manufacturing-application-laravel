<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Sale;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    private ?int $actorId = null;

    private ?string $reason = null;

    public function within(?int $actorId, string $reason, Closure $operation): mixed
    {
        $previous = [$this->actorId, $this->reason];
        $this->actorId = $actorId;
        $this->reason = $reason;
        try {
            return $operation();
        } finally {
            [$this->actorId, $this->reason] = $previous;
        }
    }

    public function record(string $type, string $id, string $action, ?array $before, ?array $after): void
    {
        $actorId = $this->actorId ?? Auth::id();
        AuditEvent::create([
            'actor_id' => $actorId, 'actor_name' => $actorId ? (User::find($actorId)->name ?? 'Deleted user') : 'System',
            'subject_type' => $type, 'subject_id' => $id, 'action' => $action,
            'reason' => $this->reason ?? 'Manufacturing workflow', 'before' => $before, 'after' => $after, 'created_at' => now(),
        ]);
    }

    public function sale(Sale $sale, string $action): void
    {
        $fields = array_flip(['customer_id', 'product_id', 'production_line_id', 'quantity', 'date_to_deliver', 'status', 'priority', 'delivered_at', 'cancelled_at', 'deleted_at']);
        $before = $action === 'order.created' ? null : array_intersect_key($sale->getRawOriginal(), $fields);
        $after = array_intersect_key($sale->getAttributes(), $fields);
        if ($before !== $after) {
            $defaultReason = $action === 'order.created' ? 'Order created' : ($action === 'order.deleted' ? 'Pending order cleared' : (($before['status'] ?? null) !== ($after['status'] ?? null) ? 'Order status changed to '.($after['status'] ?? 'unknown') : 'Order details or queue position changed'));
            $this->within($this->actorId, $this->reason ?? $defaultReason, fn () => $this->record('sale', $sale->id, $action, $before, $after));
        }
    }
}
