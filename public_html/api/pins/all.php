<?php
// /api/pins/all.php - Get all active pins

require_once '../common.php';

setJsonHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $pins = getMockPins();
    
    // Filter only active pins
    $activePins = array_filter($pins, function($pin) {
        return $pin['status'] === 'active';
    });
    
    // Reset array keys after filtering
    $activePins = array_values($activePins);
    
    $response = [
        'pins' => $activePins,
        'timestamp' => getCurrentTimestamp(),
        'total_count' => count($activePins)
    ];
    
    // Log the request
    logActivity('pins_all_requested', [
        'pin_count' => count($activePins),
        'timestamp' => getCurrentTimestamp()
    ]);
    
    successResponse($response);
    
} catch (Exception $e) {
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}
?>