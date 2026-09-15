<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\MenuItem;
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
        User::factory()->create([
            'name' => 'Charles Renan Retes',
            'email' => 'charles@campus.test',
            'wallet_balance' => 0,
        ]);

        User::factory()->create([
            'name' => 'Alex Cruz',
            'email' => 'alex@campus.test',
            'wallet_balance' => 0,
        ]);

        MenuItem::insert([
            ['name' => 'Chicken Adobo', 'description' => 'Tender chicken, rice & egg', 'price' => 89, 'emoji' => '🍗', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Beef Tapa', 'description' => 'Sweet cured beef with garlic rice', 'price' => 105, 'emoji' => '🥩', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Pancit Canton', 'description' => 'Stir-fried noodles with vegetables', 'price' => 65, 'emoji' => '🍜', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Cheeseburger', 'description' => 'Classic burger with fries', 'price' => 75, 'emoji' => '🍔', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Iced Tea', 'description' => 'Freshly brewed and chilled', 'price' => 30, 'emoji' => '🧋', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Chocolate Cake', 'description' => 'A sweet little finish', 'price' => 45, 'emoji' => '🍰', 'is_available' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
