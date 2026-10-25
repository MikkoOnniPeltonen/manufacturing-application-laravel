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
            'sale_ids' => 'required|array|min:1|max:100',
            'sale_ids.*' => 'distinct|uuid',
            'status' => ['required', Rule::enum(SaleStatus::class)->except([SaleStatus::Cancelled])],
        ];
    }
}
