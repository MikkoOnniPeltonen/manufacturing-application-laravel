<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function paginateCollection(Request $request, $query, int $defaultLimit = 25, int $maxLimit = 100)
    {
        if (! $request->hasAny(['limit', 'per_page', 'page'])) {
            return $query->get();
        }

        $limit = (int) ($request->input('limit', $request->input('per_page', $defaultLimit)));
        $page = max(1, (int) $request->input('page', 1));

        if ($limit < 1) {
            $limit = $defaultLimit;
        }

        return $query->paginate(min($limit, $maxLimit), ['*'], 'page', $page);
    }

    protected function paginatedResourceResponse(Request $request, $query, string $resourceClass, int $defaultLimit = 25, int $maxLimit = 100)
    {
        $result = $this->paginateCollection($request, $query, $defaultLimit, $maxLimit);

        if ($result instanceof LengthAwarePaginator) {
            return response()->json([
                'data' => $resourceClass::collection($result->items())->resolve(),
                'current_page' => $result->currentPage(),
                'per_page' => $result->perPage(),
                'total' => $result->total(),
                'last_page' => $result->lastPage(),
                'from' => $result->firstItem(),
                'to' => $result->lastItem(),
            ]);
        }

        return response()->json($resourceClass::collection($result));
    }
}
