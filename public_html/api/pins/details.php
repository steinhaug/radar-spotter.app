<?php
// /api/pins/{id}/details.php - Get detailed PIN information

#echo "Current working directory: " . getcwd() . "\n";
#echo "__DIR__ = " . __DIR__ . "\n";
#exit();

require_once '../common.php';

setJsonHeaders();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

try {
    $pinId = $_GET['id'] ?? null;
    
    if (!$pinId) {
        errorResponse('Missing PIN ID');
    }
    
    // Get PIN details from mock data
    $details = getPinDetails($pinId);
    
    if (!$details) {
        errorResponse('PIN not found', 404);
    }
    
    // Add some additional mock data
    $details['last_updated'] = getCurrentTimestamp();
    $details['verification_count'] = rand(5, 50);
    $details['accuracy_rating'] = round(rand(80, 98) / 100, 2);
    
    // Log the request
    logActivity('pin_details_requested', [
        'pin_id' => $pinId,
        'timestamp' => getCurrentTimestamp()
    ]);
    
    successResponse($details);
    
} catch (Exception $e) {
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}
?>