<?php

namespace App\Models;

use App\Enums\SaleStatus;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/** @property Carbon|null $cancelled_at */
class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'product_id',
        'customer_id',
        'production_line_id',
        'quantity',
        'date_to_deliver',
        'status',
        'priority',
        'delivered_at',
        'cancelled_at',
    ];

    protected $casts = [
        'date_to_deliver' => 'date',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'quantity' => 'integer',
        'status' => SaleStatus::class,
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->id = (string) Str::uuid();
        });
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    /** @return BelongsTo<ProductionLine, $this> */
    public function productionLine(): BelongsTo
    {
        return $this->belongsTo(ProductionLine::class)->withTrashed();
    }

    /** @return HasMany<AuditEvent, $this> */
    public function auditEvents(): HasMany
    {
        return $this->hasMany(AuditEvent::class, 'subject_id')->where('subject_type', 'sale');
    }

    /** @return HasMany<ProductionLog, $this> */
    public function productionLogs(): HasMany
    {
        return $this->hasMany(ProductionLog::class);
    }
}
