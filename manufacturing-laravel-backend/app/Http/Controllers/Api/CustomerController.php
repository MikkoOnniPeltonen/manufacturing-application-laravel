<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        $customers = Customer::with(['selectedProducts', 'sales'])->get();
        return response()->json(CustomerResource::collection($customers));
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $customer = Customer::create($validated);

        if ($request->has('selected_product_ids')) {
            $customer->selectedProducts()->sync($request->input('selected_product_ids'));
        }

        return response()->json(new CustomerResource($customer->load('selectedProducts')), 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        return response()->json(new CustomerResource($customer->load(['selectedProducts', 'sales'])));
    }

    public function update(StoreCustomerRequest $request, Customer $customer): JsonResponse
    {
        $validated = $request->validated();
        $customer->update($validated);

        if ($request->has('selected_product_ids')) {
            $customer->selectedProducts()->sync($request->input('selected_product_ids'));
        }

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
