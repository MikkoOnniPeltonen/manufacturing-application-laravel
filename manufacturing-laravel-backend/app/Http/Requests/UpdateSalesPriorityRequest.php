<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSalesPriorityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-sales'); // Matches RoleSeeder
    }

    public function rules(): array
    {
        return [
            'sale_ids' => 'required|array',
            'sale_ids.*' => 'uuid|exists:sales,id',
        ];
    }
}
