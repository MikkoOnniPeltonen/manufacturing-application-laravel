<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);
        if (! app()->environment(['local', 'testing']) || ! config('app.demo_mode')) {
            return;
        }
        $this->call([
            UserSeeder::class,
            ProductionLineSeeder::class,
            ProductSeeder::class,
            CustomerSeeder::class,
        ]);
    }
}
