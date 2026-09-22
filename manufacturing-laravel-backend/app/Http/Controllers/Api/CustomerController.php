<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $customers = Customer::with(['selectedProducts', 'sales']);

        return $this->paginatedResourceResponse($request, $customers, CustomerResource::class, 25, 100);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = DB::transaction(function () use ($request): Customer {
            $customer = Customer::create($request->validated());
            $customer->selectedProducts()->sync($request->input('selected_product_ids', []));

            return $customer;
        });

        return response()->json(new CustomerResource($customer->load('selectedProducts')), 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json(new CustomerResource($customer->load(['selectedProducts', 'sales'])));
    }

    public function update(StoreCustomerRequest $request, Customer $customer): JsonResponse
    {
        DB::transaction(function () use ($request, $customer): void {
            $customer->update($request->validated());
            $customer->selectedProducts()->sync($request->input('selected_product_ids', []));
        });

        return response()->json(new CustomerResource($customer->load('selectedProducts')));
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return response()->json(null, 204);
    }

    public function attachProduct(Customer $customer, Product $product): JsonResponse
    {
        $customer->selectedProducts()->syncWithoutDetaching([$product->id]);

        return response()->json(new CustomerResource($customer->load('selectedProducts')));
    }

    public function detachProduct(Customer $customer, Product $product): JsonResponse
    {
        $customer->selectedProducts()->detach($product->id);

        return response()->json(new CustomerResource($customer->load('selectedProducts')));
    }
}
