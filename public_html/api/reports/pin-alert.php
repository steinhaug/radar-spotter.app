<?php
// /api/reports/pin-alert.php - Report PIN alert/notification

require_once '../common.php';

setJsonHeaders();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Method not allowed', 405);
}

try {
    $input = getJsonInput();
    
    // Validate required fields
    $requiredFields = ['pin_id', 'user_id', 'location', 'timestamp', 'context'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field])) {
            errorResponse("Missing required field: $field");
        }
    }
    
    // Validate location structure
    if (!isset($input['location']['lat']) || !isset($input['location']['lng'])) {
        errorResponse('Invalid location format. Required: {lat, lng}');
    }
    
    // Validate context
    $validContexts = ['proximity', 'route_planning'];
    if (!in_array($input['context'], $validContexts)) {
        errorResponse('Invalid context. Must be: proximity or route_planning');
    }
    
    // Create report entry
    $report = [
        'report_id' => generateUUID(),
        'pin_id' => $input['pin_id'],
        'user_id' => $input['user_id'],
        'location' => [
            'lat' => floatval($input['location']['lat']),
            'lng' => floatval($input['location']['lng'])
        ],
        'context' => $input['context'],
        'client_timestamp' => $input['timestamp'],
        'server_timestamp' => getCurrentTimestamp(),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    // Add optional fields if present
    if (isset($input['distance'])) {
        $report['distance'] = floatval($input['distance']);
    }
    
    if (isset($input['speed'])) {
        $report['speed'] = floatval($input['speed']);
    }
    
    if (isset($input['heading'])) {
        $report['heading'] = floatval($input['heading']);
    }
    
    // Mock: Check for duplicate reports (in real system, check database)
    // For now, just log and accept all reports
    
    // Log the report
    logActivity('pin_alert_reported', $report);
    
    // Mock: Save to "database" (in real system, insert into database)
    // For now, save to separate file
    $reportFile = __DIR__ . '/../logs/pin_alerts.json';
    
    $existingReports = [];
    if (file_exists($reportFile)) {
        $existingReports = json_decode(file_get_contents($reportFile), true) ?: [];
    }
    
    $existingReports[] = $report;
    file_put_contents($reportFile, json_encode($existingReports, JSON_PRETTY_PRINT));
    
    // Mock response with analytics
    $response = [
        'success' => true,
        'report_id' => $report['report_id'],
        'pin_id' => $input['pin_id'],
        'timestamp' => getCurrentTimestamp(),
        'analytics' => [
            'total_reports_today' => count($existingReports), // Mock: would be real DB query
            'user_reports_today' => rand(1, 5), // Mock: count for this user today
            'pin_reports_today' => rand(1, 10) // Mock: count for this pin today
        ]
    ];
    
    successResponse($response);
    
} catch (Exception $e) {
    errorResponse('Internal server error: ' . $e->getMessage(), 500);
}
?>