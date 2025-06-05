// init.js - Initialize and coordinate all system components

class RadarNavigationApp {
    constructor() {
        // Core components
        this.locationProvider = null;
        this.mapCore = null;
        this.pinManager = null;
        this.proximityScanner = null;
        this.reportingEngine = null;
        
        // State management
        this.isInitialized = false;
        this.isNavigationActive = false;
        this.currentRoute = null;
        
        // UI elements cache
        this.ui = {
            statusElements: new Map(),
            controls: new Map()
        };
        
        // Configuration
        this.config = {
            mapContainer: 'map',
            defaultProximityRadius: 2000,
            defaultScanThreshold: 100,
            enableDebugMode: false
        };
        
        this.init();
    }
    
    // ==================== INITIALIZATION ====================
    
    async init() {
        try {
            console.log('🚀 Initializing Radar Navigation System...');
            
            // Check for required configuration
            this.validateConfiguration();
            
            // Initialize core components in order
            await this.initializeComponents();
            
            // Set up integrations between components
            this.setupIntegrations();
            
            // Bind UI event handlers
            this.bindUIEvents();
            
            // Load initial data
            await this.loadInitialData();
            
            // System ready
            this.isInitialized = true;
            this.updateStatus('system-status', 'System ready');
            
            console.log('✅ Radar Navigation System initialized successfully');
            
            // Emit ready event for external integrations
            window.dispatchEvent(new CustomEvent('radarSystemReady', {
                detail: { app: this }
            }));
            
        } catch (error) {
            console.error('❌ Failed to initialize system:', error);
            this.updateStatus('system-status', 'Initialization failed');
            this.showError('System initialization failed. Please reload the page.');
        }
    }
    
    validateConfiguration() {
        if (!window.APP_CONFIG) {
            throw new Error('APP_CONFIG not found. Please check config.php');
        }
        
        if (!window.APP_CONFIG.mapboxToken) {
            throw new Error('Mapbox token not configured');
        }
        
        if (!document.getElementById(this.config.mapContainer)) {
            throw new Error(`Map container '${this.config.mapContainer}' not found`);
        }
    }
    
    async initializeComponents() {
        // 1. Initialize reporting engine first (no dependencies)
        console.log('📊 Initializing ReportingEngine...');
        this.reportingEngine = new ReportingEngine();
        
        // 2. Initialize location provider
        console.log('📍 Initializing LocationProvider...');
        this.locationProvider = new LocationProvider();
        
        // 3. Initialize map core
        console.log('🗺️ Initializing MapCore...');
        this.mapCore = new MapCore(this.config.mapContainer, {
            accessToken: window.APP_CONFIG.mapboxToken,
            center: window.APP_CONFIG.defaultCenter,
            zoom: window.APP_CONFIG.defaultZoom
        });
        
        // Wait for map to be ready
        await this.waitForMapReady();
        
        // 4. Initialize pin manager (depends on map core)
        console.log('📌 Initializing PinManager...');
        this.pinManager = new PinManager(this.mapCore);
        
        // 5. Initialize proximity scanner (depends on pin manager and location provider)
        console.log('🔍 Initializing ProximityScanner...');
        this.proximityScanner = new ProximityScanner(
            this.pinManager,
            this.locationProvider,
            this.reportingEngine
        );
    }
    
    waitForMapReady() {
        return new Promise((resolve) => {
            if (this.mapCore.isInitialized) {
                resolve();
            } else {
                this.mapCore.addEventListener('mapReady', () => resolve(), { once: true });
            }
        });
    }
    
    // ==================== COMPONENT INTEGRATION ====================
    
    setupIntegrations() {
        console.log('🔗 Setting up component integrations...');
        
        // Location provider events
        this.locationProvider.onPositionUpdate((position) => {
            this.handlePositionUpdate(position);
        });
        
        this.locationProvider.onStatusChange((status) => {
            this.handleLocationStatusChange(status);
        });
        
        this.locationProvider.onError((error) => {
            this.handleLocationError(error);
        });
        
        // Map events
        this.mapCore.addEventListener('mapMove', (e) => {
            this.handleMapMove(e.detail);
        });
        
        this.mapCore.addEventListener('styleChanged', () => {
            // Restore pin layers after style change
            this.pinManager.restoreLayers();
        });
        
        // Proximity scanner events
        this.proximityScanner.onPinAlert((alert) => {
            this.handlePinAlert(alert);
        });
        
        this.proximityScanner.onRoutePinAlert((alert) => {
            this.handleRoutePinAlert(alert);
        });
        
        this.proximityScanner.onProximityResults((results) => {
            this.handleProximityResults(results);
        });
        
        // Reporting engine events
        this.reportingEngine.onPinReported((report) => {
            console.log('📊 Pin reported:', report.pinId);
        });
        
        this.reportingEngine.onDuplicateBlocked((data) => {
            console.log('🚫 Duplicate report blocked:', data.pinId);
        });
        
        // Add analytics hooks
        this.setupAnalyticsHooks();
    }
    
    setupAnalyticsHooks() {
        // Pin alert analytics
        this.reportingEngine.addHook('pinReported', (report) => {
            if (window.gtag) {
                gtag('event', 'pin_alert', {
                    pin_type: report.metadata.pinType,
                    context: report.context,
                    distance: report.metadata.distance
                });
            }
        });
        
        // Route creation analytics
        this.reportingEngine.addHook('routeReported', (report) => {
            if (window.gtag) {
                gtag('event', 'route_created', {
                    distance: report.routeData.distance,
                    profile: report.routeData.profile
                });
            }
        });
    }
    
    // ==================== EVENT HANDLERS ====================
    
    handlePositionUpdate(position) {
        this.updateStatus('gps-lat', position.lat.toFixed(6));
        this.updateStatus('gps-lng', position.lng.toFixed(6));
        this.updateStatus('gps-accuracy', Math.round(position.accuracy) + 'm');
        
        if (this.isNavigationActive) {
            this.updateNavigationDisplay(position);
        }
    }
    
    handleLocationStatusChange(status) {
        this.updateStatus('gps-status', status.message);
        
        if (status.active && status.mode === 'simulation') {
            this.updateStatus('nav-mode', 'Simulering');
        } else if (status.active) {
            this.updateStatus('nav-mode', 'GPS');
        } else {
            this.updateStatus('nav-mode', 'Inaktiv');
        }
    }
    
    handleLocationError(error) {
        this.updateStatus('gps-status', error.message);
        console.error('Location error:', error);
    }
    
    handleMapMove(mapState) {
        // Update map center coordinates in UI
        this.updateStatus('center-lat', mapState.center.lat.toFixed(6));
        this.updateStatus('center-lng', mapState.center.lng.toFixed(6));
        this.updateStatus('current-zoom', mapState.zoom.toFixed(1));
        this.updateStatus('current-bearing', Math.round(mapState.bearing) + '°');
        this.updateStatus('current-pitch', Math.round(mapState.pitch) + '°');
    }
    
    handlePinAlert(alert) {
        console.log('🚨 PIN Alert:', alert);
        
        // Show visual warning
        this.showPinWarning(alert);
        
        // Play sound if enabled
        this.playAlertSound();
        
        // Update nearest pin status
        this.updateStatus('nearest-pin', alert.pin.data.name || `PIN ${alert.pin.id}`);
        this.updateStatus('nearest-distance', Math.round(alert.distance) + 'm');
    }
    
    handleRoutePinAlert(alert) {
        console.log('🛣️ Route PIN Alert:', alert);
        
        // Add to route pins list or update UI
        this.updateRoutePinsList(alert);
    }
    
    handleProximityResults(results) {
        // Update proximity statistics
        this.updateStatus('pins-in-range', results.pinsFound.length);
        
        if (results.pinsFound.length > 0) {
            const closest = results.pinsFound[0]; // Already sorted by distance
            this.updateStatus('nearest-pin', closest.data.name || `PIN ${closest.id}`);
            this.updateStatus('nearest-distance', Math.round(closest.distance) + 'm');
        } else {
            this.updateStatus('nearest-pin', 'Ingen');
            this.updateStatus('nearest-distance', '-');
        }
    }
    
    // ==================== UI EVENT BINDING ====================
    
    bindUIEvents() {
        // Navigation controls
        this.bindButton('start-navigation', () => this.startNavigation());
        this.bindButton('stop-navigation', () => this.stopNavigation());
        this.bindButton('center-map', () => this.centerOnPosition());
        
        // GPS simulation controls
        this.bindButton('start-simulation', () => this.startSimulation());
        this.bindButton('stop-simulation', () => this.stopSimulation());
        this.bindButton('load-gps-log', () => this.loadGpsLog());
        
        // Pin controls
        this.bindButton('toggle-pins', () => this.togglePinsVisibility());
        this.bindButton('add-pin-mode', () => this.toggleAddPinMode());
        
        // Map style controls (if available)
        this.bindMapStyleControls();
        
        // File input for GPS logs
        const fileInput = document.getElementById('gps-log-upload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleGpsLogUpload(e));
        }
    }
    
    bindButton(buttonId, handler) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', handler);
            this.ui.controls.set(buttonId, button);
        }
    }
    
    bindMapStyleControls() {
        // Bind map style buttons if they exist
        const styleButtons = document.querySelectorAll('[data-map-style]');
        styleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const style = button.dataset.mapStyle;
                this.changeMapStyle(style);
            });
        });
    }
    
    // ==================== NAVIGATION CONTROL ====================
    
    startNavigation() {
        if (!this.isInitialized) {
            this.showError('System not ready');
            return;
        }
        
        this.isNavigationActive = true;
        this.locationProvider.start('real');
        this.proximityScanner.startProximityScanning({
            radius: this.config.defaultProximityRadius,
            threshold: this.config.defaultScanThreshold
        });
        
        this.updateStatus('nav-status', 'Aktiv');
        this.updateNavigationButtons();
        
        console.log('🧭 Navigation started');
    }
    
    stopNavigation() {
        this.isNavigationActive = false;
        this.locationProvider.stop();
        this.proximityScanner.stopProximityScanning();
        
        this.updateStatus('nav-status', 'Inaktiv');
        this.updateStatus('gps-status', 'Frakoblet');
        this.updateNavigationButtons();
        
        console.log('⏹️ Navigation stopped');
    }
    
    centerOnPosition() {
        const position = this.locationProvider.getCurrentPosition();
        if (position) {
            this.mapCore.flyTo({
                center: [position.lng, position.lat],
                zoom: 15
            });
        } else {
            this.showError('No GPS position available');
        }
    }
    
    // ==================== SIMULATION CONTROL ====================
    
    startSimulation() {
        if (!this.isInitialized) {
            this.showError('System not ready');
            return;
        }
        
        // Stop real GPS if running
        if (this.locationProvider.mode === 'real') {
            this.locationProvider.stop();
        }
        
        this.isNavigationActive = true;
        this.locationProvider.start('simulation');
        this.proximityScanner.startProximityScanning();
        
        this.updateStatus('nav-status', 'Simulering');
        console.log('🎮 Simulation started');
    }
    
    stopSimulation() {
        this.locationProvider.stop();
        this.proximityScanner.stopProximityScanning();
        this.isNavigationActive = false;
        
        this.updateStatus('nav-status', 'Inaktiv');
        console.log('⏹️ Simulation stopped');
    }
    
    loadGpsLog() {
        const fileInput = document.getElementById('gps-log-upload');
        if (fileInput) {
            fileInput.click();
        }
    }
    
    handleGpsLogUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const gpsLog = this.parseGpsLog(e.target.result, file.name);
                this.locationProvider.loadSimulationData(gpsLog);
                this.updateStatus('gps-status', `GPS logg lastet: ${gpsLog.length} punkter`);
            } catch (error) {
                console.error('Failed to load GPS log:', error);
                this.showError('Failed to load GPS log');
            }
        };
        reader.readAsText(file);
    }
    
    parseGpsLog(content, fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'json':
                return JSON.parse(content);
            case 'gpx':
                return this.parseGpxContent(content);
            default:
                throw new Error(`Unsupported file format: ${extension}`);
        }
    }
    
    parseGpxContent(content) {
        // Basic GPX parsing - could be enhanced
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const trackPoints = xmlDoc.getElementsByTagName('trkpt');
        
        const gpsLog = [];
        for (let i = 0; i < trackPoints.length; i++) {
            const point = trackPoints[i];
            gpsLog.push({
                lat: parseFloat(point.getAttribute('lat')),
                lng: parseFloat(point.getAttribute('lon')),
                timestamp: Date.now() + (i * 2000), // 2 second intervals
                accuracy: 5,
                speed: 50 // Default speed
            });
        }
        
        return gpsLog;
    }
    
    // ==================== PIN MANAGEMENT ====================
    
    togglePinsVisibility() {
        this.pinManager.toggleVisibility();
        const button = this.ui.controls.get('toggle-pins');
        if (button) {
            button.textContent = this.pinManager.isVisible ? 'Skjul PINs' : 'Vis PINs';
        }
    }
    
    toggleAddPinMode() {
        // Toggle add pin mode on map click
        // Implementation would depend on how you want to add pins
        console.log('Add pin mode toggled');
    }
    
    // ==================== DATA LOADING ====================
    
    async loadInitialData() {
        try {
            console.log('📥 Loading initial data...');
            
            // Load all pins from backend
            const response = await fetch('/api/pins/all');
            if (response.ok) {
                const data = await response.json();
                this.pinManager.loadPins(data.pins);
                this.updateStatus('pins-loaded', data.pins.length);
                console.log(`✅ Loaded ${data.pins.length} pins`);
            }
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            // Continue anyway - app can work without backend data
        }
    }
    
    // ==================== UI HELPERS ====================
    
    updateStatus(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.value = value;
            } else {
                element.textContent = value;
            }
            this.ui.statusElements.set(elementId, element);
        }
    }
    
    updateNavigationButtons() {
        const startBtn = this.ui.controls.get('start-navigation');
        const stopBtn = this.ui.controls.get('stop-navigation');
        
        if (startBtn && stopBtn) {
            startBtn.disabled = this.isNavigationActive;
            stopBtn.disabled = !this.isNavigationActive;
        }
    }
    
    updateNavigationDisplay(position) {
        // Update speed and heading if available
        if (position.calculatedSpeed !== undefined) {
            const speedKmh = Math.round(position.calculatedSpeed * 3.6); // m/s to km/h
            this.updateStatus('current-speed', speedKmh + ' km/h');
        }
        
        if (position.calculatedHeading !== undefined) {
            this.updateStatus('current-heading', Math.round(position.calculatedHeading) + '°');
        }
    }
    
    showPinWarning(alert) {
        // Create or update warning display
        const warningEl = document.getElementById('pin-warning');
        if (warningEl) {
            warningEl.style.display = 'block';
            warningEl.querySelector('.warning-text').textContent = 
                `PIN ${alert.pin.type} om ${Math.round(alert.distance)}m`;
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                warningEl.style.display = 'none';
            }, 5000);
        }
    }
    
    showError(message) {
        console.error(message);
        alert(message); // Simple error display - could be enhanced
    }
    
    playAlertSound() {
        // Play alert sound if enabled
        if (this.config.enableSounds) {
            // Implementation would play an audio alert
        }
    }
    
    changeMapStyle(style) {
        this.mapCore.changeStyle(style);
    }
    
    updateRoutePinsList(alert) {
        // Update route pins display
        console.log('Route pin found:', alert);
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Get system status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            navigationActive: this.isNavigationActive,
            locationMode: this.locationProvider?.getMode(),
            currentPosition: this.locationProvider?.getCurrentPosition(),
            pinCount: this.pinManager?.getAllPins().length,
            statistics: this.reportingEngine?.getStatistics()
        };
    }
    
    /**
     * Enable debug mode
     */
    enableDebugMode() {
        this.config.enableDebugMode = true;
        console.log('🐛 Debug mode enabled');
        
        // Add debug info to window
        window.radarApp = this;
        window.debugInfo = () => console.log(this.getStatus());
    }
}

// ==================== INITIALIZATION ====================

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM ready, starting Radar Navigation App...');
    
    // Create global app instance
    window.radarApp = new RadarNavigationApp();
    
    // Enable debug mode in development
    if (window.APP_CONFIG?.enableDebug) {
        window.radarApp.enableDebugMode();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.radarApp) {
        console.log('💾 Saving state before page unload...');
        // Any cleanup or state saving could go here
    }
});