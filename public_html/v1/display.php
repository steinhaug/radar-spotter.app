<!-- display.php - Floating panel for map display controls and coordinate viewer -->
<div id="display-panel" class="floating-panel">
    <div class="panel-header">
        <h4>Kart & Koordinater</h4>
        <button id="toggle-display-panel" class="panel-toggle">−</button>
    </div>
    
    <div class="panel-content">
        <!-- Map Type Selector -->
        <div class="control-section">
            <label class="control-label">Karttype:</label>
            <div class="map-type-selector">
                <button id="map-type-driving" class="map-type-btn active" data-style="mapbox://styles/mapbox/dark-v11" data-type="driving">
                    <span class="icon">🚗</span>
                    <span class="label">Kjøring</span>
                </button>
                <button id="map-type-walking" class="map-type-btn" data-style="mapbox://styles/mapbox/streets-v12" data-type="walking">
                    <span class="icon">🚶</span>
                    <span class="label">Gange</span>
                </button>
                <button id="map-type-cycling" class="map-type-btn" data-style="mapbox://styles/mapbox/outdoors-v12" data-type="cycling">
                    <span class="icon">🚴</span>
                    <span class="label">Sykkel</span>
                </button>
                <button id="map-type-traffic" class="map-type-btn" data-style="mapbox://styles/mapbox/traffic-day-v2" data-type="driving-traffic">
                    <span class="icon">🚦</span>
                    <span class="label">Trafikk</span>
                </button>
            </div>
        </div>

        <!-- Coordinate Display -->
        <div class="control-section">
            <label class="control-label">Kartsentrum:</label>
            <div class="coordinate-display">
                <div class="coord-row">
                    <span class="coord-prefix">LAT:</span>
                    <input type="text" id="center-lat" class="coord-input" readonly value="58.1467">
                    <button id="copy-lat" class="copy-btn" title="Kopier latitude">📋</button>
                </div>
                <div class="coord-row">
                    <span class="coord-prefix">LNG:</span>
                    <input type="text" id="center-lng" class="coord-input" readonly value="8.0059">
                    <button id="copy-lng" class="copy-btn" title="Kopier longitude">📋</button>
                </div>
            </div>
        </div>

        <!-- GPS Position Display -->
        <div class="control-section" id="gps-position-section">
            <label class="control-label">GPS Posisjon:</label>
            <div class="coordinate-display">
                <div class="coord-row">
                    <span class="coord-prefix">LAT:</span>
                    <input type="text" id="gps-lat" class="coord-input" readonly value="−">
                    <button id="copy-gps-lat" class="copy-btn" title="Kopier GPS latitude">📋</button>
                </div>
                <div class="coord-row">
                    <span class="coord-prefix">LNG:</span>
                    <input type="text" id="gps-lng" class="coord-input" readonly value="−">
                    <button id="copy-gps-lng" class="copy-btn" title="Kopier GPS longitude">📋</button>
                </div>
                <div class="coord-row">
                    <span class="coord-prefix">ACC:</span>
                    <input type="text" id="gps-accuracy" class="coord-input" readonly value="−">
                    <span class="coord-unit">m</span>
                </div>
            </div>
        </div>

        <!-- Map Controls -->
        <div class="control-section">
            <label class="control-label">Kartfunksjoner:</label>
            <div class="map-controls">
                <button id="toggle-3d" class="control-btn">
                    <span class="icon">🏔️</span>
                    <span class="label">3D Terreng</span>
                </button>
                <button id="toggle-satellite" class="control-btn">
                    <span class="icon">🛰️</span>
                    <span class="label">Satellitt</span>
                </button>
                <button id="toggle-labels" class="control-btn active">
                    <span class="icon">🏷️</span>
                    <span class="label">Etiketter</span>
                </button>
                <button id="fullscreen-map" class="control-btn">
                    <span class="icon">⛶</span>
                    <span class="label">Fullskjerm</span>
                </button>
            </div>
        </div>

        <!-- Zoom and Bearing Display -->
        <div class="control-section">
            <label class="control-label">Kartinfo:</label>
            <div class="map-info">
                <div class="info-row">
                    <span class="info-label">Zoom:</span>
                    <span id="current-zoom" class="info-value">12.0</span>
                    <div class="zoom-controls">
                        <button id="zoom-in" class="zoom-btn">+</button>
                        <button id="zoom-out" class="zoom-btn">−</button>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-label">Retning:</span>
                    <span id="current-bearing" class="info-value">0°</span>
                    <button id="reset-bearing" class="reset-btn" title="Tilbakestill retning">↻</button>
                </div>
                <div class="info-row">
                    <span class="info-label">Tilt:</span>
                    <span id="current-pitch" class="info-value">0°</span>
                    <button id="reset-pitch" class="reset-btn" title="Tilbakestill tilt">↻</button>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
/* Floating panel base styles */
.floating-panel {
    position: absolute;
    background-color: rgba(45, 45, 45, 0.95);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid #404040;
    z-index: 1000;
    min-width: 280px;
    max-width: 320px;
}

#display-panel {
    top: 20px;
    left: 20px;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #404040;
    cursor: move; /* For potential drag functionality */
}

.panel-header h4 {
    margin: 0;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
}

.panel-toggle {
    background: none;
    border: none;
    color: #cccccc;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.panel-toggle:hover {
    color: #ffffff;
}

.panel-content {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
}

.control-section {
    margin-bottom: 20px;
}

.control-section:last-child {
    margin-bottom: 0;
}

.control-label {
    display: block;
    color: #cccccc;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Map Type Selector */
.map-type-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.map-type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    background-color: #1a1a1a;
    border: 1px solid #404040;
    border-radius: 6px;
    color: #cccccc;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 11px;
}

.map-type-btn:hover {
    background-color: #333333;
    border-color: #666666;
}

.map-type-btn.active {
    background-color: #007bff;
    border-color: #007bff;
    color: #ffffff;
}

.map-type-btn .icon {
    font-size: 16px;
    margin-bottom: 4px;
}

.map-type-btn .label {
    font-weight: 500;
}

/* Coordinate Display */
.coordinate-display {
    background-color: #1a1a1a;
    border-radius: 6px;
    padding: 12px;
}

.coord-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
}

.coord-row:last-child {
    margin-bottom: 0;
}

.coord-prefix {
    color: #007bff;
    font-weight: 600;
    font-size: 11px;
    min-width: 35px;
}

.coord-input {
    flex: 1;
    background-color: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 4px;
    color: #ffffff;
    font-size: 12px;
    font-family: monospace;
    padding: 6px 8px;
    text-align: center;
}

.coord-unit {
    color: #cccccc;
    font-size: 11px;
    min-width: 15px;
}

.copy-btn {
    background: none;
    border: none;
    color: #cccccc;
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
    border-radius: 3px;
    transition: all 0.2s ease;
}

.copy-btn:hover {
    background-color: #404040;
    color: #ffffff;
}

/* Map Controls */
.map-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.control-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    background-color: #1a1a1a;
    border: 1px solid #404040;
    border-radius: 6px;
    color: #cccccc;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 10px;
}

.control-btn:hover {
    background-color: #333333;
    border-color: #666666;
}

.control-btn.active {
    background-color: #28a745;
    border-color: #28a745;
    color: #ffffff;
}

.control-btn .icon {
    font-size: 14px;
    margin-bottom: 3px;
}

/* Map Info */
.map-info {
    background-color: #1a1a1a;
    border-radius: 6px;
    padding: 12px;
}

.info-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-label {
    color: #cccccc;
    font-size: 11px;
    min-width: 50px;
}

.info-value {
    color: #ffffff;
    font-family: monospace;
    font-size: 12px;
    flex: 1;
}

.zoom-controls {
    display: flex;
    gap: 2px;
}

.zoom-btn, .reset-btn {
    background-color: #404040;
    border: none;
    color: #ffffff;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
}

.zoom-btn:hover, .reset-btn:hover {
    background-color: #666666;
}

/* Collapsed state */
.floating-panel.collapsed .panel-content {
    display: none;
}

.floating-panel.collapsed .panel-toggle {
    transform: rotate(180deg);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .floating-panel {
        position: relative;
        margin-bottom: 10px;
        max-width: 100%;
    }
    
    #display-panel {
        top: 0;
        left: 0;
        right: 0;
    }
}
</style>