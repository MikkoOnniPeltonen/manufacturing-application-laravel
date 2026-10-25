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

    protected function prepareForValidation(): void
    {
        if (in_array($this->input('search_mode'), ['true', 'false'], true)) {
            $this->merge(['search_mode' => $this->input('search_mode') === 'true']);
        }
    }

    public function rules(): array
    {
        return [
            'timestamp' => 'nullable|date',
            'search_mode' => 'nullable|boolean',
            'start_date' => 'nullable|date',
            'end_date' => ['nullable', 'date', Rule::when($this->filled('start_date'), 'after_or_equal:start_date')],
            'product_name' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'status' => ['nullable', Rule::enum(SaleStatus::class)],
            'min_quantity' => 'nullable|integer|min:0',
            'max_quantity' => ['nullable', 'integer', 'min:0', Rule::when($this->filled('min_quantity'), 'gte:min_quantity')],
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ];
    }
}
