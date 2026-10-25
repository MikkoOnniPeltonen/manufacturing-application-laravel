<?php

return [
    'error_webhook_url' => env('ERROR_WEBHOOK_URL'),
    'heartbeat_max_age' => (int) env('OPS_HEARTBEAT_MAX_AGE', 300),
    'backup_max_age' => (int) env('OPS_BACKUP_MAX_AGE', 172800),
];
