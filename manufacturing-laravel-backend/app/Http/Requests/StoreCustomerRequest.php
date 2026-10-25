<?php

namespace App\Http\Requests;

use App\Rules\LogoUrl;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'contact' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'customer_logo_url' => ['nullable', 'string', 'max:2048', new LogoUrl],
            'selected_product_ids' => ['sometimes', 'array', 'max:100'],
            'selected_product_ids.*' => ['integer', 'distinct', 'exists:products,id,deleted_at,NULL'],
        ];
    }
}
