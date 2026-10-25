<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'customer_logo_url',
        'contact',
        'address',
    ];

    /** @return BelongsToMany<Product, $this> */
    public function selectedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }

    /** @return HasMany<Sale, $this> */
    public function salesSummary(): HasMany
    {
        return $this->hasMany(Sale::class)->selectRaw('customer_id, production_line_id, status, SUM(quantity) AS quantity')
            ->groupBy('customer_id', 'production_line_id', 'status');
    }

    /** @return HasMany<Sale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
