<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class LogoUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && preg_match('~\A/(?!/)[a-zA-Z0-9/_.%\-]+\z~', $value)) {
            return;
        }
        if (is_string($value) && filter_var($value, FILTER_VALIDATE_URL) && in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true)) {
            return;
        }
        $fail('The :attribute must be an HTTP(S) URL or an absolute local image path.');
    }
}
