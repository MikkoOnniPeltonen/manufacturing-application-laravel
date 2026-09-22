<?php

namespace Database\Factories;

use App\Models\ProductionLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductionLine>
 */
class ProductionLineFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word.' Line',
            'capacity' => fake()->numberBetween(100, 1000),
        ];
    }
}
