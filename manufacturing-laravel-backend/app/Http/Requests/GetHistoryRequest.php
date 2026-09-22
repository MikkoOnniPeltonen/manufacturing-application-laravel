<?php

namespace App\Http\Requests;

use App\Enums\SaleStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'search_mode' => 'nullable|boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'product_name' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'status' => ['nullable', Rule::enum(SaleStatus::class)],
            'min_quantity' => 'nullable|integer|min:0',
            'max_quantity' => 'nullable|integer|min:0|gte:min_quantity',
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ];
    }
}
