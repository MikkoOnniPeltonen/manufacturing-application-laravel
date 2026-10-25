<?php

namespace App\Http\Resources;

use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Sale */
class CustomerSalesSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'production_line_id' => (int) $this->production_line_id,
            'status' => $this->status->value,
            'quantity' => (int) $this->quantity,
        ];
    }
}
