<?php
// config.php - Simple application configuration

// MapBox API token
define('MAPBOX_TOKEN', 'pk.eyJ1IjoiYm9zc21hbjc1ODEiLCJhIjoiY2xmb3E5bHQ3MHVpYzN1bWhmaWoyN3h2OSJ9.mPV4SK4sSBApOHp6evb78A');

// API endpoints
define('API_BASE_URL', '/api/');

// Default map center (Kristiansand)
define('DEFAULT_CENTER_LNG', 8.0059);
define('DEFAULT_CENTER_LAT', 58.1467);
define('DEFAULT_ZOOM', 12);

// Application settings
define('APP_VERSION', '1.0.0');
define('ENVIRONMENT', 'development');

// Feature flags
define('ENABLE_GPS', true);
define('ENABLE_SIMULATION', true);
define('ENABLE_BACKEND_REPORTING', true);
define('ENABLE_LOCAL_STORAGE', true);

// System limits
define('MAX_PINS', 1000);
define('PROXIMITY_RADIUS', 2000);
define('REPORTING_WINDOW', 86400);
?>