<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
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
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'customer_id' => $this->customer_id,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'production_line_id' => $this->production_line_id,
            'production_line' => new ProductionLineResource($this->whenLoaded('productionLine')),
            'quantity' => $this->quantity,
            'status' => $this->status?->value,
            'date_to_deliver' => $this->date_to_deliver->toIso8601String(),
            'delivered_at' => $this->delivered_at ? $this->delivered_at->toIso8601String() : null,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
