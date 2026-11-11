<?php

namespace Database\Seeders;

use App\Models\Instructor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $instructor = User::updateOrCreate(
            ['email' => 'instructor@gmail.com'],
            [
                'name' => 'instructor',
                'password' => Hash::make('instructor@gmail.com'),
                'role' => 'instructor',
                'email_verified_at' => now(),
            ]
        );

        $clint = User::updateOrCreate(
            ['email' => 'client@gmail.com'],
            [
                'name' => 'client',
                'password' => Hash::make('client@gmail.com'),
                'role' => 'client',
                'email_verified_at' => now(),
            ]
        );

        // Create Admin user
        $admin = User::updateOrCreate(
            ['email' => 'Ammar@winduo.online'],
            [
                'name' => 'admin',
                'password' => Hash::make('Ammar@2006'),
                'role' => 'admin',
                'email_verified_at' => now(),

            ]
        );
        Instructor::updateOrCreate(
            ['user_id' => $instructor->id],
            [
                'bio' => 'I am an instructor',
                'certifications' => 'I have certifications',
                'experience_years' => 5,
                'location' => 'Colombo',
                'languages' => ['English'],
                'hourly_rate' => 100,
                'daily_rate' => 500,
                'is_freelance' => true,
                'status' => 'approved',
                'is_active' => true,
            ]
        );

        $this->call([
            AdminSeeder::class,
            SchoolPackageSeeder::class,
        ]);
    }
}
