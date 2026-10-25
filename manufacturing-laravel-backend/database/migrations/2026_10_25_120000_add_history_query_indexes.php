<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_logs', function (Blueprint $table) {
            $table->index(['sale_id', 'created_at', 'id'], 'production_logs_snapshot_index');
        });
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['customer_id', 'production_line_id', 'status'], 'sales_customer_summary_index');
        });
    }

    public function down(): void
    {
        Schema::table('production_logs', fn (Blueprint $table) => $table->dropIndex('production_logs_snapshot_index'));
        Schema::table('sales', fn (Blueprint $table) => $table->dropIndex('sales_customer_summary_index'));
    }
};
