<?php

namespace App\Enums;

enum SaleStatus: string
{
    case Pending = 'pending';
    case InProduction = 'in_production';
    case Delivered = 'delivered';

    /**
     * Determine whether this status can transition to the target status.
     */
    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Pending => $target === self::InProduction,
            self::InProduction => $target === self::Delivered,
            self::Delivered => false,
        };
    }
}
