<?php

namespace Database\Seeders;

use App\Models\ProductionLine;
use Illuminate\Database\Seeder;

class ProductionLineSeeder extends Seeder
{
    public function run(): void
    {
        $productionLines = [
            [
                'name' => 'Brewed Coffee',
                'capacity' => 2500,
                'has_sales' => false,
                'product_logo_url' => 'https://www.nescafe.com/mena/sites/default/files/2023-08/Coffee%20Types%20Banner%20Desktop.jpg',
            ],
            [
                'name' => 'Iced Tea',
                'capacity' => 5000,
                'has_sales' => false,
                'product_logo_url' => 'https://images.ctfassets.net/e8bhhtr91vp3/5ij7mZQj21dZm2Sqf7z1v8/6e33c4f1ce76172d33c60e225a5f413b/worldtea_howto_icedtea_img.webp?w=1600&q=60',
            ],
            [
                'name' => 'Souped Blueberry',
                'capacity' => 1500,
                'has_sales' => false,
                'product_logo_url' => 'https://lemontreedwelling.com/wp-content/uploads/2016/07/Blueberry-Soup-5b.jpg',
            ],
        ];

        foreach ($productionLines as $line) {
            ProductionLine::create($line);
        }
    }
}
