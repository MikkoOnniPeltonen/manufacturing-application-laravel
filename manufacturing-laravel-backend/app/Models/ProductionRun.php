<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $production_line_id
 * @property string $status
 * @property int $total_count
 * @property int $processed_count
 * @property string|null $last_error
 * @property Carbon $created_at
 * @property Carbon|null $started_at
 * @property Carbon|null $finished_at
 */
class ProductionRun extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = ['total_count' => 'integer', 'processed_count' => 'integer', 'started_at' => 'datetime', 'finished_at' => 'datetime', 'dispatched_at' => 'datetime'];
}
