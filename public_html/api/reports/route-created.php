<?php
// /api/reports/route-created.php - Report route creation

require_once '../common.php';

setJsonHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

try {
    $input = getJsonInput();
    
    // Validate required fields
    $requiredFields = ['user_id', 'start', 'destination', 'distance', 'estimated_time'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field])) {
            errorResponse("Missing required field: $field");
        }
    }
    
    // Validate start and destination structure
    foreach (['start', 'destination'] as $point) {
        if (!isset($input[$point]['lat']) || !isset($input[$point]['lng'])) {
            errorResponse("Invalid $point format. Required: {lat, lng, address}");
        }
    }
    
    // Create route report entry
    $routeReport = [
        'route_id' => generateUUID(),
        'user_id' => $input['user_id'],
        'start' => [
            'lat' => floatval($input['start']['lat']),
            'lng' => floatval($input['start']['lng']),
            'address' => $input['start']['address'] ?? 'Unknown'
        ],
        'destination' => [
            'lat' => floatval($input['destination']['lat']),
            'lng' => floatval($input['destination']['lng']),
            'address' => $input['destination']['address'] ?? 'Unknown'
        ],
        'distance' => floatval($input['distance']),
        'estimated_time' => intval($input['estimated_time']),
        'created_at' => getCurrentTimestamp(),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    // Add optional fields if present
    if (isset($input['transport_mode'])) {
        $routeReport['transport_mode'] = $input['transport_mode'];
    }
    
    if (isset($input['waypoints']) && is_array($input['waypoints'])) {
        $routeReport['waypoints'] = $input['waypoints'];
    }
    
    if (isset($input['avoid_tolls'])) {
        $routeReport['avoid_tolls'] = boolval($input['avoid_tolls']);
    }
    
    if (isset($input['avoid_highways'])) {
        $routeReport['avoid_highways'] = boolval($input['avoid_highways']);
    }
    
    // Calculate route statistics for analytics
    $routeStats = [
        'distance_km' => round($routeReport['distance'] / 1000, 2),
        'estimated_hours' => round($routeReport['estimated_time'] / 3600, 2),
        'average_speed_kmh' => round(($routeReport['distance'] / 1000) / ($routeReport['estimated_time'] / 3600), 1)
    ];
    
    $routeReport['statistics'] = $routeStats;
    
    // Log the route creation
    logActivity('route_created', $routeReport);
    
    // Mock: Save to "database" (in real system, insert into database)
    $routeFile = __DIR__ . '/../logs/route_reports.json';
    
    $existingRoutes = [];
    if (file_exists($routeFile)) {
        $existingRoutes = json_decode(file_get_contents($routeFile), true) ?: [];
    }
    
    $existingRoutes[] = $routeReport;
    file_put_contents($routeFile, json_encode($existingRoutes, JSON_PRETTY_PRINT));
    
    // Mock: Generate usage analytics
    $todayRoutes = array_filter($existingRoutes, function($route) {
        return date('Y-m-d', strtotime($route['created_at'])) === date('Y-m-d');
    });
    
    $userRoutesToday = array_filter($todayRoutes, function($route) use ($input) {
        return $route['user_id'] === $input['user_id'];
    });
    
    // Mock response with analytics
    $response = [
        'success' => true,
        'route_id' => $routeReport['route_id'],
        'user_id' => $input['user_id'],
        'timestamp' => getCurrentTimestamp(),
        'route_statistics' => $routeStats,
        'analytics' => [
            'total_routes_today' => count($todayRoutes),
            'user_routes_today' => count($userRoutesToday),
            'average_distance_today' => count($todayRoutes) > 0 ? 
                round(array_sum(array_column($todayRoutes, 'distance')) / count($todayRoutes) / 1000, 1) : 0,
            'popular_destinations' => [
                'Oslo' => rand(15, 30),
                'Bergen' => rand(10, 20),
                'Trondheim' => rand(5, 15),
                'Stavanger' => rand(8, 18)
            ]
        ]
    ];
    
    successResponse($response);
    
} catch (Exception $e) {
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}
        