<?php
// /api/route/scan.php - Scan route for pins

require_once '../common.php';

setJsonHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

try {
    $input = getJsonInput();
    
    // Validate required fields
    if (!isset($input['geometry']) || !isset($input['geometry']['coordinates'])) {
        errorResponse('Missing route geometry');
    }
    
    $routeCoordinates = $input['geometry']['coordinates'];
    $tolerance = $input['tolerance'] ?? 500; // default 500 meters
    
    if (!is_array($routeCoordinates) || empty($routeCoordinates)) {
        errorResponse('Invalid route geometry');
    }
    
    // Get all active pins
    $allPins = getMockPins();
    $activePins = array_filter($allPins, function($pin) {
        return $pin['status'] === 'active';
    });
    
    $pinsOnRoute = [];
    $totalDistance = 0;
    
    // Calculate total route distance and find pins within tolerance
    for ($i = 0; $i < count($routeCoordinates) - 1; $i++) {
        $coord1 = $routeCoordinates[$i];
        $coord2 = $routeCoordinates[$i + 1];
        
        // Add to total distance
        $segmentDistance = calculateDistance($coord1[1], $coord1[0], $coord2[1], $coord2[0]);
        $totalDistance += $segmentDistance;
        
        // Check each pin against this route segment
        foreach ($activePins as $pin) {
            // Simple distance check to route points (not perfect but good for mock)
            $distanceToPoint1 = calculateDistance($pin['lat'], $pin['lng'], $coord1[1], $coord1[0]);
            $distanceToPoint2 = calculateDistance($pin['lat'], $pin['lng'], $coord2[1], $coord2[0]);
            
            $minDistance = min($distanceToPoint1, $distanceToPoint2);
            
            if ($minDistance <= $tolerance) {
                // Check if pin already added
                $alreadyAdded = false;
                foreach ($pinsOnRoute as $existingPin) {
                    if ($existingPin['id'] === $pin['id']) {
                        $alreadyAdded = true;
                        break;
                    }
                }
                
                if (!$alreadyAdded) {
                    $pinWithDistance = $pin;
                    $pinWithDistance['distance_from_route'] = round($minDistance);
                    $pinWithDistance['route_segment'] = $i;
                    $pinsOnRoute[] = $pinWithDistance;
                }
            }
        }
    }
    
    // Sort pins by route segment (order they appear on route)
    usort($pinsOnRoute, function($a, $b) {
        return $a['route_segment'] <=> $b['route_segment'];
    });
    
    // Estimate travel time (assuming average 70 km/h)
    $estimatedTime = round(($totalDistance / 1000) / 70 * 3600); // seconds
    
    $response = [
        'pins_on_route' => $pinsOnRoute,
        'total_distance' => round($totalDistance),
        'estimated_time' => $estimatedTime,
        'tolerance_used' => $tolerance,
        'route_points_analyzed' => count($routeCoordinates),
        'pins_found' => count($pinsOnRoute),
        'timestamp' => getCurrentTimestamp()
    ];
    
    // Log the request
    logActivity('route_scan_requested', [
        'route_points' => count($routeCoordinates),
        'total_distance' => $totalDistance,
        'pins_found' => count($pinsOnRoute),
        'tolerance' => $tolerance,
        'timestamp' => getCurrentTimestamp()
    ]);
    
    successResponse($response);
    
} catch (Exception $e) {
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}
?>