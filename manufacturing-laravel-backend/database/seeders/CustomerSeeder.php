<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'name' => 'Buy you a coffee',
                'customer_logo_url' => '/images/coffee.png',
                'contact' => 'The man',
                'address' => 'The Star Avenue 1',
            ],
            [
                'name' => 'Decompressed Coffee house',
                'customer_logo_url' => '/images/house.png',
                'contact' => "It's too Latte to answer",
                'address' => 'The House that Decaf built',
            ],
            [
                'name' => 'Cultured Couture Juice',
                'customer_logo_url' => '/images/juice.png',
                'contact' => 'Keeps changing',
                'address' => 'Juicy World',
            ],
            [
                'name' => 'Soup is all you need',
                'customer_logo_url' => '/images/soup.png',
                'contact' => 'Stilness',
                'address' => 'Where your heart is',
            ],
            [
                'name' => "Haven't thought of it yet",
                'customer_logo_url' => '/images/havent.png',
                'contact' => 'Yeti',
                'address' => 'The Himalayas',
            ],
        ];

        foreach ($customers as $customer) {
            Customer::create($customer);
        }
    }
}
