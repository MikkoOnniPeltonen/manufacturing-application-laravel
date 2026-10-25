<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', fn (Blueprint $t) => $t->timestamp('cancelled_at')->nullable());
        Schema::create('audit_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('actor_name');
            $t->string('subject_type', 40);
            $t->string('subject_id', 64);
            $t->string('action', 80);
            $t->string('reason', 500);
            $t->json('before')->nullable();
            $t->json('after')->nullable();
            $t->timestamp('created_at');
            $t->index(['subject_type', 'subject_id', 'id']);
        });
        Schema::create('production_runs', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('production_line_id')->constrained();
            $t->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('status', 20)->default('queued');
            $t->unsignedInteger('total_count');
            $t->unsignedInteger('processed_count')->default(0);
            $t->string('last_error')->nullable();
            $t->timestamp('dispatched_at')->nullable();
            $t->timestamp('started_at')->nullable();
            $t->timestamp('finished_at')->nullable();
            $t->timestamps();
            $t->index(['production_line_id', 'status']);
        });
        Schema::create('production_run_items', function (Blueprint $t) {
            $t->id();
            $t->foreignUuid('production_run_id')->constrained()->cascadeOnDelete();
            $t->foreignUuid('sale_id')->constrained('sales')->restrictOnDelete();
            $t->unsignedInteger('position');
            $t->timestamp('processed_at')->nullable();
            $t->unique(['production_run_id', 'sale_id']);
        });
        Schema::create('operation_signals', function (Blueprint $t) {
            $t->string('name')->primary();
            $t->timestamp('seen_at');
            $t->json('details')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operation_signals');
        Schema::dropIfExists('production_run_items');
        Schema::dropIfExists('production_runs');
        Schema::dropIfExists('audit_events');
        Schema::table('sales', fn (Blueprint $t) => $t->dropColumn('cancelled_at'));
    }
};
