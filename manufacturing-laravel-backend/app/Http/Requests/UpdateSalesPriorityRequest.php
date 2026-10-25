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
            'sale_ids' => 'required|array|min:1|max:100',
            'sale_ids.*' => 'distinct|uuid|exists:sales,id',
        ];
    }
}
