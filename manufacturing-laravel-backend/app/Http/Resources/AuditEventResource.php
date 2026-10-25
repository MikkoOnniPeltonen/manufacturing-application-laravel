<?php

namespace App\Http\Resources;

use App\Models\AuditEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AuditEvent */
class AuditEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'actor_id' => $this->actor_id, 'actor_name' => $this->actor_name,
            'subject_type' => $this->subject_type, 'subject_id' => $this->subject_id, 'action' => $this->action,
            'reason' => $this->reason, 'before' => $this->before, 'after' => $this->after,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
