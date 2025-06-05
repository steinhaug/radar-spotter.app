<!-- set_route.php - Floating panel for route planning and address search -->
<div id="route-panel" class="floating-panel">
    <div class="panel-header">
        <h4>Rute & Destinasjon</h4>
        <button id="toggle-route-panel" class="panel-toggle">−</button>
    </div>
    
    <div class="panel-content">
        <!-- Address Search -->
        <div class="control-section">
            <label class="control-label">Adressesøk:</label>
            <div class="search-container">
                <div class="search-input-wrapper">
                    <input type="text" id="address-search" class="search-input" 
                           placeholder="Søk etter adresse eller sted..." autocomplete="off">
                    <button id="search-btn" class="search-button">🔍</button>
                    <button id="clear-search" class="clear-button hidden">✕</button>
                </div>
                <div id="search-results" class="search-results hidden"></div>
            </div>
        </div>

        <!-- Quick Location Buttons -->
        <div class="control-section">
            <label class="control-label">Hurtigvalg:</label>
            <div class="quick-locations">
                <button class="quick-btn" data-location="Kristiansand sentrum" data-coords="[8.0059, 58.1467]">
                    📍 Kristiansand
                </button>
                <button class="quick-btn" data-location="Mandal sentrum" data-coords="[7.4609, 58.0294]">
                    📍 Mandal
                </button>
                <button class="quick-btn" data-location="Arendal sentrum" data-coords="[8.7726, 58.4616]">
                    📍 Arendal
                </button>
                <button class="quick-btn" data-location="Stavanger sentrum" data-coords="[5.7331, 58.9700]">
                    📍 Stavanger
                </button>
            </div>
        </div>

        <!-- Route Planning -->
        <div class="control-section">
            <label class="control-label">Ruteplanlegging:</label>
            <div class="route-planning">
                <!-- Start Point -->
                <div class="route-point">
                    <div class="point-header">
                        <span class="point-label">🟢 Start:</span>
                        <button id="use-current-location" class="use-location-btn" title="Bruk nåværende posisjon">📍</button>
                    </div>
                    <input type="text" id="start-address" class="route-input" 
                           placeholder="Startadresse eller bruk GPS" readonly>
                    <div class="point-coords">
                        <small id="start-coords" class="coords-text">Ikke satt</small>
                    </div>
                </div>

                <!-- Waypoints Container -->
                <div id="waypoints-container">
                    <!-- Waypoints will be added here dynamically -->
                </div>

                <!-- Add Waypoint Button -->
                <button id="add-waypoint" class="add-waypoint-btn">
                    ➕ Legg til mellomstopp
                </button>

                <!-- Destination Point -->
                <div class="route-point">
                    <div class="point-header">
                        <span class="point-label">🔴 Mål:</span>
                        <button id="use-map-center" class="use-location-btn" title="Bruk kartsentrum">🎯</button>
                    </div>
                    <input type="text" id="destination-address" class="route-input" 
                           placeholder="Destinasjon (søk eller klikk på kart)" readonly>
                    <div class="point-coords">
                        <small id="destination-coords" class="coords-text">Ikke satt</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Route Options -->
        <div class="control-section">
            <label class="control-label">Rutealternativer:</label>
            <div class="route-options">
                <div class="option-row">
                    <label class="option-label">
                        <input type="radio" name="route-profile" value="driving" checked>
                        🚗 Kjøring
                    </label>
                    <label class="option-label">
                        <input type="radio" name="route-profile" value="driving-traffic">
                        🚦 Med trafikk
                    </label>
                </div>
                <div class="option-row">
                    <label class="option-label">
                        <input type="radio" name="route-profile" value="walking">
                        🚶 Gange
                    </label>
                    <label class="option-label">
                        <input type="radio" name="route-profile" value="cycling">
                        🚴 Sykkel
                    </label>
                </div>
                <div class="option-row">
                    <label class="option-checkbox">
                        <input type="checkbox" id="avoid-tolls">
                        Unngå bompenger
                    </label>
                    <label class="option-checkbox">
                        <input type="checkbox" id="avoid-highways">
                        Unngå motorvei
                    </label>
                </div>
            </div>
        </div>

        <!-- Route Actions -->
        <div class="control-section">
            <label class="control-label">Rutehandlinger:</label>
            <div class="route-actions">
                <button id="calculate-route" class="action-btn primary">
                    🗺️ Beregn rute
                </button>
                <button id="clear-route" class="action-btn secondary">
                    🗑️ Fjern rute
                </button>
                <button id="reverse-route" class="action-btn secondary">
                    🔄 Reverser rute
                </button>
                <button id="optimize-route" class="action-btn secondary">
                    ⚡ Optimaliser
                </button>
            </div>
        </div>

        <!-- Route Information -->
        <div class="control-section" id="route-info-section" style="display: none;">
            <label class="control-label">Ruteinformasjon:</label>
            <div class="route-info">
                <div class="info-item">
                    <span class="info-icon">📏</span>
                    <span class="info-text">
                        <strong>Avstand:</strong>
                        <span id="route-distance">−</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏱️</span>
                    <span class="info-text">
                        <strong>Tid:</strong>
                        <span id="route-duration">−</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-icon">⛽</span>
                    <span class="info-text">
                        <strong>Drivstoff:</strong>
                        <span id="route-fuel">−</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-icon">💰</span>
                    <span class="info-text">
                        <strong>Bompenger:</strong>
                        <span id="route-tolls">−</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Export Options -->
        <div class="control-section">
            <label class="control-label">Eksport:</label>
            <div class="export-options">
                <button id="export-gpx" class="export-btn">
                    📁 Eksporter GPX
                </button>
                <button id="share-route" class="export-btn">
                    🔗 Del rute
                </button>
            </div>
        </div>
    </div>
</div>

<style>
/* Route panel specific styles */
#route-panel {
    top: 20px;
    right: 20px;
    max-height: 90vh;
}

/* Search Container */
.search-container {
    position: relative;
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.search-input {
    flex: 1;
    background-color: #1a1a1a;
    border: 1px solid #404040;
    border-radius: 6px;
    color: #ffffff;
    font-size: 14px;
    padding: 10px 40px 10px 12px;
    transition: border-color 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: #007bff;
}

.search-button, .clear-button {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: #cccccc;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 3px;
    transition: all 0.2s ease;
}

.search-button:hover, .clear-button:hover {
    background-color: #404040;
    color: #ffffff;
}

.clear-button {
    right: 32px;
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: #2d2d2d;
    border: 1px solid #404040;
    border-top: none;
    border-radius: 0 0 6px 6px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1001;
}

.search-result-item {
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid #404040;
    transition: background-color 0.2s ease;
}

.search-result-item:hover {
    background-color: #404040;
}

.search-result-item:last-child {
    border-bottom: none;
}

.result-name {
    color: #ffffff;
    font-weight: 500;
    margin-bottom: 4px;
}

.result-address {
    color: #cccccc;
    font-size: 12px;
}

/* Quick Locations */
.quick-locations {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.quick-btn {
    background-color: #1a1a1a;
    border: 1px solid #404040;
    border-radius: 6px;
    color: #cccccc;
    cursor: pointer;
    font-size: 11px;
    padding: 8px 6px;
    text-align: center;
    transition: all 0.2s ease;
}

.quick-btn:hover {
    background-color: #333333;
    border-color: #666666;
    color: #ffffff;
}

/* Route Planning */
.route-planning {
    background-color: #1a1a1a;
    border-radius: 6px;
    padding: 12px;
}

.route-point {
    margin-bottom: 16px;
}

.route-point:last-child {
    margin-bottom: 0;
}

.point-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.point-label {
    color: #ffffff;
    font-weight: 500;
    font-size: 12px;
}

.use-location-btn {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 3px;
    transition: all 0.2s ease;
}

.use-location-btn:hover {
    background-color: #007bff;
    color: #ffffff;
}

.route-input {
    width: 100%;
    background-color: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 4px;
    color: #ffffff;
    font-size: 12px;
    padding: 8px 10px;
    margin-bottom: 4px;
    transition: border-color 0.2s ease;
}

.route-input:focus {
    outline: none;
    border-color: #007bff;
}

.point-coords {
    margin-bottom: 8px;
}

.coords-text {
    color: #888888;
    font-family: monospace;
    font-size: 10px;
}

.add-waypoint-btn {
    width: 100%;
    background-color: #404040;
    border: 1px dashed #666666;
    border-radius: 4px;
    color: #cccccc;
    cursor: pointer;
    font-size: 12px;
    padding: 8px;
    margin: 8px 0;
    transition: all 0.2s ease;
}

.add-waypoint-btn:hover {
    background-color: #666666;
    color: #ffffff;
}

/* Route Options */
.route-options {
    background-color: #1a1a1a;
    border-radius: 6px;
    padding: 12px;
}

.option-row {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
}

.option-row:last-child {
    margin-bottom: 0;
}

.option-label, .option-checkbox {
    display: flex;
    align-items: center;
    color: #cccccc;
    cursor: pointer;
    font-size: 12px;
    gap: 6px;
}

.option-label input[type="radio"],
.option-checkbox input[type="checkbox"] {
    margin: 0;
}

/* Route Actions */
.route-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.action-btn.primary {
    background-color: #007bff;
    color: #ffffff;
    grid-column: 1 / -1;
}

.action-btn.primary:hover {
    background-color: #0056b3;
}

.action-btn.secondary {
    background-color: #6c757d;
    color: #ffffff;
}

.action-btn.secondary:hover {
    background-color: #545b62;
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Route Information */
.route-info {
    background-color: #1a1a1a;
    border-radius: 6px;
    padding: 12px;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.info-item:last-child {
    margin-bottom: 0;
}

.info-icon {
    font-size: 14px;
    width: 20px;
}

.info-text {
    color: #cccccc;
    font-size: 12px;
    flex: 1;
}

.info-text strong {
    color: #ffffff;
}

/* Export Options */
.export-options {
    display: flex;
    gap: 8px;
}

.export-btn {
    flex: 1;
    background-color: #28a745;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    padding: 8px 10px;
    transition: background-color 0.2s ease;
}

.export-btn:hover {
    background-color: #1e7e34;
}

/* Waypoint specific styles */
.waypoint-item {
    background-color: #2d2d2d;
    border-radius: 4px;
    margin-bottom: 8px;
    padding: 8px;
    position: relative;
}

.waypoint-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.waypoint-label {
    color: #ffa500;
    font-size: 11px;
    font-weight: 500;
}

.remove-waypoint {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    font-size: 12px;
    padding: 2px;
}

.remove-waypoint:hover {
    background-color: #dc3545;
    border-radius: 2px;
    color: #ffffff;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    #route-panel {
        top: auto;
        bottom: 20px;
        left: 20px;
        right: 20px;
        max-height: 50vh;
    }
    
    .quick-locations {
        grid-template-columns: 1fr;
    }
    
    .route-actions {
        grid-template-columns: 1fr;
    }
    
    .action-btn.primary {
        grid-column: 1;
    }
}

/* Drag functionality */
.floating-panel.dragging {
    opacity: 0.8;
    z-index: 2000;
}

.panel-header {
    cursor: move;
    user-select: none;
}

.panel-header:active {
    cursor: grabbing;
}

</style>