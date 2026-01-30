<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create Manager user
        $manager = User::create([
            'name' => 'Manager User',
            'email' => 'manager@manufacturing.com',
            'password' => bcrypt('SecurePass2026!'),
        ]);
        $manager->assignRole('manager');

        // Create Admin user
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@manufacturing.com',
            'password' => bcrypt('SecurePass2026!'),
        ]);
        $admin->assignRole('admin');
    }
}
