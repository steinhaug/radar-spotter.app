<?php
// /api/pins/changes.php - Get PIN changes since timestamp

require_once '../common.php';

setJsonHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $since = $_GET['since'] ?? null;
    
    if (!$since) {
        errorResponse('Missing required parameter: since');
    }
    
    // Validate timestamp format
    $sinceTimestamp = strtotime($since);
    if ($sinceTimestamp === false) {
        errorResponse('Invalid timestamp format. Use ISO 8601 format.');
    }
    
    // Mock: simulate changes based on timestamp
    $currentTime = time();
    $timeDiff = $currentTime - $sinceTimestamp;
    
    $added = [];
    $updated = [];
    $deleted = [];
    
    // Simulate new pins added in last hour
    if ($timeDiff < 3600) { // less than 1 hour
        $added = [
            [
                'id' => 'pin-new-001',
                'type' => 'accident',
                'status' => 'active',
                'lat' => 58.1700,
                'lng' => 8.0100,
                'created_at' => date('Y-m-d\TH:i:s\Z', $currentTime - 1800), // 30 min ago
                'updated_at' => date('Y-m-d\TH:i:s\Z', $currentTime - 1800)
            ]
        ];
    }
    
    // Simulate updated pins in last 2 hours  
    if ($timeDiff < 7200) { // less than 2 hours
        $updated = [
            [
                'id' => 'pin-001',
                'type' => 'radar',
                'status' => 'active',
                'lat' => 58.1467,
                'lng' => 8.0059,
                'created_at' => '2025-01-01T10:00:00Z',
                'updated_at' => date('Y-m-d\TH:i:s\Z', $currentTime - 3600) // 1 hour ago
            ]
        ];
    }
    
    // Simulate deleted pins in last 6 hours
    if ($timeDiff < 21600) { // less than 6 hours
        $deleted = ['pin-old-001', 'pin-old-002'];
    }
    
    $response = [
        'added' => $added,
        'updated' => $updated, 
        'deleted' => $deleted,
        'timestamp' => getCurrentTimestamp(),
        'since_requested' => $since,
        'changes_found' => count($added) + count($updated) + count($deleted)
    ];
    
    // Log the request
    logActivity('pins_changes_requested', [
        'since' => $since,
        'changes_count' => $response['changes_found'],
        'timestamp' => getCurrentTimestamp()
    ]);
    
    successResponse($response);
    
} catch (Exception $e) {
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}
?>