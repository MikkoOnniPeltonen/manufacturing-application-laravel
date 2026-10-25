<?php

namespace App\Console\Commands;

use App\Models\ProductionRun;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

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

        if (! app()->environment(['local', 'testing']) || ! config('app.demo_mode')) {
            $this->error('Demo reset is disabled in this environment.');

            return self::FAILURE;
        }

        if (ProductionRun::whereIn('status', ['queued', 'running'])->exists()) {
            $this->error('Finish active production runs before resetting demo data.');

            return self::FAILURE;
        }
        DB::transaction(function () {
            DB::table('production_run_items')->delete();
            DB::table('production_runs')->delete();
            DB::table('production_logs')->delete();
            DB::table('sales')->delete();
            DB::table('customer_product')->delete();
            DB::table('production_lines')->update(['has_sales' => false]);
        });

        $this->info('Demo data reset successfully!');
    }
}
