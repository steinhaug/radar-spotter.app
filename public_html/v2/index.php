<?php
// index.php - Main radar navigation application

// Include configuration
require_once 'config.php';

// Set content type and charset
header('Content-Type: text/html; charset=utf-8');

// Basic security headers
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
?>
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Radar Navigation System - Real-time speed camera alerts and GPS navigation">
    <meta name="author" content="Radar Navigation Team">
    
    <title>Radar Navigation System</title>
    
    <!-- Mapbox CSS -->
    <link href='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css' rel='stylesheet' />
    
    <!-- Application CSS -->
    <link rel="stylesheet" href="styles.css">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#1a1a1a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Radar Nav">
    
    <!-- Pass PHP configuration to JavaScript -->
    <script>
        window.APP_CONFIG = {
            mapboxToken: '<?php echo htmlspecialchars(MAPBOX_TOKEN, ENT_QUOTES, 'UTF-8'); ?>',
            apiBaseUrl: '<?php echo htmlspecialchars(API_BASE_URL, ENT_QUOTES, 'UTF-8'); ?>',
            defaultCenter: [<?php echo DEFAULT_CENTER_LNG; ?>, <?php echo DEFAULT_CENTER_LAT; ?>],
            defaultZoom: <?php echo DEFAULT_ZOOM; ?>,
            environment: '<?php echo ENVIRONMENT; ?>',
            version: '<?php echo APP_VERSION; ?>'
        };
    </script>
</head>
<body>
    <!-- Loading Screen -->
    <div id="loading-screen" class="loading-overlay">
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <h2>Loading Radar Navigation System</h2>
            <p>Initializing components...</p>
            <div class="loading-progress">
                <div class="loading-bar"></div>
            </div>
        </div>
    </div>

    <!-- Main Application Container -->
    <div id="app-container">
        <!-- Left Control Panel -->
        <div id="control-panel" class="control-panel">
            <div class="panel-header">
                <h1>🎯 Radar Navigation</h1>
                <div class="version-info">v<?php echo APP_VERSION; ?></div>
            </div>

            <!-- Navigation Controls -->
            <div class="control-group">
                <h3>🧭 Navigation</h3>
                <button id="start-navigation" class="btn primary">
                    <span class="btn-icon">▶️</span>
                    Start Navigation
                </button>
                <button id="stop-navigation" class="btn secondary" disabled>
                    <span class="btn-icon">⏹️</span>
                    Stop Navigation
                </button>
                <button id="center-map" class="btn secondary">
                    <span class="btn-icon">🎯</span>
                    Center på posisjon
                </button>
            </div>

            <!-- GPS Testing -->
            <div class="control-group">
                <h3>🛰️ GPS Testing</h3>
                <button id="start-simulation" class="btn primary">
                    <span class="btn-icon">🎬</span>
                    Start Simulering
                </button>
                <button id="stop-simulation" class="btn secondary" disabled>
                    <span class="btn-icon">⏹️</span>
                    Stop Simulering
                </button>
                <input type="file" id="gps-log-upload" accept=".gpx,.kml,.json" style="display: none;">
                <button id="load-gps-log" class="btn secondary">
                    <span class="btn-icon">📁</span>
                    Last inn GPS logg
                </button>
                <button id="generate-from-route" class="btn secondary">
                    <span class="btn-icon">🗺️</span>
                    Generer fra rute
                </button>
            </div>

            <!-- Pin Controls -->
            <div class="control-group">
                <h3>📍 Radar Pins</h3>
                <button id="toggle-pins" class="btn secondary">
                    <span class="btn-icon">👁️</span>
                    Vis/Skjul Pins
                </button>
                <button id="add-pin-mode" class="btn secondary">
                    <span class="btn-icon">➕</span>
                    Legg til Pin
                </button>
            </div>

            <!-- System Status -->
            <div class="control-group">
                <h3>📊 Status</h3>
                <div id="status-display" class="status-container">
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
                        <span id="radar-distance" class="status-value">−</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Aktiv rute:</span>
                        <span id="active-route" class="status-value">Ingen</span>
                    </div>
                </div>
            </div>

            <!-- Quick Statistics -->
            <div class="control-group">
                <h3>📈 Statistikk</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value" id="total-pins">0</span>
                        <span class="stat-label">Pins lastet</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="alerts-today">0</span>
                        <span class="stat-label">Varsler i dag</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="scan-count">0</span>
                        <span class="stat-label">Scanninger</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="system-uptime">00:00</span>
                        <span class="stat-label">Oppetid</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Map Container -->
        <div id="map-container" class="map-container">
            <!-- Main Map -->
            <div id="map" class="map"></div>
            
            <!-- Navigation Overlay -->
            <div id="navigation-overlay" class="navigation-overlay hidden">
                <div class="nav-info">
                    <div class="speed-display">
                        <span class="speed-value">0</span>
                        <span class="speed-unit">km/h</span>
                    </div>
                    <div class="direction-display">
                        <div class="compass-arrow"></div>
                        <span class="direction-text">N</span>
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
                    </div>
                    <div class="warning-actions">
                        <button onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')" class="btn-close">
                            ✕
                        </button>
                    </div>
                </div>
            </div>

            <!-- Coordinate Display -->
            <div id="coordinate-display" class="coordinate-overlay">
                <div class="coord-section">
                    <h4>📍 Kartsentrum</h4>
                    <div class="coord-row">
                        <span>LAT:</span>
                        <span id="center-lat">58.1467</span>
                    </div>
                    <div class="coord-row">
                        <span>LNG:</span>
                        <span id="center-lng">8.0059</span>
                    </div>
                </div>
                <div class="coord-section">
                    <h4>🛰️ GPS Posisjon</h4>
                    <div class="coord-row">
                        <span>LAT:</span>
                        <span id="gps-lat">−</span>
                    </div>
                    <div class="coord-row">
                        <span>LNG:</span>
                        <span id="gps-lng">−</span>
                    </div>
                    <div class="coord-row">
                        <span>ACC:</span>
                        <span id="gps-accuracy">−</span>
                    </div>
                </div>
            </div>

            <!-- System Info Overlay -->
            <div id="system-info" class="system-overlay">
                <div class="system-badge">
                    <span id="connection-status" class="status-indicator offline">●</span>
                    <span class="system-text"><?php echo ENVIRONMENT === 'development' ? 'DEV' : 'PROD'; ?></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Error Modal -->
    <div id="error-modal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h3>⚠️ System Error</h3>
                <button class="modal-close" onclick="document.getElementById('error-modal').classList.add('hidden')">✕</button>
            </div>
            <div class="modal-body">
                <p id="error-message">An error occurred.</p>
                <div class="error-details">
                    <pre id="error-details"></pre>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="location.reload()">Reload Page</button>
                <button class="btn primary" onclick="document.getElementById('error-modal').classList.add('hidden')">Continue</button>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <!-- Mapbox GL JS -->
    <script src='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'></script>
    
    <!-- Core System Components -->
    <script src="location-provider.js"></script>
    <script src="distance-calculator.js"></script>
    <script src="pin-manager.js"></script>
    <script src="map-core.js"></script>
    <script src="proximity-scanner.js"></script>
    <script src="reporting-engine.js"></script>
    
    <!-- System Initialization -->
    <script src="init.js"></script>

    <!-- Application Event Handlers -->
    <script>
        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            showErrorModal('JavaScript Error', e.error.message, e.error.stack);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            showErrorModal('Promise Rejection', e.reason.message || e.reason, e.reason.stack);
        });

        // System event listeners
        window.addEventListener('radar:systemReady', (e) => {
            hideLoadingScreen();
            updateConnectionStatus(true);
            console.log('🎉 System ready!', e.detail);
        });

        window.addEventListener('radar:systemError', (e) => {
            hideLoadingScreen();
            showErrorModal('System Initialization Error', e.detail.error.message, e.detail.error.stack);
        });

        // Utility functions
        function hideLoadingScreen() {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }

        function showErrorModal(title, message, details = '') {
            const modal = document.getElementById('error-modal');
            const titleEl = modal.querySelector('.modal-header h3');
            const messageEl = document.getElementById('error-message');
            const detailsEl = document.getElementById('error-details');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            detailsEl.textContent = details;
            
            modal.classList.remove('hidden');
        }

        function updateConnectionStatus(connected) {
            const indicator = document.getElementById('connection-status');
            if (indicator) {
                indicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
            }
        }

        // Development helpers
        <?php if (ENVIRONMENT === 'development'): ?>
        window.DEBUG = true;
        console.log('🔧 Development mode active');
        console.log('📱 App Config:', window.APP_CONFIG);
        
        // Add debug commands
        window.debugSystem = () => window.getSystemStatus();
        window.showStats = () => console.table(window.getSystemStatus());
        <?php endif; ?>
    </script>
</body>
</html>