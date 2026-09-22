<?php

namespace App\Http\Requests;

use App\Enums\SaleStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'status' => ['required', Rule::enum(SaleStatus::class)],
        ];
    }
}
