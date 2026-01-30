<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ResetDemoData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reset:demo';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset the database to a clean demo state by clearing transaction data.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Resetting demo data...');

        Schema::disableForeignKeyConstraints();

        DB::table('production_logs')->truncate();
        DB::table('sales')->truncate();
        DB::table('customer_product')->truncate();

        DB::table('production_lines')->update(['has_sales' => false]);

        Schema::enableForeignKeyConstraints();

        $this->info('Demo data reset successfully!');
    }
}
