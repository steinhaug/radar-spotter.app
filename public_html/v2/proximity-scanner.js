// proximity-scanner.js - Monitor pins and routes for proximity alerts

class ProximityScanner extends EventTarget {
    constructor(pinManager, locationProvider, reportingEngine) {
        super();
        
        this.pinManager = pinManager;
        this.locationProvider = locationProvider;
        this.reportingEngine = reportingEngine;
        
        // Scanning configuration
        this.config = {
            proximityRadius: 2000, // 2km default radius
            scanThreshold: 100,    // 100m movement before new scan
            routeTolerance: 500,   // 500m tolerance from route
            scanInterval: 1000     // 1 second interval for continuous scanning
        };
        
        // State management
        this.isProximityScanning = false;
        this.isContinuousScanning = false;
        this.lastScanLocation = null;
        this.currentRoute = null;
        this.routePins = [];
        
        // Scanning history and debouncing
        this.scanHistory = [];
        this.lastProximityResults = [];
        this.scanningInterval = null;
        
        // Performance monitoring
        this.scanStats = {
            totalScans: 0,
            proximityScans: 0,
            routeScans: 0,
            pinsFound: 0,
            lastScanDuration: 0
        };
        
        this.init();
    }
    
    init() {
        this.bindLocationEvents();
    }
    
    // ==================== LOCATION EVENT BINDING ====================
    
    bindLocationEvents() {
        // Listen for position updates from LocationProvider
        this.locationProvider.onPositionUpdate((position) => {
            this.handleLocationUpdate(position);
        });
        
        // Listen for location provider status changes
        this.locationProvider.onStatusChange((status) => {
            if (status.active && this.isProximityScanning) {
                this.startContinuousScanning();
            } else if (!status.active) {
                this.stopContinuousScanning();
            }
        });
    }
    
    // ==================== PROXIMITY SCANNING ====================
    
    /**
     * Start proximity scanning
     * @param {Object} options - Scanning options
     */
    startProximityScanning(options = {}) {
        this.config = { ...this.config, ...options };
        this.isProximityScanning = true;
        
        const currentPosition = this.locationProvider.getCurrentPosition();
        if (currentPosition) {
            this.performProximityCheck(currentPosition);
        }
        
        if (this.locationProvider.isTracking()) {
            this.startContinuousScanning();
        }
        
        this.emit('proximityStarted', {
            radius: this.config.proximityRadius,
            threshold: this.config.scanThreshold
        });
    }
    
    /**
     * Stop proximity scanning
     */
    stopProximityScanning() {
        this.isProximityScanning = false;
        this.stopContinuousScanning();
        this.lastScanLocation = null;
        this.lastProximityResults = [];
        
        this.emit('proximityStopped');
    }
    
    /**
     * Start continuous scanning with interval
     */
    startContinuousScanning() {
        if (this.isContinuousScanning) return;
        
        this.isContinuousScanning = true;
        this.scanningInterval = setInterval(() => {
            const currentPosition = this.locationProvider.getCurrentPosition();
            if (currentPosition && this.shouldPerformProximityScan(currentPosition)) {
                this.performProximityCheck(currentPosition);
            }
        }, this.config.scanInterval);
    }
    
    /**
     * Stop continuous scanning
     */
    stopContinuousScanning() {
        this.isContinuousScanning = false;
        if (this.scanningInterval) {
            clearInterval(this.scanningInterval);
            this.scanningInterval = null;
        }
    }
    
    /**
     * Handle location updates from LocationProvider
     * @param {Object} position - Current position
     */
    handleLocationUpdate(position) {
        if (this.isProximityScanning && this.shouldPerformProximityScan(position)) {
            this.performProximityCheck(position);
        }
    }
    
    /**
     * Determine if proximity scan should be performed
     * @param {Object} position - Current position
     * @returns {boolean} Whether to perform scan
     */
    shouldPerformProximityScan(position) {
        if (!this.lastScanLocation) return true;
        
        const distance = DistanceCalculator.calculateDistance(
            position, 
            this.lastScanLocation
        );
        
        return distance >= this.config.scanThreshold;
    }
    
    /**
     * Perform proximity check for current location
     * @param {Object} position - Current position
     */
    performProximityCheck(position) {
        const startTime = performance.now();
        
        const allPins = this.pinManager.getAllPins();
        const nearbyPins = DistanceCalculator.findPinsWithinRadius(
            position,
            allPins,
            this.config.proximityRadius
        );
        
        // Update scan state
        this.lastScanLocation = { ...position };
        this.lastProximityResults = nearbyPins;
        
        // Update statistics
        this.scanStats.totalScans++;
        this.scanStats.proximityScans++;
        this.scanStats.pinsFound += nearbyPins.length;
        this.scanStats.lastScanDuration = performance.now() - startTime;
        
        // Check for new pins that need reporting
        this.processProximityResults(nearbyPins, position);
        
        // Emit scan results
        this.emit('proximityResults', {
            location: position,
            pinsFound: nearbyPins,
            scanDuration: this.scanStats.lastScanDuration
        });
    }
    
    /**
     * Process proximity results and trigger reports
     * @param {Array} nearbyPins - Pins found in proximity
     * @param {Object} position - Current position
     */
    processProximityResults(nearbyPins, position) {
        nearbyPins.forEach(pin => {
            // Check if this pin should trigger a report
            if (this.shouldReportPin(pin, 'proximity')) {
                this.reportingEngine.reportPin(pin.id, 'proximity', {
                    location: position,
                    distance: pin.distance,
                    bearing: pin.bearing,
                    timestamp: Date.now()
                });
                
                this.emit('pinAlert', {
                    pin: pin,
                    context: 'proximity',
                    distance: pin.distance
                });
            }
        });
    }
    
    // ==================== ROUTE SCANNING ====================
    
    /**
     * Scan a route for pins
     * @param {Object} routeGeometry - GeoJSON LineString geometry
     * @param {Object} options - Scanning options
     */
    async scanRoute(routeGeometry, options = {}) {
        const startTime = performance.now();
        
        const tolerance = options.tolerance || this.config.routeTolerance;
        const useBackend = options.useBackend || false;
        
        let routePins = [];
        
        try {
            if (useBackend) {
                // Use backend for complex route analysis
                routePins = await this.scanRouteViaBackend(routeGeometry, tolerance);
            } else {
                // Use local scanning
                routePins = this.scanRouteLocally(routeGeometry, tolerance);
            }
            
            this.currentRoute = routeGeometry;
            this.routePins = routePins;
            
            // Update statistics
            this.scanStats.totalScans++;
            this.scanStats.routeScans++;
            this.scanStats.pinsFound += routePins.length;
            this.scanStats.lastScanDuration = performance.now() - startTime;
            
            // Process route pins for reporting
            this.processRouteResults(routePins, routeGeometry);
            
            this.emit('routeScanned', {
                route: routeGeometry,
                pinsFound: routePins,
                scanDuration: this.scanStats.lastScanDuration,
                method: useBackend ? 'backend' : 'local'
            });
            
            return routePins;
            
        } catch (error) {
            console.error('Route scanning failed:', error);
            this.emit('scanError', {
                type: 'route',
                error: error,
                route: routeGeometry
            });
            return [];
        }
    }
    
    /**
     * Scan route using local pins and calculations
     * @param {Object} routeGeometry - Route geometry
     * @param {number} tolerance - Distance tolerance
     * @returns {Array} Pins found on route
     */
    scanRouteLocally(routeGeometry, tolerance) {
        const allPins = this.pinManager.getAllPins();
        return DistanceCalculator.findPinsOnRoute(routeGeometry, allPins, tolerance);
    }
    
    /**
     * Scan route using backend API
     * @param {Object} routeGeometry - Route geometry
     * @param {number} tolerance - Distance tolerance
     * @returns {Promise<Array>} Pins found on route
     */
    async scanRouteViaBackend(routeGeometry, tolerance) {
        const response = await fetch('/api/route/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                geometry: routeGeometry,
                tolerance: tolerance
            })
        });
        
        if (!response.ok) {
            throw new Error(`Backend scan failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data.pins_on_route || [];
    }
    
    /**
     * Process route scan results
     * @param {Array} routePins - Pins found on route
     * @param {Object} routeGeometry - Route geometry
     */
    processRouteResults(routePins, routeGeometry) {
        routePins.forEach(pin => {
            if (this.shouldReportPin(pin, 'route_planning')) {
                this.reportingEngine.reportPin(pin.id, 'route_planning', {
                    route: routeGeometry,
                    distanceFromRoute: pin.distanceFromRoute,
                    distanceAlongRoute: pin.distanceAlongRoute,
                    routeProgress: pin.routeProgress,
                    timestamp: Date.now()
                });
                
                this.emit('routePinAlert', {
                    pin: pin,
                    context: 'route_planning',
                    distanceAlongRoute: pin.distanceAlongRoute
                });
            }
        });
    }
    
    // ==================== REPORTING LOGIC ====================
    
    /**
     * Determine if a pin should be reported
     * @param {Object} pin - Pin object
     * @param {string} context - Report context ('proximity' or 'route_planning')
     * @returns {boolean} Whether pin should be reported
     */
    shouldReportPin(pin, context) {
        // Basic criteria for reporting
        if (!pin || !pin.id) return false;
        
        // Check with reporting engine for deduplication
        if (this.reportingEngine.isDuplicateToday(pin.id)) {
            return false;
        }
        
        // Context-specific logic
        switch (context) {
            case 'proximity':
                // Report if within warning distance (closer threshold)
                return pin.distance <= 1000; // 1km for proximity alerts
                
            case 'route_planning':
                // Report all pins on planned route
                return true;
                
            default:
                return false;
        }
    }
    
    // ==================== CONFIGURATION MANAGEMENT ====================
    
    /**
     * Update scanning configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Restart continuous scanning if active with new config
        if (this.isContinuousScanning) {
            this.stopContinuousScanning();
            this.startContinuousScanning();
        }
        
        this.emit('configUpdated', this.config);
    }
    
    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    // ==================== STATUS AND STATISTICS ====================
    
    /**
     * Get current scan statistics
     * @returns {Object} Scan statistics
     */
    getStatistics() {
        return {
            ...this.scanStats,
            isProximityScanning: this.isProximityScanning,
            isContinuousScanning: this.isContinuousScanning,
            lastScanLocation: this.lastScanLocation,
            proximityResults: this.lastProximityResults.length,
            routePins: this.routePins.length
        };
    }
    
    /**
     * Reset scan statistics
     */
    resetStatistics() {
        this.scanStats = {
            totalScans: 0,
            proximityScans: 0,
            routeScans: 0,
            pinsFound: 0,
            lastScanDuration: 0
        };
        
        this.emit('statisticsReset');
    }
    
    /**
     * Get last proximity results
     * @returns {Array} Last proximity scan results
     */
    getLastProximityResults() {
        return [...this.lastProximityResults];
    }
    
    /**
     * Get current route pins
     * @returns {Array} Pins found on current route
     */
    getRoutePins() {
        return [...this.routePins];
    }
    
    /**
     * Clear current route data
     */
    clearRoute() {
        this.currentRoute = null;
        this.routePins = [];
        this.emit('routeCleared');
    }
    
    // ==================== EVENT HELPERS ====================
    
    /**
     * Emit custom event
     * @param {string} eventType - Event type
     * @param {*} data - Event data
     */
    emit(eventType, data) {
        this.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
    
    // Convenience methods for event subscription
    onProximityResults(callback) {
        this.addEventListener('proximityResults', (e) => callback(e.detail));
    }
    
    onPinAlert(callback) {
        this.addEventListener('pinAlert', (e) => callback(e.detail));
    }
    
    onRoutePinAlert(callback) {
        this.addEventListener('routePinAlert', (e) => callback(e.detail));
    }
    
    onRouteScanned(callback) {
        this.addEventListener('routeScanned', (e) => callback(e.detail));
    }
    
    onScanError(callback) {
        this.addEventListener('scanError', (e) => callback(e.detail));
    }
    
    // ==================== CLEANUP ====================
    
    /**
     * Clean up resources and stop all scanning
     */
    destroy() {
        this.stopProximityScanning();
        this.stopContinuousScanning();
        this.clearRoute();
        this.scanHistory = [];
        this.lastProximityResults = [];
    }
}

// Make available globally
window.ProximityScanner = ProximityScanner;