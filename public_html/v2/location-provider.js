// location-provider.js - GPS abstraction layer for real and simulated positioning

class LocationProvider extends EventTarget {
    constructor() {
        super();
        
        // State management
        this.currentPosition = null;
        this.isActive = false;
        this.mode = 'real'; // 'real' or 'simulation'
        this.accuracy = null;
        this.heading = 0;
        this.speed = 0;
        
        // Real GPS tracking
        this.watchId = null;
        this.gpsOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000
        };
        
        // Simulation data
        this.simulationData = null;
        this.simulationIndex = 0;
        this.simulationInterval = null;
        this.simulationSpeed = 1000; // ms between points
        
        // Position history for calculations
        this.positionHistory = [];
        this.maxHistoryLength = 10;
        
        // Error handling
        this.lastError = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        this.checkGPSSupport();
        this.bindEvents();
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Start location tracking
     * @param {string} mode - 'real' or 'simulation'
     */
    start(mode = 'real') {
        this.mode = mode;
        this.isActive = true;
        
        if (mode === 'real') {
            this.startRealGPS();
        } else if (mode === 'simulation') {
            this.startSimulation();
        }
        
        this.emit('statusChange', {
            active: true,
            mode: this.mode,
            message: `Started ${mode} positioning`
        });
    }
    
    /**
     * Stop location tracking
     */
    stop() {
        this.isActive = false;
        
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        this.emit('statusChange', {
            active: false,
            mode: this.mode,
            message: 'Location tracking stopped'
        });
    }
    
    /**
     * Get current position
     * @returns {Object|null} Current position object
     */
    getCurrentPosition() {
        return this.currentPosition;
    }
    
    /**
     * Load simulation data
     * @param {Array} gpsLog - Array of GPS points
     * @param {number} intervalMs - Milliseconds between points
     */
    loadSimulationData(gpsLog, intervalMs = 1000) {
        this.simulationData = gpsLog;
        this.simulationSpeed = intervalMs;
        this.simulationIndex = 0;
        
        this.emit('simulationLoaded', {
            points: gpsLog.length,
            duration: Math.round((gpsLog.length * intervalMs) / 60000) // minutes
        });
    }
    
    /**
     * Inject single position (for external simulation)
     * @param {Object} position - Position object
     */
    injectPosition(position) {
        if (this.mode === 'simulation') {
            this.processPosition(position);
        }
    }
    
    // ==================== REAL GPS HANDLING ====================
    
    checkGPSSupport() {
        if (!navigator.geolocation) {
            this.emit('error', {
                code: 'GPS_NOT_SUPPORTED',
                message: 'Geolocation is not supported by this browser'
            });
            return false;
        }
        return true;
    }
    
    startRealGPS() {
        if (!this.checkGPSSupport()) return;
        
        this.emit('statusChange', {
            active: true,
            mode: 'real',
            message: 'Connecting to GPS...'
        });
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handleGPSSuccess(position),
            (error) => this.handleGPSError(error),
            this.gpsOptions
        );
    }
    
    handleGPSSuccess(position) {
        this.retryCount = 0;
        this.lastError = null;
        
        const coords = position.coords;
        const processedPosition = {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            altitude: coords.altitude,
            altitudeAccuracy: coords.altitudeAccuracy,
            heading: coords.heading,
            speed: coords.speed,
            timestamp: position.timestamp
        };
        
        this.processPosition(processedPosition);
        
        this.emit('statusChange', {
            active: true,
            mode: 'real',
            message: `GPS active (±${Math.round(coords.accuracy)}m)`
        });
    }
    
    handleGPSError(error) {
        this.lastError = error;
        
        let message = 'GPS error';
        let canRetry = false;
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS access denied by user';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'GPS position unavailable';
                canRetry = true;
                break;
            case error.TIMEOUT:
                message = 'GPS timeout';
                canRetry = true;
                break;
            default:
                message = 'Unknown GPS error';
                canRetry = true;
        }
        
        this.emit('error', {
            code: error.code,
            message: message,
            canRetry: canRetry
        });
        
        // Retry logic for recoverable errors
        if (canRetry && this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
                if (this.isActive && this.mode === 'real') {
                    this.startRealGPS();
                }
            }, 2000 * this.retryCount); // Exponential backoff
        }
    }
    
    // ==================== SIMULATION HANDLING ====================
    
    startSimulation() {
        if (!this.simulationData || this.simulationData.length === 0) {
            this.emit('error', {
                code: 'NO_SIMULATION_DATA',
                message: 'No simulation data available'
            });
            return;
        }
        
        this.simulationIndex = 0;
        
        this.emit('statusChange', {
            active: true,
            mode: 'simulation',
            message: `Starting simulation: ${this.simulationData.length} points`
        });
        
        this.simulationInterval = setInterval(() => {
            this.playNextSimulationPoint();
        }, this.simulationSpeed);
    }
    
    playNextSimulationPoint() {
        if (this.simulationIndex >= this.simulationData.length) {
            this.stop();
            this.emit('simulationComplete', {
                totalPoints: this.simulationData.length
            });
            return;
        }
        
        const point = this.simulationData[this.simulationIndex];
        const processedPosition = {
            lat: point.lat,
            lng: point.lng,
            accuracy: point.accuracy || 5,
            altitude: point.altitude || null,
            altitudeAccuracy: null,
            heading: point.heading || 0,
            speed: point.speed || 0,
            timestamp: point.timestamp || Date.now()
        };
        
        this.processPosition(processedPosition);
        
        this.simulationIndex++;
        
        this.emit('statusChange', {
            active: true,
            mode: 'simulation',
            message: `Simulation: ${this.simulationIndex}/${this.simulationData.length}`
        });
    }
    
    // ==================== POSITION PROCESSING ====================
    
    processPosition(position) {
        // Calculate derived data
        this.calculateSpeedAndHeading(position);
        
        // Update current position
        this.currentPosition = {
            ...position,
            calculatedSpeed: this.speed,
            calculatedHeading: this.heading
        };
        
        // Add to history
        this.addToHistory(this.currentPosition);
        
        // Emit position update event
        this.emit('positionUpdate', this.currentPosition);
    }
    
    calculateSpeedAndHeading(newPosition) {
        const previousPosition = this.positionHistory[this.positionHistory.length - 1];
        
        if (!previousPosition) {
            this.speed = newPosition.speed || 0;
            this.heading = newPosition.heading || 0;
            return;
        }
        
        const timeDiff = (newPosition.timestamp - previousPosition.timestamp) / 1000; // seconds
        
        if (timeDiff > 0) {
            // Calculate distance between points
            const distance = this.calculateDistance(
                previousPosition.lat, previousPosition.lng,
                newPosition.lat, newPosition.lng
            );
            
            // Calculate speed (m/s)
            const calculatedSpeed = distance / timeDiff;
            
            // Use GPS speed if available and reasonable, otherwise use calculated
            this.speed = (newPosition.speed !== null && newPosition.speed > 0) 
                ? newPosition.speed 
                : calculatedSpeed;
            
            // Calculate heading
            this.heading = this.calculateHeading(
                previousPosition.lat, previousPosition.lng,
                newPosition.lat, newPosition.lng
            );
        }
    }
    
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
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
    
    addToHistory(position) {
        this.positionHistory.push(position);
        
        // Keep only last N positions
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
    }
    
    // ==================== EVENT HELPERS ====================
    
    emit(eventType, data) {
        this.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
    
    // Convenience methods for subscribing to events
    onPositionUpdate(callback) {
        this.addEventListener('positionUpdate', (e) => callback(e.detail));
    }
    
    onStatusChange(callback) {
        this.addEventListener('statusChange', (e) => callback(e.detail));
    }
    
    onError(callback) {
        this.addEventListener('error', (e) => callback(e.detail));
    }
    
    onSimulationLoaded(callback) {
        this.addEventListener('simulationLoaded', (e) => callback(e.detail));
    }
    
    onSimulationComplete(callback) {
        this.addEventListener('simulationComplete', (e) => callback(e.detail));
    }
    
    // ==================== UTILITY METHODS ====================
    
    getPositionHistory() {
        return [...this.positionHistory];
    }
    
    getCurrentSpeed() {
        return this.speed;
    }
    
    getCurrentHeading() {
        return this.heading;
    }
    
    getAccuracy() {
        return this.accuracy;
    }
    
    getLastError() {
        return this.lastError;
    }
    
    isTracking() {
        return this.isActive;
    }
    
    getMode() {
        return this.mode;
    }
}

// Make available globally
window.LocationProvider = LocationProvider;