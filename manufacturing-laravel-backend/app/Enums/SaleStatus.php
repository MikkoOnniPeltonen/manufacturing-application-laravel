<?php

namespace App\Enums;

enum SaleStatus: string
{
    case Pending = 'pending';
    case InProduction = 'in_production';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /**
     * Determine whether this status can transition to the target status.
     */
    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Pending => in_array($target, [self::InProduction, self::Cancelled], true),
            self::InProduction => $target === self::Delivered,
            self::Delivered, self::Cancelled => false,
        };
    }
}
