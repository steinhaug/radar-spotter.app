// init.js - Initialize and integrate all system components

class RadarNavigationSystem {
    constructor() {
        // Core components
        this.locationProvider = null;
        this.mapCore = null;
        this.pinManager = null;
        this.proximityScanner = null;
        this.reportingEngine = null;
        
        // System state
        this.isInitialized = false;
        this.initializationPromise = null;
        this.currentMode = 'idle'; // 'idle', 'navigation', 'simulation'
        this.addPinModeActive = false;

        // Configuration from PHP
        this.config = window.APP_CONFIG || {
            mapboxToken: null,
            defaultCenter: [8.0059, 58.1467],
            defaultZoom: 12,
            apiBaseUrl: '/api'
        };
        
        // Event bindings
        this.eventBindings = [];
        
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    // ==================== SYSTEM INITIALIZATION ====================
    
    /**
     * Initialize the complete radar navigation system
     * @returns {Promise} Initialization promise
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }
    
    /**
     * Perform the actual initialization sequence
     */
    async performInitialization() {
        try {
            console.log('🚀 Starting Radar Navigation System initialization...');
            
            // Step 1: Validate configuration
            this.validateConfiguration();
            
            // Step 2: Initialize core components in order
            await this.initializeComponents();
            
            // Step 3: Load initial data
            await this.loadInitialData();
            
            // Step 4: Set up event integrations
            this.setupEventIntegrations();
            
            // Step 5: Bind UI events
            this.bindUIEvents();
            
            // Step 6: Start initial services
            this.startInitialServices();
            
            this.isInitialized = true;
            console.log('✅ Radar Navigation System initialized successfully');
            
            // Emit system ready event
            this.emitSystemEvent('systemReady', {
                timestamp: Date.now(),
                components: this.getComponentStatus()
            });
            
        } catch (error) {
            console.error('❌ System initialization failed:', error);
            this.emitSystemEvent('systemError', { error });
            throw error;
        }
    }
    
    /**
     * Validate system configuration
     */
    validateConfiguration() {
        if (!this.config.mapboxToken) {
            throw new Error('MapBox access token is required');
        }
        
        if (!this.config.defaultCenter || this.config.defaultCenter.length !== 2) {
            throw new Error('Invalid default center coordinates');
        }
        
        console.log('✓ Configuration validated');
    }
    
    /**
     * Initialize core components in dependency order
     */
    async initializeComponents() {
        console.log('🔧 Initializing core components...');
        
        // 1. LocationProvider (no dependencies)
        this.locationProvider = new LocationProvider();
        console.log('✓ LocationProvider initialized');
        
        // 2. ReportingEngine (no dependencies)
        this.reportingEngine = new ReportingEngine();
        console.log('✓ ReportingEngine initialized');
        
        // 3. MapCore (requires config)
        this.mapCore = new MapCore('map', {
            accessToken: this.config.mapboxToken,
            center: this.config.defaultCenter,
            zoom: this.config.defaultZoom
        });
        
        // Wait for map to be ready
        await this.waitForMapReady();

        // Force resize after everything is loaded
        setTimeout(() => {
            this.mapCore.map.resize();
        }, 500);

        console.log('✓ MapCore initialized');
        
        // 4. PinManager (requires MapCore)
        this.pinManager = new PinManager(this.mapCore);
        console.log('✓ PinManager initialized');
        
        // 5. ProximityScanner (requires PinManager, LocationProvider, ReportingEngine)
        this.proximityScanner = new ProximityScanner(
            this.pinManager,
            this.locationProvider,
            this.reportingEngine
        );
        console.log('✓ ProximityScanner initialized');

        // 6. RouteManager (requires MapCore, ProximityScanner, PinManager)
        this.routeManager = new RouteManager(
            this.mapCore,
            this.proximityScanner,
            this.pinManager
        );
        console.log('✓ RouteManager initialized');

    }
    
    /**
     * Wait for map to be ready
     */
    waitForMapReady() {
        return new Promise((resolve) => {
            if (this.mapCore.isInitialized) {
                resolve();
            } else {
                this.mapCore.map.on('load', resolve);  // Bruk MapBox direkte
            }
        });
    }
    
    /**
     * Load initial data from backend
     */
    async loadInitialData() {
        console.log('📡 Loading initial data...');
        
        try {
            // Load all pins from backend
            const response = await fetch(`${this.config.apiBaseUrl}/pins/all`);
            if (response.ok) {
                const data = await response.json();
                this.pinManager.loadPins(data.pins || []);
                console.log(`✓ Loaded ${data.pins?.length || 0} pins from backend`);
                
                // Store timestamp for delta updates
                this.lastPinUpdate = data.timestamp;
            } else {
                console.warn('Failed to load pins from backend, using demo data');
                this.loadDemoPins();
            }
            
        } catch (error) {
            console.warn('Backend not available, using demo data:', error);
            this.loadDemoPins();
        }
    }
    
    /**
     * Load demo pins for development/testing
     */
    loadDemoPins() {
        const demoPins = [
            {
                id: 'demo_1',
                lng: 8.0059,
                lat: 58.1467,
                type: 'radar',
                data: { name: 'E18 Sør', speed_limit: 80 }
            },
            {
                id: 'demo_2',
                lng: 7.9956,
                lat: 58.1599,
                type: 'radar',
                data: { name: 'Vågsbygd', speed_limit: 60 }
            },
            {
                id: 'demo_3',
                lng: 8.0194,
                lat: 58.1525,
                type: 'police',
                data: { name: 'Sentrum kontroll' }
            }
        ];
        
        this.pinManager.loadPins(demoPins);
        console.log(`✓ Loaded ${demoPins.length} demo pins`);
    }
    
    // ==================== EVENT INTEGRATIONS ====================
    
    /**
     * Set up event integrations between components
     */
    setupEventIntegrations() {
        console.log('🔗 Setting up event integrations...');
        
        // LocationProvider -> UI updates
        this.locationProvider.onPositionUpdate((position) => {
            this.updateLocationDisplay(position);
        });
        
        this.locationProvider.onStatusChange((status) => {
            this.updateGPSStatus(status);
        });
        
        // LocationProvider -> Map position updates
        this.locationProvider.onPositionUpdate((position) => {
            this.updateMapPosition(position);
            this.updateLocationDisplay(position);
        });

        // ProximityScanner -> Alert system
        this.proximityScanner.onPinAlert((alert) => {
            this.showPinAlert(alert);
        });
        
        this.proximityScanner.onRoutePinAlert((alert) => {
            this.showRoutePinAlert(alert);
        });
        
        // ReportingEngine -> Statistics
        this.reportingEngine.onPinReported((report) => {
            this.updateReportStatistics();
        });
        
        this.reportingEngine.onDuplicateBlocked((event) => {
            console.log('Duplicate report blocked:', event);
        });
        
        // MapCore -> Style preservation
        this.mapCore.addEventListener('styleChanging', () => {
            // Pins will be automatically restored by MapCore's layer restoration
        });
        
        console.log('✓ Event integrations configured');
    }
    
    // ==================== UI EVENT BINDINGS ====================
    
    /**
     * Bind UI control events
     */
    bindUIEvents() {
        console.log('🎮 Binding UI events...');
        
        // Navigation controls
        this.bindEvent('start-navigation', 'click', () => this.startNavigation());
        this.bindEvent('stop-navigation', 'click', () => this.stopNavigation());
        this.bindEvent('center-map', 'click', () => this.centerOnPosition());
        
        // GPS simulation controls
        this.bindEvent('start-simulation', 'click', () => this.startSimulation());
        this.bindEvent('stop-simulation', 'click', () => this.stopSimulation());
        this.bindEvent('load-gps-log', 'click', () => this.loadGPSLog());
        this.bindEvent('generate-from-route', 'click', () => this.generateFromRoute());
        
        // Pin controls
        this.bindEvent('toggle-pins', 'click', () => this.togglePins());
        this.bindEvent('add-pin-mode', 'click', () => this.toggleAddPinMode());
        
        // File upload
        this.bindEvent('gps-log-upload', 'change', (e) => this.handleFileUpload(e));
        
        // Map control buttons
        this.bindEvent('zoom-in', 'click', () => this.mapCore.map.zoomIn());
        this.bindEvent('zoom-out', 'click', () => this.mapCore.map.zoomOut());
        this.bindEvent('locate-me', 'click', () => this.centerOnPosition());
        this.bindEvent('fullscreen', 'click', () => this.toggleFullscreen());

        console.log('✓ UI events bound');
    }
    
    /**
     * Helper to bind event with tracking
     */
    bindEvent(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
            this.eventBindings.push({ element, eventType, handler });
        } else {
            console.warn(`Element not found: ${elementId}`);
        }
    }
    
    // ==================== CORE FUNCTIONALITY ====================
    
    /**
     * Start navigation mode
     */
    async startNavigation() {
        try {
            this.currentMode = 'navigation';
            
            // Start location tracking
            this.locationProvider.start('real');
            
            // Start proximity scanning
            this.proximityScanner.startProximityScanning({
                proximityRadius: 2000,
                scanThreshold: 100
            });
            
            this.updateUIState();
            this.updateStatus('gps-status', 'Starting GPS...');
            
            console.log('🧭 Navigation started');
            
        } catch (error) {
            console.error('Failed to start navigation:', error);
            this.updateStatus('gps-status', 'Navigation failed');
        }
    }
    
    /**
     * Stop navigation mode
     */
    stopNavigation() {
        this.currentMode = 'idle';
        
        // Stop location tracking
        this.locationProvider.stop();
        
        // Stop proximity scanning
        this.proximityScanner.stopProximityScanning();
        
        this.updateUIState();
        this.updateStatus('gps-status', 'GPS stopped');
        
        console.log('⏹️ Navigation stopped');
    }
    
    /**
     * Start GPS simulation
     */
    startSimulation() {
        this.currentMode = 'simulation';
        
        // Start location provider in simulation mode
        this.locationProvider.start('simulation');
        
        // Start proximity scanning
        this.proximityScanner.startProximityScanning();
        
        this.updateUIState();
        console.log('🎬 Simulation started');
    }
    
    /**
     * Stop GPS simulation
     */
    stopSimulation() {
        this.currentMode = 'idle';
        
        this.locationProvider.stop();
        this.proximityScanner.stopProximityScanning();
        
        this.updateUIState();
        console.log('⏹️ Simulation stopped');
    }
    
    /**
     * Center map on current position
     */
    centerOnPosition() {
        const position = this.locationProvider.getCurrentPosition();
        if (position) {
            this.mapCore.flyTo({
                center: [position.lng, position.lat],
                zoom: 15
            });
        } else {
            console.warn('No current position available');
        }
    }
    

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.getElementById('map-container').requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Toggle pins visibility
     */
    togglePins() {
        this.pinManager.toggleVisibility();
    }
    
    /**
     * Toggle add pin mode
     */
    toggleAddPinMode() {
        const btn = document.getElementById('add-pin-mode');
        
        if (!this.addPinModeActive) {
            // Activate add pin mode
            this.addPinModeActive = true;
            btn.textContent = '❌ Avbryt';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-warning');
            this.mapCore.map.getCanvas().style.cursor = 'crosshair';
            
            // Add click handler for map
            this.mapClickHandler = (e) => {
                this.addPinAtLocation(e.lngLat.lng, e.lngLat.lat);
            };
            this.mapCore.map.on('click', this.mapClickHandler);
            
            this.updateStatus('gps-status', 'Klikk på kartet for å legge til PIN');
        } else {
            this.deactivateAddPinMode();
        }
    }

    deactivateAddPinMode() {
        this.addPinModeActive = false;
        const btn = document.getElementById('add-pin-mode');
        btn.textContent = '➕ Legg til Pin';
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-secondary');
        this.mapCore.map.getCanvas().style.cursor = '';
        
        if (this.mapClickHandler) {
            this.mapCore.map.off('click', this.mapClickHandler);
            this.mapClickHandler = null;
        }
    }

    addPinAtLocation(lng, lat) {
        const pinId = this.pinManager.insertPin(lng, lat, 'radar', {
            name: `Ny kontroll ${Date.now()}`,
            created_by: 'user'
        });
        
        this.deactivateAddPinMode();
        this.updateStatus('gps-status', 'PIN lagt til');
        console.log('PIN added:', pinId);
    }

    // ==================== FILE HANDLING ====================
    
    /**
     * Load GPS log file
     */
    loadGPSLog() {
        document.getElementById('gps-log-upload').click();
    }
    
    /**
     * Handle GPS log file upload
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseGPSLog(e.target.result, file.name);
            } catch (error) {
                console.error('Failed to parse GPS log:', error);
                this.updateStatus('gps-status', 'GPS log parsing failed');
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * Parse GPS log and load into simulation
     */
    parseGPSLog(content, fileName) {
        // Simple JSON format support for now
        try {
            const gpsData = JSON.parse(content);
            this.locationProvider.loadSimulationData(gpsData);
            this.updateStatus('gps-status', `GPS log loaded: ${fileName}`);
        } catch (error) {
            console.error('GPS log must be in JSON format:', error);
            this.updateStatus('gps-status', 'Invalid GPS log format');
        }
    }
    
    /**
     * Generate GPS log from current route (placeholder)
     */
    generateFromRoute() {
        if (this.routeManager && this.routeManager.hasActiveRoute()) {
            const route = this.routeManager.getCurrentRoute();
            const gpsLog = this.convertRouteToGpsLog(route);
            
            if (gpsLog && gpsLog.length > 0) {
                // Load into LocationProvider with timing
                this.locationProvider.loadSimulationData(gpsLog, route.duration * 1000 / gpsLog.length);
                this.updateStatus('gps-status', `GPS-logg generert: ${gpsLog.length} punkter (${Math.round(route.duration/60)} min)`);
            } else {
                this.updateStatus('gps-status', 'Ingen rute å konvertere');
            }
        } else {
            this.updateStatus('gps-status', 'Beregn rute først');
        }
    }
    
    /**
     * Convert Mapbox route to GPS simulation data
     */
    convertRouteToGpsLog(route) {
        if (!route || !route.geometry || !route.geometry.coordinates) {
            return [];
        }
        
        const coordinates = route.geometry.coordinates;
        const totalDuration = route.duration; // seconds
        const gpsLog = [];
        
        coordinates.forEach((coord, index) => {
            const [lng, lat] = coord;
            
            // Calculate progress along route (0 to 1)
            const progress = index / (coordinates.length - 1);
            
            // Calculate timestamp based on progress
            const timestamp = Date.now() + (progress * totalDuration * 1000);
            
            // Calculate speed based on route segments
            let speed = 50; // Default 50 km/h
            if (route.legs && route.legs[0] && route.legs[0].steps) {
                // Find corresponding step for more accurate speed
                speed = this.estimateSpeedFromRoute(route, progress);
            }
            
            // Calculate heading to next point
            let heading = 0;
            if (index < coordinates.length - 1) {
                const nextCoord = coordinates[index + 1];
                heading = this.calculateHeading(lat, lng, nextCoord[1], nextCoord[0]);
            } else if (index > 0) {
                const prevCoord = coordinates[index - 1];
                heading = this.calculateHeading(prevCoord[1], prevCoord[0], lat, lng);
            }
            
            gpsLog.push({
                lat: lat,
                lng: lng,
                speed: speed / 3.6, // Convert km/h to m/s for GPS format
                heading: heading,
                accuracy: 3 + Math.random() * 4, // 3-7m accuracy simulation
                timestamp: timestamp,
                altitude: null,
                altitudeAccuracy: null
            });
        });
        
        return gpsLog;
    }
    
    /**
     * Estimate speed based on route progress and road type
     */
    estimateSpeedFromRoute(route, progress) {
        // Simple speed estimation based on route type
        const legs = route.legs[0];
        if (!legs || !legs.steps) return 50;
        
        // Find current step based on progress
        let accumulatedDistance = 0;
        const totalDistance = route.distance;
        const targetDistance = progress * totalDistance;
        
        for (const step of legs.steps) {
            accumulatedDistance += step.distance;
            if (accumulatedDistance >= targetDistance) {
                // Estimate speed based on maneuver type and road class
                return this.getSpeedForManeuver(step.maneuver);
            }
        }
        
        return 50; // Default
    }
    
    /**
     * Get realistic speed for maneuver type
     */
    getSpeedForManeuver(maneuver) {
        const maneuverType = maneuver.type || '';
        
        // Speed based on maneuver type
        if (maneuverType.includes('roundabout')) return 25;
        if (maneuverType.includes('turn')) return 35;
        if (maneuverType.includes('merge')) return 60;
        if (maneuverType.includes('ramp')) return 45;
        if (maneuverType === 'continue' || maneuverType === 'straight') return 70;
        
        return 50; // Default urban speed
    }
    
    /**
     * Calculate heading between two points
     */
    calculateHeading(lat1, lng1, lat2, lng2) {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        
        const x = Math.sin(dLng) * Math.cos(lat2Rad);
        const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                 Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
        
        let heading = Math.atan2(x, y) * 180 / Math.PI;
        return (heading + 360) % 360;
    }
    
    // ==================== UI UPDATES ====================
    
    /**
     * Update location display in UI
     */
    updateLocationDisplay(position) {
        // Update coordinate displays if they exist
        const elements = {
            'gps-lat': position.lat.toFixed(6),
            'gps-lng': position.lng.toFixed(6),
            'gps-accuracy': Math.round(position.accuracy || 0) + 'm'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    updateMapPosition(position) {
        // Ensure user position source exists
        if (!this.mapCore.hasSource('user-position')) {
            this.mapCore.addSource('user-position', {
                type: 'geojson',
                data: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            });
            
            this.mapCore.addLayer({
                id: 'user-position-layer',
                type: 'circle',
                source: 'user-position',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#007bff',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }
        
        // Update position
        this.mapCore.updateSourceData('user-position', {
            type: 'Point',
            coordinates: [position.lng, position.lat]
        });
    }

    /**
     * Update GPS status display
     */
    updateGPSStatus(status) {
        this.updateStatus('gps-status', status.message);
        
        // Update navigation status
        if (status.active) {
            this.updateStatus('nav-status', this.currentMode === 'simulation' ? 'Simulation' : 'Active');
        } else {
            this.updateStatus('nav-status', 'Inactive');
        }
    }
    
    /**
     * Update UI state based on current mode
     */
    updateUIState() {
        const buttons = {
            'start-navigation': this.currentMode === 'idle',
            'stop-navigation': this.currentMode === 'navigation',
            'start-simulation': this.currentMode === 'idle',
            'stop-simulation': this.currentMode === 'simulation'
        };
        
        Object.entries(buttons).forEach(([id, enabled]) => {
            const element = document.getElementById(id);
            if (element) element.disabled = !enabled;
        });
    }
    
    /**
     * Update status display
     */
    updateStatus(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    /**
     * Update report statistics display
     */
    updateReportStatistics() {
        const stats = this.reportingEngine.getStatistics();
        // Update stats display if elements exist
        console.log('Report statistics:', stats);
    }
    
    // ==================== ALERT SYSTEM ====================
    
    /**
     * Show pin proximity alert
     */
    showPinAlert(alert) {
        console.log('📍 Pin alert:', alert);
        
        // Show warning overlay if it exists
        const warningElement = document.getElementById('radar-warning');
        if (warningElement) {
            const distanceElement = document.getElementById('warning-distance');
            if (distanceElement) {
                distanceElement.textContent = `${Math.round(alert.distance)}m fremover`;
            }
            
            warningElement.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                warningElement.classList.add('hidden');
            }, 5000);
        }
    }
    
    /**
     * Show route pin alert
     */
    showRoutePinAlert(alert) {
        console.log('🛣️ Route pin alert:', alert);
        // Could show different type of alert for route-based pins
    }
    
    // ==================== SERVICE MANAGEMENT ====================
    
    /**
     * Start initial background services
     */
    startInitialServices() {
        // Start pin update polling
        this.startPinUpdatePolling();
    
        // Auto-start navigation
        setTimeout(() => {
            this.startNavigation();
        }, 1000); // 1 sekund delay for at alt skal være klart
        
        console.log('⚙️ Background services started');
    }
    
    /**
     * Start polling for pin updates
     */
    startPinUpdatePolling() {
        setInterval(async () => {
            await this.checkForPinUpdates();
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    
    /**
     * Check for pin updates from backend
     */
    async checkForPinUpdates() {
        if (!this.lastPinUpdate) return;
        
        try {
            const response = await fetch(
                `${this.config.apiBaseUrl}/pins/changes?since=${this.lastPinUpdate}`
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.added?.length || data.updated?.length || data.deleted?.length) {
                    this.pinManager.applyDelta(data);
                    this.lastPinUpdate = data.timestamp;
                    console.log('📍 Pin updates applied:', data);
                }
            }
            
        } catch (error) {
            console.error('Failed to check for pin updates:', error);
        }
    }
    
    // ==================== SYSTEM STATUS ====================
    
    /**
     * Get system component status
     */
    getComponentStatus() {
        return {
            locationProvider: !!this.locationProvider,
            mapCore: this.mapCore?.isInitialized || false,
            pinManager: !!this.pinManager,
            proximityScanner: !!this.proximityScanner,
            reportingEngine: !!this.reportingEngine
        };
    }
    
    /**
     * Get system statistics
     */
    getSystemStatistics() {
        return {
            mode: this.currentMode,
            initialized: this.isInitialized,
            pins: this.pinManager?.getStatistics(),
            proximity: this.proximityScanner?.getStatistics(),
            reporting: this.reportingEngine?.getStatistics(),
            location: {
                isTracking: this.locationProvider?.isTracking(),
                mode: this.locationProvider?.getMode(),
                currentPosition: this.locationProvider?.getCurrentPosition()
            }
        };
    }
    
    /**
     * Emit system-level event
     */
    emitSystemEvent(eventType, data) {
        window.dispatchEvent(new CustomEvent(`radar:${eventType}`, { detail: data }));
    }
    
    // ==================== CLEANUP ====================
    
    /**
     * Clean up system resources
     */
    destroy() {
        // Stop all services
        this.stopNavigation();
        
        // Unbind events
        this.eventBindings.forEach(({ element, eventType, handler }) => {
            element.removeEventListener(eventType, handler);
        });
        this.eventBindings = [];
        
        // Destroy components
        this.proximityScanner?.destroy();
        this.mapCore?.destroy();
        
        this.isInitialized = false;
        console.log('🗑️ System destroyed');
    }
}

// Initialize the system
window.radarNavigationSystem = new RadarNavigationSystem();

// Global convenience methods
window.startNavigation = () => window.radarNavigationSystem.startNavigation();
window.stopNavigation = () => window.radarNavigationSystem.stopNavigation();
window.getSystemStatus = () => window.radarNavigationSystem.getSystemStatistics();