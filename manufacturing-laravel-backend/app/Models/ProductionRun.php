<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ProductionRun extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = ['total_count' => 'integer', 'processed_count' => 'integer', 'started_at' => 'datetime', 'finished_at' => 'datetime', 'dispatched_at' => 'datetime'];
}
