<?php
// index.php - Main radar navigation application

// Include configuration
require_once 'config.php';

// Set content type and security headers
header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');

// Get user preferences and location if available
$defaultLat = DEFAULT_CENTER_LAT;
$defaultLng = DEFAULT_CENTER_LNG;
$defaultZoom = DEFAULT_ZOOM;

// Check for URL parameters to set initial map position
if (isset($_GET['lat']) && isset($_GET['lng'])) {
    $defaultLat = floatval($_GET['lat']);
    $defaultLng = floatval($_GET['lng']);
}

if (isset($_GET['zoom'])) {
    $defaultZoom = intval($_GET['zoom']);
}
?>
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Radar Navigation System - GPS navigasjon med radarkontroll varsling">
    <meta name="keywords" content="radar, navigasjon, GPS, fartskontroll, Norge">
    <meta name="author" content="Radar Navigation System">
    
    <title>Radar Navigation System</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Mapbox GL JS -->
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
    
    <!-- Application Styles -->
    <link rel="stylesheet" href="styles.css">
    
    <!-- Progressive Web App -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#1a1a1a">
    
    <!-- Pass PHP configuration to JavaScript -->
    <script>
        window.APP_CONFIG = {
            mapboxToken: '<?php echo MAPBOX_TOKEN; ?>',
            apiBaseUrl: '<?php echo API_BASE_URL; ?>',
            defaultCenter: [<?php echo $defaultLng; ?>, <?php echo $defaultLat; ?>],
            defaultZoom: <?php echo $defaultZoom; ?>,
            version: '<?php echo APP_VERSION; ?>',
            environment: '<?php echo ENVIRONMENT; ?>',
            features: {
                enableGPS: <?php echo ENABLE_GPS ? 'true' : 'false'; ?>,
                enableSimulation: <?php echo ENABLE_SIMULATION ? 'true' : 'false'; ?>,
                enableBackendReporting: <?php echo ENABLE_BACKEND_REPORTING ? 'true' : 'false'; ?>,
                enableLocalStorage: <?php echo ENABLE_LOCAL_STORAGE ? 'true' : 'false'; ?>
            },
            limits: {
                maxPins: <?php echo MAX_PINS; ?>,
                proximityRadius: <?php echo PROXIMITY_RADIUS; ?>,
                reportingWindow: <?php echo REPORTING_WINDOW; ?>
            }
        };
    </script>
</head>
<body>
    <!-- Loading Screen -->
    <div id="loading-screen" class="loading-overlay">
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <h2>Radar Navigation System</h2>
            <p>Initialiserer kart og GPS...</p>
            <div class="loading-progress">
                <div class="progress-bar" id="loading-progress"></div>
            </div>
        </div>
    </div>

    <!-- Main Application Container -->
    <div id="app-container" class="app-container hidden">
        
        <!-- Control Panel -->
        <div id="control-panel" class="control-panel">
            <div class="panel-header">
                <h1>🚗 Radar Navigation</h1>
                <div class="system-status" id="system-status">
                    <span class="status-dot" id="status-indicator"></span>
                    <span id="system-status-text">Initialiserer...</span>
                </div>
            </div>
            
            <!-- Navigation Controls -->
            <div class="control-group">
                <h3>📍 Navigasjon</h3>
                <div class="button-grid">
                    <button id="start-navigation" class="btn btn-primary">
                        <span class="btn-icon">▶️</span>
                        Start Navigasjon
                    </button>
                    <button id="stop-navigation" class="btn btn-secondary" disabled>
                        <span class="btn-icon">⏹️</span>
                        Stopp Navigasjon
                    </button>
                    <button id="center-map" class="btn btn-secondary">
                        <span class="btn-icon">🎯</span>
                        Sentrer Kart
                    </button>
                </div>
            </div>

            <!-- GPS Testing Controls -->
            <div class="control-group">
                <h3>🎬 GPS Simulering</h3>
                <div class="button-grid">
                    <button id="start-simulation" class="btn btn-success">
                        <span class="btn-icon">🎮</span>
                        Start Simulering
                    </button>
                    <button id="stop-simulation" class="btn btn-warning" disabled>
                        <span class="btn-icon">⏸️</span>
                        Stopp Simulering
                    </button>
                </div>
                <div class="file-controls">
                    <input type="file" id="gps-log-upload" accept=".gpx,.kml,.json" style="display: none;">
                    <button id="load-gps-log" class="btn btn-outline">
                        <span class="btn-icon">📁</span>
                        Last GPS Logg
                    </button>
                    <button id="generate-from-route" class="btn btn-outline">
                        <span class="btn-icon">🗺️</span>
                        Generer fra Rute
                    </button>
                </div>
            </div>

            <!-- PIN Controls -->
            <div class="control-group">
                <h3>📍 Radar Pins</h3>
                <div class="button-grid">
                    <button id="toggle-pins" class="btn btn-secondary">
                        <span class="btn-icon">👁️</span>
                        Vis/Skjul Pins
                    </button>
                    <button id="add-pin-mode" class="btn btn-secondary">
                        <span class="btn-icon">➕</span>
                        Legg til Pin
                    </button>
                </div>
                <div class="pin-stats" id="pin-stats">
                    <small>Pins lastet: <span id="pin-count">0</span></small>
                </div>
            </div>

            <!-- Status Display -->
            <div class="control-group">
                <h3>📊 Status</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">GPS:</span>
                        <span id="gps-status" class="status-value">Ikke tilkoblet</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Navigasjon:</span>
                        <span id="nav-status" class="status-value">Inaktiv</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Nærmeste radar:</span>
                        <span id="nearest-radar" class="status-value">Ingen</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Distanse:</span>
                        <span id="radar-distance" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Aktiv rute:</span>
                        <span id="active-route" class="status-value">Ingen</span>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="control-group">
                <h3>⚡ Hurtigvalg</h3>
                <div class="quick-actions">
                    <button class="quick-btn" data-location="Kristiansand" data-coords="[8.0059, 58.1467]">
                        📍 Kristiansand
                    </button>
                    <button class="quick-btn" data-location="Mandal" data-coords="[7.4609, 58.0294]">
                        📍 Mandal
                    </button>
                    <button class="quick-btn" data-location="Arendal" data-coords="[8.7726, 58.4616]">
                        📍 Arendal
                    </button>
                    <button class="quick-btn" data-location="Stavanger" data-coords="[5.7331, 58.9700]">
                        📍 Stavanger
                    </button>
                </div>
            </div>

            <!-- System Information -->
            <div class="control-group collapsible">
                <h3>ℹ️ System Info <span class="collapse-toggle">▼</span></h3>
                <div class="collapsible-content">
                    <div class="system-info">
                        <small>
                            Versjon: <?php echo APP_VERSION; ?><br>
                            Environment: <?php echo ENVIRONMENT; ?><br>
                            <span id="performance-info"></span>
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Map Container -->
        <div id="map-container" class="map-container">
            <!-- Mapbox GL map will be rendered here -->
            <div id="map" class="map"></div>
            
            <!-- Navigation Overlay -->
            <div id="navigation-overlay" class="navigation-overlay hidden">
                <div class="nav-display">
                    <div class="speed-display">
                        <div class="speed-value" id="speed-value">0</div>
                        <div class="speed-unit">km/h</div>
                    </div>
                    <div class="direction-display">
                        <div class="compass" id="compass">
                            <div class="compass-arrow"></div>
                        </div>
                        <div class="direction-text" id="direction-text">N</div>
                    </div>
                </div>
            </div>

            <!-- Radar Warning Overlay -->
            <div id="radar-warning" class="warning-overlay hidden">
                <div class="warning-content">
                    <div class="warning-icon">⚠️</div>
                    <div class="warning-text">
                        <h4>RADARKONTROLL</h4>
                        <p id="warning-distance">500m fremover</p>
                        <p class="warning-subtitle">Sjekk hastigheten!</p>
                    </div>
                </div>
            </div>

            <!-- Coordinate Display -->
            <div id="coordinate-display" class="coordinate-overlay">
                <div class="coord-section">
                    <small>Kart:</small>
                    <span id="map-coords">-</span>
                </div>
                <div class="coord-section">
                    <small>GPS:</small>
                    <span id="gps-coords">-</span>
                </div>
            </div>

            <!-- Map Controls -->
            <div class="map-controls">
                <button id="zoom-in" class="map-control-btn">+</button>
                <button id="zoom-out" class="map-control-btn">−</button>
                <button id="locate-me" class="map-control-btn">📍</button>
                <button id="fullscreen" class="map-control-btn">⛶</button>
            </div>
        </div>
    </div>

    <!-- Error Display -->
    <div id="error-display" class="error-overlay hidden">
        <div class="error-content">
            <h3>⚠️ Systemfeil</h3>
            <p id="error-message">En feil oppstod under lasting av systemet.</p>
            <button id="reload-btn" class="btn btn-primary" onclick="location.reload()">
                Last på nytt
            </button>
        </div>
    </div>

    <!-- Notification Toast -->
    <div id="notification-toast" class="toast hidden">
        <div class="toast-content">
            <span class="toast-icon" id="toast-icon"></span>
            <span class="toast-message" id="toast-message"></span>
        </div>
        <button class="toast-close" id="toast-close">✕</button>
    </div>

    <!-- Scripts - Load in correct order -->
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
    
    <!-- Core System Components -->
    <script src="location-provider.js"></script>
    <script src="distance-calculator.js"></script>
    <script src="map-core.js"></script>
    <script src="pin-manager.js"></script>
    <script src="proximity-scanner.js"></script>
    <script src="reporting-engine.js"></script>
    
    <!-- System Integration -->
    <script src="init.js"></script>

    <!-- Application Startup -->
    <script>
        // Handle system events
        window.addEventListener('radar:systemReady', function(e) {
            console.log('🎉 System ready:', e.detail);
            hideLoading();
        });

        window.addEventListener('radar:systemError', function(e) {
            console.error('💥 System error:', e.detail);
            showError(e.detail.error?.message || 'Ukjent systemfeil');
        });

        // Loading management
        function hideLoading() {
            const loadingScreen = document.getElementById('loading-screen');
            const appContainer = document.getElementById('app-container');
            
            if (loadingScreen && appContainer) {
                loadingScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
            }
        }

        function showError(message) {
            const errorDisplay = document.getElementById('error-display');
            const errorMessage = document.getElementById('error-message');
            const loadingScreen = document.getElementById('loading-screen');
            
            if (errorDisplay && errorMessage) {
                errorMessage.textContent = message;
                errorDisplay.classList.remove('hidden');
                if (loadingScreen) loadingScreen.classList.add('hidden');
            }
        }

        // Quick location buttons
        document.addEventListener('DOMContentLoaded', function() {
            const quickBtns = document.querySelectorAll('.quick-btn');
            quickBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const coords = JSON.parse(this.dataset.coords);
                    const location = this.dataset.location;
                    
                    if (window.radarNavigationSystem?.mapCore) {
                        window.radarNavigationSystem.mapCore.flyTo({
                            center: coords,
                            zoom: 12
                        });
                        
                        // Show notification
                        showNotification(`📍 Fløy til ${location}`, 'success');
                    }
                });
            });
        });

        // Simple notification system
        function showNotification(message, type = 'info') {
            const toast = document.getElementById('notification-toast');
            const toastIcon = document.getElementById('toast-icon');
            const toastMessage = document.getElementById('toast-message');
            
            if (toast && toastIcon && toastMessage) {
                const icons = {
                    'success': '✅',
                    'error': '❌',
                    'warning': '⚠️',
                    'info': 'ℹ️'
                };
                
                toastIcon.textContent = icons[type] || icons.info;
                toastMessage.textContent = message;
                toast.classList.remove('hidden');
                
                // Auto-hide after 3 seconds
                setTimeout(() => {
                    toast.classList.add('hidden');
                }, 3000);
            }
        }

        // Toast close button
        document.addEventListener('DOMContentLoaded', function() {
            const toastClose = document.getElementById('toast-close');
            if (toastClose) {
                toastClose.addEventListener('click', function() {
                    document.getElementById('notification-toast').classList.add('hidden');
                });
            }
        });

        // Collapsible sections
        document.addEventListener('DOMContentLoaded', function() {
            const collapsibles = document.querySelectorAll('.collapsible h3');
            collapsibles.forEach(header => {
                header.addEventListener('click', function() {
                    const content = this.nextElementSibling;
                    const toggle = this.querySelector('.collapse-toggle');
                    
                    if (content && toggle) {
                        content.style.display = content.style.display === 'none' ? 'block' : 'none';
                        toggle.textContent = content.style.display === 'none' ? '▶' : '▼';
                    }
                });
            });
        });

        // Development helpers
        <?php if (ENVIRONMENT === 'development'): ?>
        window.dev = {
            getSystemStatus: () => window.getSystemStatus(),
            showError: showError,
            showNotification: showNotification,
            reloadPins: () => window.radarNavigationSystem?.checkForPinUpdates()
        };
        console.log('🛠️ Development mode active. Use window.dev for debugging.');
        <?php endif; ?>
    </script>

    <!-- Service Worker for PWA (optional) -->
    <?php if (ENABLE_PWA): ?>
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                        console.log('ServiceWorker registered:', registration.scope);
                    })
                    .catch(function(error) {
                        console.log('ServiceWorker registration failed:', error);
                    });
            });
        }
    </script>
    <?php endif; ?>

</body>
</html>