// route-manager.js - Route planning with address search and PIN analysis

class RouteManager {
    constructor(mapCore, proximityScanner, pinManager) {
        this.mapCore = mapCore;
        this.proximityScanner = proximityScanner;
        this.pinManager = pinManager;
        
        // Route state
        this.currentRoute = null;
        this.fromCoords = null;
        this.toCoords = null;
        this.routePins = [];
        
        // Navigation state
        this.isNavigating = false;
        this.currentInstructionIndex = 0;
        this.currentPosition = null;
        this.isRerouting = false;
        this.navigationInstructions = [];
        
        // UI elements
        this.panel = null;
        this.fromField = null;
        this.toField = null;
        this.reportPanel = null;
        this.navigationPanel = null;
        
        // Search state
        this.searchTimeout = null;
        this.activeDropdown = null;
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.bindEvents();
    }
    
    // ==================== UI CREATION ====================
    
    createPanel() {
        // Create main route planning panel
        this.panel = document.createElement('div');
        this.panel.id = 'route-planner-panel';
        this.panel.className = 'route-panel';
        this.panel.innerHTML = this.getPanelHTML();
        
        // Add to map container
        document.getElementById('map-container').appendChild(this.panel);
        
        // Get field references
        this.fromField = document.getElementById('route-from');
        this.toField = document.getElementById('route-to');
    }
    
    getPanelHTML() {
        return `
            <div class="route-header">
                <h4>🗺️ Ruteplanlegging</h4>
                <button id="route-panel-toggle" class="panel-toggle">−</button>
            </div>
            
            <div class="route-content">

                <!-- From field -->
                <div class="route-field-group">
                    <div class="point-header">
                        <span class="route-label">🟢 Fra:</span>
                        <button id="use-current-location" class="use-location-btn" title="Bruk nåværende posisjon">📍</button>
                    </div>
                    <div class="route-input-wrapper">
                        <input type="text" id="route-from" class="route-input" 
                            placeholder="Søk startadresse..." autocomplete="off">
                        <button id="from-reset" class="field-reset hidden">✕</button>
                    </div>
                    <div class="point-coords">
                        <small id="from-coords" class="coords-text">Ikke satt</small>
                    </div>
                    <div id="from-dropdown" class="search-dropdown hidden"></div>
                </div>

                <!-- To field -->
                <div class="route-field-group">
                    <div class="point-header">
                        <span class="route-label">🔴 Til:</span>
                        <button id="use-map-center" class="use-location-btn" title="Bruk kartsentrum">🎯</button>
                    </div>
                    <div class="route-input-wrapper">
                        <input type="text" id="route-to" class="route-input" 
                            placeholder="Søk destinasjon..." autocomplete="off">
                        <button id="to-reset" class="field-reset hidden">✕</button>
                    </div>
                    <div class="point-coords">
                        <small id="to-coords" class="coords-text">Ikke satt</small>
                    </div>
                    <div id="to-dropdown" class="search-dropdown hidden"></div>
                </div>

                <!-- Route options -->
                <div class="route-options">
                    <label class="route-checkbox">
                        <input type="checkbox" id="avoid-highways">
                        <span class="checkmark"></span>
                        Unngå motorvei
                    </label>
                    <label class="route-checkbox">
                        <input type="checkbox" id="avoid-tolls">
                        <span class="checkmark"></span>
                        Unngå bompenger
                    </label>
                </div>
                
                <!-- Action buttons -->
                <div class="route-actions">
                    <button id="calculate-route" class="route-btn primary">
                        🗺️ Beregn rute
                    </button>
                    <button id="clear-route" class="route-btn secondary" disabled>
                        🗑️ Slett rute
                    </button>
                </div>
                
                <!-- Route info (shown when route calculated) -->
                <div id="route-info" class="route-info hidden">
                    <div class="info-item">
                        <span class="info-label">Avstand:</span>
                        <span id="route-distance">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Tid:</span>
                        <span id="route-duration">-</span>
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
        `;
    }
    
    // ==================== EVENT BINDING ====================
    
    bindEvents() {
        // Panel toggle
        document.getElementById('route-panel-toggle').addEventListener('click', () => {
            this.togglePanel();
        });
        
        // Address search fields
        this.fromField.addEventListener('input', (e) => {
            this.handleAddressSearch(e.target.value, 'from');
        });
        
        this.toField.addEventListener('input', (e) => {
            this.handleAddressSearch(e.target.value, 'to');
        });
        
        // Reset buttons
        document.getElementById('from-reset').addEventListener('click', () => {
            this.resetField('from');
        });
        
        document.getElementById('to-reset').addEventListener('click', () => {
            this.resetField('to');
        });
        
        // Quick location buttons
        document.getElementById('use-current-location').addEventListener('click', () => {
            this.useCurrentLocation();
        });

        document.getElementById('use-map-center').addEventListener('click', () => {
            this.useMapCenter();
        });

        // Action buttons
        document.getElementById('calculate-route').addEventListener('click', () => {
            this.calculateRoute();
        });
        
        document.getElementById('clear-route').addEventListener('click', () => {
            this.clearRoute();
        });
        
        // Export functions
        document.getElementById('export-gpx').addEventListener('click', () => {
            this.exportRouteAsGpx();
        });

        document.getElementById('share-route').addEventListener('click', () => {
            this.shareRoute();
        });

        // Hide dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.route-field-group')) {
                this.hideAllDropdowns();
            }
        });
    }
    
    // ==================== ADDRESS SEARCH ====================
    
    handleAddressSearch(query, fieldType) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Show/hide reset button
        const resetBtn = document.getElementById(`${fieldType}-reset`);
        if (query.trim()) {
            resetBtn.classList.remove('hidden');
        } else {
            resetBtn.classList.add('hidden');
            this.hideDropdown(fieldType);
            return;
        }
        
        // Debounce search
        if (query.length > 2) {
            this.searchTimeout = setTimeout(() => {
                this.searchAddresses(query, fieldType);
            }, 300);
        }
    }
    
    async searchAddresses(query, fieldType) {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
                `access_token=${window.APP_CONFIG.mapboxToken}&` +
                `country=NO&` +
                `limit=5&` +
                `language=no`
            );
            
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            this.showDropdown(data.features, fieldType);
            
        } catch (error) {
            console.error('Address search error:', error);
            this.hideDropdown(fieldType);
        }
    }
    
    showDropdown(features, fieldType) {
        const dropdown = document.getElementById(`${fieldType}-dropdown`);
        dropdown.innerHTML = '';
        
        if (features.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item">Ingen resultater</div>';
        } else {
            features.forEach(feature => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.innerHTML = `
                    <div class="item-name">${feature.text}</div>
                    <div class="item-address">${feature.place_name}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.selectAddress(feature, fieldType);
                });
                
                dropdown.appendChild(item);
            });
        }
        
        dropdown.classList.remove('hidden');
        this.activeDropdown = fieldType;
    }
    
    hideDropdown(fieldType) {
        const dropdown = document.getElementById(`${fieldType}-dropdown`);
        dropdown.classList.add('hidden');
        if (this.activeDropdown === fieldType) {
            this.activeDropdown = null;
        }
    }
    
    hideAllDropdowns() {
        this.hideDropdown('from');
        this.hideDropdown('to');
    }
    
    selectAddress(feature, fieldType) {
        const field = fieldType === 'from' ? this.fromField : this.toField;
        const coords = feature.center; // [lng, lat]
        
        // Set field value
        field.value = feature.place_name;
        
        // Store coordinates
        if (fieldType === 'from') {
            this.fromCoords = { lng: coords[0], lat: coords[1] };
        } else {
            this.toCoords = { lng: coords[0], lat: coords[1] };
        }
        
        // Etter at coordinates er satt, legg til:
        const coordsElement = document.getElementById(`${fieldType}-coords`);
        if (coordsElement) {
            coordsElement.textContent = `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;
        }

        // Hide dropdown
        this.hideDropdown(fieldType);
        
        // Update UI
        this.updateCalculateButton();
    }
    
    useCurrentLocation() {
        if (window.radarNavigationSystem && window.radarNavigationSystem.locationProvider) {
            const position = window.radarNavigationSystem.locationProvider.getCurrentPosition();
            if (position) {
                this.fromField.value = 'Nåværende GPS-posisjon';
                this.fromCoords = { lng: position.lng, lat: position.lat };
                document.getElementById('from-coords').textContent = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
                document.getElementById('from-reset').classList.remove('hidden');
                this.updateCalculateButton();
            } else {
                this.showNotification('GPS-posisjon ikke tilgjengelig', 'error');
            }
        }
    }

    useMapCenter() {
        const center = this.mapCore.getCenter();
        if (center) {
            this.toField.value = 'Kartsentrum';
            this.toCoords = { lng: center.lng, lat: center.lat };
            document.getElementById('to-coords').textContent = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
            document.getElementById('to-reset').classList.remove('hidden');
            this.updateCalculateButton();
        }
    }

    resetField(fieldType) {
        const field = fieldType === 'from' ? this.fromField : this.toField;
        const resetBtn = document.getElementById(`${fieldType}-reset`);
        
        field.value = '';
        resetBtn.classList.add('hidden');
        
        if (fieldType === 'from') {
            this.fromCoords = null;
        } else {
            this.toCoords = null;
        }
        
        this.hideDropdown(fieldType);
        this.updateCalculateButton();
    }
    
    // ==================== ROUTE CALCULATION ====================
    
    updateCalculateButton() {
        const calculateBtn = document.getElementById('calculate-route');
        calculateBtn.disabled = !this.fromCoords || !this.toCoords;
    }
    
    async calculateRoute() {
        if (!this.fromCoords || !this.toCoords) {
            console.warn('Both from and to coordinates required');
            return;
        }
        
        try {
            // Build Mapbox Directions API URL
            const avoidHighways = document.getElementById('avoid-highways').checked;
            const avoidTolls = document.getElementById('avoid-tolls').checked;
            
            let url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
                     `${this.fromCoords.lng},${this.fromCoords.lat};${this.toCoords.lng},${this.toCoords.lat}?` +
                     `geometries=geojson&steps=true&overview=full&` +
                     `access_token=${window.APP_CONFIG.mapboxToken}`;
            
            // Add restrictions
            const excludes = [];
            if (avoidHighways) excludes.push('motorway');
            if (avoidTolls) excludes.push('toll');
            if (excludes.length > 0) {
                url += `&exclude=${excludes.join(',')}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Route calculation failed');
            
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                this.currentRoute = data.routes[0];
                this.displayRoute();
                this.showRouteInfo();
                await this.scanRouteForPins();
                
                // Update UI
                document.getElementById('clear-route').disabled = false;
                
            } else {
                throw new Error('No route found');
            }
            
        } catch (error) {
            console.error('Route calculation error:', error);
            this.showNotification('Kunne ikke beregne rute', 'error');
        }
    }
    
    displayRoute() {
        if (!this.currentRoute) return;
        
        // Remove existing route
        this.clearRouteFromMap();
        
        // Add route to map
        this.mapCore.addSource('route-source', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: this.currentRoute.geometry
            }
        });
        
        this.mapCore.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route-source',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#007bff',
                'line-width': 5,
                'line-opacity': 0.8
            }
        });
        
        // Fit map to route
        const coordinates = this.currentRoute.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        
        this.mapCore.map.fitBounds(bounds, { padding: 50 });
    }
    
    showRouteInfo() {
        const distance = (this.currentRoute.distance / 1000).toFixed(1); // km
        const duration = Math.round(this.currentRoute.duration / 60); // minutes
        
        document.getElementById('route-distance').textContent = `${distance} km`;
        document.getElementById('route-duration').textContent = `${duration} min`;
        document.getElementById('route-info').classList.remove('hidden');
        
        // Extract and store navigation instructions
        this.extractNavigationInstructions();
        
        // Show navigation panel
        this.showNavigationPanel();
    }
    
    extractNavigationInstructions() {
        this.navigationInstructions = [];
        
        if (this.currentRoute.legs && this.currentRoute.legs.length > 0) {
            this.currentRoute.legs.forEach(leg => {
                if (leg.steps) {
                    leg.steps.forEach((step, index) => {
                        this.navigationInstructions.push({
                            instruction: step.maneuver.instruction || 'Fortsett',
                            distance: step.distance,
                            duration: step.duration,
                            type: step.maneuver.type,
                            modifier: step.maneuver.modifier,
                            geometry: step.geometry
                        });
                    });
                }
            });
        }
        
        this.currentInstructionIndex = 0;
    }
    
    showNavigationPanel() {
        // Remove existing navigation panel
        this.hideNavigationPanel();
        
        // Create navigation panel
        this.navigationPanel = document.createElement('div');
        this.navigationPanel.id = 'navigation-panel';
        this.navigationPanel.className = 'navigation-panel';
        this.navigationPanel.innerHTML = this.getNavigationPanelHTML();
        
        // Position below route panel
        document.getElementById('map-container').appendChild(this.navigationPanel);
        
        // Bind navigation events
        this.bindNavigationEvents();
    }
    
    getNavigationPanelHTML() {
        return `
            <div class="nav-header">
                <h4>🧭 Navigering</h4>
                <button id="nav-panel-toggle" class="panel-toggle">−</button>
            </div>
            
            <div class="nav-content">
                <div class="nav-controls">
                    <button id="start-stop-navigation" class="nav-btn primary">
                        🧭 Start navigering
                    </button>
                </div>
                
                <div id="nav-instructions" class="nav-instructions hidden">
                    <div class="instruction-current">
                        <div class="instruction-icon" id="current-instruction-icon">➡️</div>
                        <div class="instruction-text">
                            <div class="instruction-main" id="current-instruction">Venter på start...</div>
                            <div class="instruction-distance" id="current-distance">-</div>
                        </div>
                    </div>
                    
                    <div class="instruction-next">
                        <div class="instruction-label">Neste:</div>
                        <div class="instruction-preview" id="next-instruction">-</div>
                    </div>
                </div>
                
                <div id="rerouting-overlay" class="rerouting-overlay hidden">
                    <div class="rerouting-content">
                        <div class="rerouting-spinner"></div>
                        <div class="rerouting-text">Re-routing...</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindNavigationEvents() {
        // Navigation panel toggle
        document.getElementById('nav-panel-toggle').addEventListener('click', () => {
            this.toggleNavigationPanel();
        });
        
        // Start/stop navigation
        document.getElementById('start-stop-navigation').addEventListener('click', () => {
            if (this.isNavigating) {
                this.stopNavigation();
            } else {
                this.startNavigation();
            }
        });
    }
    
    // ==================== PIN SCANNING ====================
    
    async scanRouteForPins() {
        if (!this.currentRoute) return;
        
        try {
            const routePins = await this.proximityScanner.scanRoute(
                this.currentRoute.geometry,
                { tolerance: 500, useBackend: false }
            );
            
            this.routePins = routePins;
            
            if (routePins.length > 0) {
                this.showRouteReport(routePins);
            } else {
                this.hideRouteReport();
            }
            
        } catch (error) {
            console.error('Route PIN scanning error:', error);
        }
    }
    
    showRouteReport(routePins) {
        // Remove existing report panel
        this.hideRouteReport();
        
        // Create report panel
        this.reportPanel = document.createElement('div');
        this.reportPanel.id = 'route-report-panel';
        this.reportPanel.className = 'route-report';
        this.reportPanel.innerHTML = this.getReportHTML(routePins);
        
        // Add directly to body for highest z-index priority
        document.body.appendChild(this.reportPanel);
        
        // Bind pin click events
        this.bindReportEvents(routePins);
        
        // Close on ESC key
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.hideRouteReport();
        };
        document.addEventListener('keydown', this.escHandler);
    }
    
    getReportHTML(routePins) {
        const count = routePins.length;
        const plural = count === 1 ? 'kontroll' : 'kontroller';
        
        let pinsHTML = '';
        routePins.forEach((pin, index) => {
            const distanceKm = (pin.distanceAlongRoute / 1000).toFixed(1);
            pinsHTML += `
                <div class="report-pin-item" data-pin-id="${pin.id}">
                    <div class="pin-info">
                        <div class="pin-name">${pin.data?.name || 'Ukjent kontroll'}</div>
                        <div class="pin-distance">${distanceKm} km langs ruten</div>
                    </div>
                    <div class="pin-type">${this.getPinTypeIcon(pin.type)}</div>
                </div>
            `;
        });
        
        return `
            <div class="report-header">
                <h4>⚠️ ${count} ${plural} funnet på ruten</h4>
                <button id="close-report" class="report-close">✕</button>
            </div>
            <div class="report-content">
                ${pinsHTML}
            </div>
        `;
    }
    
    bindReportEvents(routePins) {
        // Close button
        document.getElementById('close-report').addEventListener('click', () => {
            this.hideRouteReport();
        });
        
        // Pin click events
        document.querySelectorAll('.report-pin-item').forEach(item => {
            item.addEventListener('click', () => {
                const pinId = item.dataset.pinId;
                const pin = routePins.find(p => p.id === pinId);
                if (pin) {
                    this.showPinDetails(pin);
                }
            });
        });
    }
    
    showPinDetails(pin) {
        // Zoom to pin on map
        this.mapCore.flyTo({
            center: [pin.lng, pin.lat],
            zoom: 15
        });
        
        // Close modal and log TODO
        this.hideRouteReport();
        console.log('TODO! Her må det en drawer/skuff funksjon til.');

        // Show pin popup
        const popup = new mapboxgl.Popup()
            .setLngLat([pin.lng, pin.lat])
            .setHTML(`
                <div class="pin-popup">
                    <h4>${this.getPinTypeIcon(pin.type)} ${pin.data?.name || 'Kontroll'}</h4>
                    <p><strong>Type:</strong> ${this.getPinTypeName(pin.type)}</p>
                    <p><strong>Avstand langs rute:</strong> ${(pin.distanceAlongRoute / 1000).toFixed(1)} km</p>
                    <p><strong>Avstand fra rute:</strong> ${Math.round(pin.distanceFromRoute)} m</p>
                    ${pin.data?.speed_limit ? `<p><strong>Fartsgrense:</strong> ${pin.data.speed_limit} km/h</p>` : ''}
                </div>
            `)
            .addTo(this.mapCore.map);
    }
    
    hideRouteReport() {
        if (this.reportPanel) {
            this.reportPanel.remove();
            this.reportPanel = null;
        }
        
        // Remove ESC listener
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    }
    
    // ==================== NAVIGATION MANAGEMENT ====================
    
    startNavigation() {
        if (!this.currentRoute || this.navigationInstructions.length === 0) {
            this.showNotification('Ingen rute å navigere', 'error');
            return;
        }
        
        this.isNavigating = true;
        this.currentInstructionIndex = 0;
        
        // Update UI
        const btn = document.getElementById('start-stop-navigation');
        btn.innerHTML = '⏹️ Stopp navigering';
        btn.classList.remove('primary');
        btn.classList.add('secondary');
        
        document.getElementById('nav-instructions').classList.remove('hidden');
        
        // Start GPS tracking for navigation
        this.startNavigationTracking();
        
        // Update instructions
        this.updateNavigationInstructions();
        
        this.showNotification('Navigering startet', 'success');
    }
    
    stopNavigation() {
        this.isNavigating = false;
        
        // Update UI
        const btn = document.getElementById('start-stop-navigation');
        btn.innerHTML = '🧭 Start navigering';
        btn.classList.remove('secondary');
        btn.classList.add('primary');
        
        document.getElementById('nav-instructions').classList.add('hidden');
        
        // Stop GPS tracking for navigation
        this.stopNavigationTracking();
        
        this.showNotification('Navigering stoppet', 'info');
    }
    
    startNavigationTracking() {
        // Listen to GPS updates from LocationProvider
        if (window.radarNavigationSystem && window.radarNavigationSystem.locationProvider) {
            this.locationProvider = window.radarNavigationSystem.locationProvider;
            this.locationProvider.onPositionUpdate((position) => {
                if (this.isNavigating) {
                    this.handleNavigationPositionUpdate(position);
                }
            });
        }
    }
    
    stopNavigationTracking() {
        // Navigation tracking stops but GPS can continue for other purposes
        this.currentPosition = null;
    }
    
    handleNavigationPositionUpdate(position) {
        this.currentPosition = position;
        
        // Calculate progress along route
        const progress = this.calculateRouteProgress(position);
        
        // Update current instruction if needed
        this.updateCurrentInstruction(progress);
        
        // Check if we need re-routing
        if (this.shouldReroute(position)) {
            this.performRerouting();
        }
    }
    
    calculateRouteProgress(position) {
        if (!this.currentRoute || !this.currentRoute.geometry) return null;
        
        // Use DistanceCalculator to find closest point on route
        const routeCoords = this.currentRoute.geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
        }));
        
        const analysis = window.DistanceCalculator.analyzePointToRoute(position, routeCoords);
        
        return {
            distanceFromRoute: analysis.distance,
            distanceAlongRoute: analysis.distanceAlongRoute,
            progress: analysis.progress
        };
    }
    
    updateCurrentInstruction(progress) {
        if (!progress || this.navigationInstructions.length === 0) return;
        
        // Find appropriate instruction based on progress
        let totalDistance = 0;
        let newInstructionIndex = 0;
        
        for (let i = 0; i < this.navigationInstructions.length; i++) {
            totalDistance += this.navigationInstructions[i].distance;
            if (progress.distanceAlongRoute <= totalDistance) {
                newInstructionIndex = i;
                break;
            }
        }
        
        // Update instruction if changed
        if (newInstructionIndex !== this.currentInstructionIndex) {
            this.currentInstructionIndex = newInstructionIndex;
            this.updateNavigationInstructions();
        }
    }
    
    updateNavigationInstructions() {
        if (this.navigationInstructions.length === 0) return;
        
        const currentInstruction = this.navigationInstructions[this.currentInstructionIndex];
        const nextInstruction = this.navigationInstructions[this.currentInstructionIndex + 1];
        
        // Update current instruction
        document.getElementById('current-instruction').textContent = currentInstruction.instruction;
        document.getElementById('current-distance').textContent = `${Math.round(currentInstruction.distance)}m`;
        document.getElementById('current-instruction-icon').textContent = this.getInstructionIcon(currentInstruction.type);
        
        // Update next instruction
        if (nextInstruction) {
            document.getElementById('next-instruction').textContent = nextInstruction.instruction;
        } else {
            document.getElementById('next-instruction').textContent = 'Destinasjon nådd';
        }
    }
    
    getInstructionIcon(type) {
        const icons = {
            'turn-right': '➡️',
            'turn-left': '⬅️',
            'turn-straight': '⬆️',
            'turn-slight-right': '↗️',
            'turn-slight-left': '↖️',
            'turn-sharp-right': '⤴️',
            'turn-sharp-left': '⤵️',
            'roundabout': '🔄',
            'roundabout-exit': '🔄',
            'merge': '🔀',
            'on-ramp': '🛣️',
            'off-ramp': '🛤️',
            'fork': '🍴',
            'continue': '⬆️',
            'arrive': '🏁'
        };
        
        return icons[type] || '➡️';
    }
    
    shouldReroute(position) {
        if (!this.currentPosition || this.isRerouting) return false;
        
        const progress = this.calculateRouteProgress(position);
        
        // Re-route if more than 100m from route for more than 10 seconds
        if (progress && progress.distanceFromRoute > 100) {
            // Could add timing logic here for persistence
            return true;
        }
        
        return false;
    }
    
    async performRerouting() {
        if (this.isRerouting || !this.currentPosition || !this.toCoords) return;
        
        this.isRerouting = true;
        this.showReroutingOverlay();
        
        try {
            // Calculate new route from current position to destination
            const avoidHighways = document.getElementById('avoid-highways').checked;
            const avoidTolls = document.getElementById('avoid-tolls').checked;
            
            let url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
                     `${this.currentPosition.lng},${this.currentPosition.lat};${this.toCoords.lng},${this.toCoords.lat}?` +
                     `geometries=geojson&steps=true&overview=full&` +
                     `access_token=${window.APP_CONFIG.mapboxToken}`;
            
            const excludes = [];
            if (avoidHighways) excludes.push('motorway');
            if (avoidTolls) excludes.push('toll');
            if (excludes.length > 0) {
                url += `&exclude=${excludes.join(',')}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Re-routing failed');
            
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                // Update route
                this.currentRoute = data.routes[0];
                this.displayRoute();
                this.extractNavigationInstructions();
                this.updateNavigationInstructions();
                
                // Scan new route for pins and report them
                await this.scanRouteForPins();
                
                this.showNotification('Rute oppdatert', 'success');
            }
            
        } catch (error) {
            console.error('Re-routing error:', error);
            this.showNotification('Re-routing feilet', 'error');
        } finally {
            this.isRerouting = false;
            this.hideReroutingOverlay();
        }
    }
    
    showReroutingOverlay() {
        document.getElementById('rerouting-overlay').classList.remove('hidden');
    }
    
    hideReroutingOverlay() {
        document.getElementById('rerouting-overlay').classList.add('hidden');
    }
    
    toggleNavigationPanel() {
        const content = this.navigationPanel.querySelector('.nav-content');
        const toggle = document.getElementById('nav-panel-toggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '−';
        } else {
            content.style.display = 'none';
            toggle.textContent = '+';
        }
    }
    
    hideNavigationPanel() {
        if (this.navigationPanel) {
            this.navigationPanel.remove();
            this.navigationPanel = null;
        }
    }
    
    // ==================== ROUTE MANAGEMENT ====================
    
    clearRoute() {
        // Stop navigation if active
        if (this.isNavigating) {
            this.stopNavigation();
        }
        
        // Clear route from map
        this.clearRouteFromMap();
        
        // Reset state
        this.currentRoute = null;
        this.routePins = [];
        this.navigationInstructions = [];
        this.currentInstructionIndex = 0;
        
        // Hide UI elements
        document.getElementById('route-info').classList.add('hidden');
        document.getElementById('clear-route').disabled = true;
        this.hideRouteReport();
        this.hideNavigationPanel();
        
        this.showNotification('Rute slettet', 'info');
    }
    
    clearRouteFromMap() {
        if (this.mapCore.hasLayer('route-layer')) {
            this.mapCore.removeLayer('route-layer');
        }
        if (this.mapCore.hasSource('route-source')) {
            this.mapCore.removeSource('route-source');
        }
    }
    
    // ==================== UI HELPERS ====================
    
    togglePanel() {
        const content = this.panel.querySelector('.route-content');
        const toggle = document.getElementById('route-panel-toggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '−';
        } else {
            content.style.display = 'none';
            toggle.textContent = '+';
        }
    }
    
    getPinTypeIcon(type) {
        const icons = {
            'radar': '📷',
            'police': '👮',
            'accident': '⚠️',
            'roadwork': '🚧'
        };
        return icons[type] || '📍';
    }
    
    getPinTypeName(type) {
        const names = {
            'radar': 'Radarkontroll',
            'police': 'Politikontroll',
            'accident': 'Ulykke',
            'roadwork': 'Veiarbeid'
        };
        return names[type] || 'Ukjent';
    }
    
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }
    
    // ==================== PUBLIC API ====================
    
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    getRoutePins() {
        return [...this.routePins];
    }
    
    hasActiveRoute() {
        return this.currentRoute !== null;
    }
}

// Make available globally
window.RouteManager = RouteManager;