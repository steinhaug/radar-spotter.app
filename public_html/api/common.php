<?php
// /api/common.php - Shared utilities and mock data

// Set JSON response headers
function setJsonHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

// Generate UUID v4
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Mock PIN data for Norway
function getMockPins() {
    return [
        // Agder region
        [
            'id' => 'pin-001',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 58.1467,
            'lng' => 8.0059,
            'created_at' => '2025-01-01T10:00:00Z',
            'updated_at' => '2025-01-01T10:00:00Z'
        ],
        [
            'id' => 'pin-002', 
            'type' => 'radar',
            'status' => 'active',
            'lat' => 58.1599,
            'lng' => 7.9956,
            'created_at' => '2025-01-01T11:00:00Z',
            'updated_at' => '2025-01-01T11:00:00Z'
        ],
        [
            'id' => 'pin-003',
            'type' => 'accident',
            'status' => 'active', 
            'lat' => 58.1525,
            'lng' => 8.0194,
            'created_at' => '2025-01-01T12:00:00Z',
            'updated_at' => '2025-01-01T12:00:00Z'
        ],
        
        // Oslo region
        [
            'id' => 'pin-004',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 59.9139,
            'lng' => 10.7522,
            'created_at' => '2025-01-01T13:00:00Z',
            'updated_at' => '2025-01-01T13:00:00Z'
        ],
        [
            'id' => 'pin-005',
            'type' => 'radar', 
            'status' => 'active',
            'lat' => 59.9311,
            'lng' => 10.7579,
            'created_at' => '2025-01-01T14:00:00Z',
            'updated_at' => '2025-01-01T14:00:00Z'
        ],
        
        // Bergen region
        [
            'id' => 'pin-006',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 60.3913,
            'lng' => 5.3221,
            'created_at' => '2025-01-01T15:00:00Z',
            'updated_at' => '2025-01-01T15:00:00Z'
        ],
        
        // Trondheim region
        [
            'id' => 'pin-007',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 63.4305,
            'lng' => 10.3951,
            'created_at' => '2025-01-01T16:00:00Z',
            'updated_at' => '2025-01-01T16:00:00Z'
        ],
        
        // Mandal (for testing route)
        [
            'id' => 'pin-008',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 58.0294,
            'lng' => 7.4609,
            'created_at' => '2025-01-01T17:00:00Z',
            'updated_at' => '2025-01-01T17:00:00Z'
        ],
        
        // Sweden border (for Halden users)
        [
            'id' => 'pin-009',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 59.1372,
            'lng' => 11.4095, // Just across Swedish border
            'created_at' => '2025-01-01T18:00:00Z',
            'updated_at' => '2025-01-01T18:00:00Z'
        ],
        
        // E18 corridor pins
        [
            'id' => 'pin-010',
            'type' => 'radar',
            'status' => 'active',
            'lat' => 59.2833,
            'lng' => 10.9167, // Fredrikstad area
            'created_at' => '2025-01-01T19:00:00Z',
            'updated_at' => '2025-01-01T19:00:00Z'
        ]
    ];
}

// PIN details for notifications  
function getPinDetails($pinId) {
    $details = [
        'pin-001' => [
            'id' => 'pin-001',
            'name' => 'E18 Kristiansand Sør',
            'description' => 'Automatisk trafikkontroll',
            'speed_limit' => 80,
            'location_details' => 'Ved avkjøring til Vågsbygd',
            'type' => 'radar',
            'direction' => 'begge retninger'
        ],
        'pin-002' => [
            'id' => 'pin-002', 
            'name' => 'Vågsbygd sentrum',
            'description' => 'Mobil politikontroll',
            'speed_limit' => 50,
            'location_details' => 'Slettheiaveien',
            'type' => 'radar',
            'direction' => 'begge retninger'
        ],
        'pin-008' => [
            'id' => 'pin-008',
            'name' => 'Mandal E39',
            'description' => 'Automatisk trafikkontroll', 
            'speed_limit' => 90,
            'location_details' => 'Innkjøring til Mandal',
            'type' => 'radar',
            'direction' => 'begge retninger'
        ]
    ];
    
    return $details[$pinId] ?? null;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance($lat1, $lng1, $lat2, $lng2) {
    $earthRadius = 6371000; // meters
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    
    $a = sin($dLat/2) * sin($dLat/2) + 
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
         sin($dLng/2) * sin($dLng/2);
    
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    
    return $earthRadius * $c;
}

// Log activity to file (for mock reporting)
function logActivity($type, $data) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'type' => $type,
        'data' => $data,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    $logFile = __DIR__ . '/logs/activity.log';
    
    // Create logs directory if it doesn't exist
    if (!is_dir(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    
    file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND | LOCK_EX);
}

// Get current timestamp in ISO 8601 format
function getCurrentTimestamp() {
    return date('Y-m-d\TH:i:s\Z');
}

// Validate JSON input
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit();
    }
    
    return $data;
}

// Error response helper
function errorResponse($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit();
}

// Success response helper  
function successResponse($data) {
    echo json_encode($data);
    exit();
}
?>