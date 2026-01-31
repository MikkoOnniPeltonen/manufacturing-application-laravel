<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductionItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-production'); // Matches RoleSeeder
    }

    public function rules(): array
    {
        return [
            'sale_ids' => 'required|array',
            'sale_ids.*' => 'uuid',
            'status' => 'required|in:pending,in_production,completed',
        ];
    }
}
