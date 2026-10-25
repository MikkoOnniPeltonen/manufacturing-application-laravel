<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quantity' => 'required|integer|min:1|max:1000000',
            'date_to_deliver' => 'required|date_format:Y-m-d|after_or_equal:today',
            'reason' => 'required|string|min:3|max:500',
        ];
    }
}
