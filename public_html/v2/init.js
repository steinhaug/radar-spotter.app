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
        // This would integrate with a UI pin-adding system
        console.log('Add pin mode toggled');
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
        // This would integrate with route planning system
        console.log('Generate from route - feature not yet implemented');
        this.updateStatus('gps-status', 'Route generation not implemented');
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