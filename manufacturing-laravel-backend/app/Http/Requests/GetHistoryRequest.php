<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GetHistoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Read-only usually available to authorized users
    }

    public function rules(): array
    {
        return [
            'timestamp' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'product_name' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'status' => 'nullable|string',
            'min_quantity' => 'nullable|integer|min:0',
            'max_quantity' => 'nullable|integer|min:0|gte:min_quantity',
        ];
    }
}
