<?php
// /api/error.php - Handle undefined routes

require_once 'common.php';

setJsonHeaders();

$route = $_GET['route'] ?? 'unknown';

// Log the 404 request
logActivity('api_404', [
    'requested_route' => $route,
    'method' => $_SERVER['REQUEST_METHOD'],
    'query_string' => $_SERVER['QUERY_STRING'] ?? '',
    'timestamp' => getCurrentTimestamp()
]);

http_response_code(404);

echo json_encode([
    'error' => 'API endpoint not found',
    'requested_route' => $route,
    'available_endpoints' => [
        'GET /api/pins/all' => 'Get all active pins',
        'GET /api/pins/changes?since=TIMESTAMP' => 'Get pin changes since timestamp',
        'GET /api/pins/{id}/details' => 'Get detailed pin information',
        'POST /api/route/scan' => 'Scan route for pins',
        'POST /api/reports/pin-alert' => 'Report pin alert/notification',
        'POST /api/reports/route-created' => 'Report route creation'
    ],
    'documentation' => 'https://your-domain.com/api/docs',
    'timestamp' => getCurrentTimestamp()
]);
?>