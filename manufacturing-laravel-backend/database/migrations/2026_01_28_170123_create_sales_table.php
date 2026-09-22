<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('product_id')->constrained();
            $table->foreignId('customer_id')->constrained();
            $table->foreignId('production_line_id')->constrained();
            $table->integer('quantity');
            $table->date('date_to_deliver');
            $table->string('status')->default('pending'); // pending, in_production, completed
            $table->timestamps();
            $table->softDeletes();

            $table->index(['production_line_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
