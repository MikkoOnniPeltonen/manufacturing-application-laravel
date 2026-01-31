<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateSalesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-sales'); // Matches RoleSeeder
    }

    public function rules(): array
    {
        return [
            'production_line_id' => 'required|exists:production_lines,id',
            'count' => 'integer|min:1|max:20',
        ];
    }
}
