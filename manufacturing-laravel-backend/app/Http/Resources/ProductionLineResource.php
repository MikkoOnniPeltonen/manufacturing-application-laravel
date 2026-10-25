<?php

namespace App\Http\Resources;

use App\Models\ProductionLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ProductionLine */
class ProductionLineResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'pending_sales_count' => $this->whenHas('pending_sales_count', fn () => (int) $this->pending_sales_count),
            'in_production_sales_count' => $this->whenHas('in_production_sales_count', fn () => (int) $this->in_production_sales_count),
            'delivered_sales_count' => $this->whenHas('delivered_sales_count', fn () => (int) $this->delivered_sales_count),
            'capacity' => $this->capacity,
            'has_sales' => (bool) $this->has_sales, // Ensure boolean
            'product_logo_url' => $this->product_logo_url,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
