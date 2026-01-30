<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            // Coffee Products (Production Line 1)
            ['name' => 'Cappuccino', 'production_line_id' => 1, 'description' => "Ain't this something!"],
            ['name' => 'Americano', 'production_line_id' => 1, 'description' => 'That is mine, begone!'],
            ['name' => 'Espresso', 'production_line_id' => 1, 'description' => 'Impressive taste, I can tell you that.'],
            ['name' => 'Double Espresso', 'production_line_id' => 1, 'description' => 'On the count of three..'],

            // Iced Tea Products (Production Line 2)
            ['name' => 'Mango', 'production_line_id' => 2, 'description' => 'Bring a friend, takes two to get to the bottom of it!'],
            ['name' => 'Peach', 'production_line_id' => 2, 'description' => "Didn't really catch me as being in the mood for something sweet."],
            ['name' => 'Mint', 'production_line_id' => 2, 'description' => "Oh, you got yours already, I've been waiting mine for months!"],
            ['name' => 'Pineapple', 'production_line_id' => 2, 'description' => "Doesn't taste that bad. Doesn't taste that bad!"],

            // Soup Products (Production Line 3)
            ['name' => 'Salty Liquorice', 'production_line_id' => 3, 'description' => 'Just finn-ish it already!'],
            ['name' => 'White Chocolate', 'production_line_id' => 3, 'description' => 'I believe this is yours.'],
            ['name' => 'Whip Cream', 'production_line_id' => 3, 'description' => 'You can leave it to me.'],
            ['name' => 'Asparagus with lemon', 'production_line_id' => 3, 'description' => "Must've been a mistake. Order in?"],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }
    }
}
