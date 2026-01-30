<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define permissions
        $allPermissions = [
            'view-production-lines',
            'manage-production-lines',
            'manage-sales',
            'manage-production',
            'view-customers',
            'manage-customers',
        ];

        // Create all permissions first
        foreach ($allPermissions as $permissionName) {
            Permission::create(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // Force refresh the cache after creating permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create Manager role with production permissions
        $manager = Role::create(['name' => 'manager', 'guard_name' => 'web']);
        $manager->givePermissionTo([
            'view-production-lines',
            'manage-production-lines',
            'manage-sales',
            'manage-production',
        ]);

        // Create Admin role with all permissions
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $admin->givePermissionTo($allPermissions);
    }
}
