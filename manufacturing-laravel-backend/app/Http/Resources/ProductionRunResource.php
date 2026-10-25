<?php

namespace App\Http\Resources;

use App\Models\ProductionRun;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionRun */
class ProductionRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'production_line_id' => $this->production_line_id, 'status' => $this->status,
            'total_count' => $this->total_count, 'processed_count' => $this->processed_count, 'last_error' => $this->last_error,
            'created_at' => $this->created_at->toIso8601String(), 'started_at' => $this->started_at?->toIso8601String(),
            'finished_at' => $this->finished_at?->toIso8601String(),
        ];
    }
}
