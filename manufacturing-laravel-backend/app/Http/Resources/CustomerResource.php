<?php

namespace App\Http\Resources;

use App\Enums\SaleStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
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
            'contact' => $this->contact,
            'address' => $this->address,
            'customer_logo_url' => $this->customer_logo_url,
            'selected_products' => ProductResource::collection($this->whenLoaded('selectedProducts')),
            'sales' => $this->whenLoaded('sales'),
            'delivered' => $this->whenLoaded('sales', function () {
                return $this->sales->where('status', SaleStatus::Delivered)->map(function ($sale) {
                    return [
                        'id' => $sale->id,
                        'productionLineId' => $sale->production_line_id,
                        'customerId' => $sale->customer_id,
                        'quantity' => $sale->quantity,
                    ];
                })->values();
            }),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
