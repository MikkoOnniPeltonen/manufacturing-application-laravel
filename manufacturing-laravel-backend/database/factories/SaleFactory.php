<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // These will usually be overwritten in tests, but good to have defaults
            'production_line_id' => ProductionLine::factory(),
            'product_id' => Product::factory(),
            'customer_id' => Customer::factory(),
            'quantity' => fake()->numberBetween(10, 100),
            'date_to_deliver' => fake()->dateTimeBetween('now', '+1 month'),
            'status' => 'pending',
            'priority' => 0,
        ];
    }
}
