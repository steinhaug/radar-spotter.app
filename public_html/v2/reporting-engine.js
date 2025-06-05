// reporting-engine.js - Handle pin reporting with deduplication and analytics

class ReportingEngine extends EventTarget {
    constructor() {
        super();
        
        // Local storage keys
        this.storageKeys = {
            reportHistory: 'radar_app_report_history',
            userSettings: 'radar_app_user_settings',
            statistics: 'radar_app_statistics'
        };
        
        // Report tracking
        this.reportHistory = new Map(); // pinId -> last report data
        this.todayReports = new Set(); // pinIds reported today
        this.sessionReports = []; // All reports this session
        
        // Hooks for external integrations
        this.hooks = new Map(); // eventType -> [callbacks]
        
        // Configuration
        this.config = {
            deduplicationWindow: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            maxHistorySize: 1000, // Maximum reports to keep in history
            enableLocalStorage: true,
            enableBackendReporting: true,
            batchSize: 10, // Batch size for backend reporting
            retryAttempts: 3,
            retryDelay: 2000 // 2 seconds
        };
        
        // Backend queue and processing
        this.reportQueue = [];
        this.isProcessingQueue = false;
        this.backendRetries = new Map(); // reportId -> retry count
        
        // Statistics tracking
        this.statistics = {
            totalReports: 0,
            pinReports: 0,
            routeReports: 0,
            duplicatesBlocked: 0,
            backendSuccesses: 0,
            backendFailures: 0,
            lastReport: null,
            sessionStart: Date.now()
        };
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.startDayRotation();
        this.startQueueProcessor();
    }
    
    // ==================== PIN REPORTING ====================
    
    /**
     * Report a pin alert with deduplication
     * @param {string} pinId - PIN ID
     * @param {string} context - Report context ('proximity', 'route_planning')
     * @param {Object} metadata - Additional report data
     * @returns {boolean} Whether report was processed (not duplicate)
     */
    reportPin(pinId, context, metadata = {}) {
        // Check for duplicates
        if (this.isDuplicateToday(pinId)) {
            this.statistics.duplicatesBlocked++;
            this.emit('duplicateBlocked', { pinId, context });
            return false;
        }
        
        const report = {
            id: this.generateReportId(),
            type: 'pin_alert',
            pinId: pinId,
            context: context,
            timestamp: Date.now(),
            metadata: {
                userAgent: navigator.userAgent,
                location: metadata.location || null,
                distance: metadata.distance || null,
                bearing: metadata.bearing || null,
                route: metadata.route || null,
                ...metadata
            }
        };
        
        // Process the report
        this.processReport(report);
        
        // Mark as reported today
        this.markAsReportedToday(pinId);
        
        // Update statistics
        this.statistics.totalReports++;
        this.statistics.pinReports++;
        this.statistics.lastReport = report;
        
        // Trigger hooks
        this.triggerHooks('pinReported', report);
        
        this.emit('pinReported', report);
        
        return true;
    }
    
    /**
     * Report route creation for analytics
     * @param {Object} routeData - Route information
     * @returns {string} Report ID
     */
    reportRoute(routeData) {
        const report = {
            id: this.generateReportId(),
            type: 'route_created',
            timestamp: Date.now(),
            routeData: {
                start: routeData.start || null,
                destination: routeData.destination || null,
                distance: routeData.distance || null,
                estimatedTime: routeData.estimatedTime || null,
                profile: routeData.profile || 'driving',
                ...routeData
            }
        };
        
        this.processReport(report);
        
        // Update statistics
        this.statistics.totalReports++;
        this.statistics.routeReports++;
        this.statistics.lastReport = report;
        
        // Trigger hooks
        this.triggerHooks('routeReported', report);
        
        this.emit('routeReported', report);
        
        return report.id;
    }
    
    /**
     * Report custom event
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @returns {string} Report ID
     */
    reportEvent(eventType, data = {}) {
        const report = {
            id: this.generateReportId(),
            type: eventType,
            timestamp: Date.now(),
            data: data
        };
        
        this.processReport(report);
        
        this.statistics.totalReports++;
        this.statistics.lastReport = report;
        
        this.triggerHooks('eventReported', report);
        this.emit('eventReported', report);
        
        return report.id;
    }
    
    // ==================== DEDUPLICATION SYSTEM ====================
    
    /**
     * Check if pin was already reported today
     * @param {string} pinId - PIN ID to check
     * @returns {boolean} True if already reported today
     */
    isDuplicateToday(pinId) {
        return this.todayReports.has(pinId);
    }
    
    /**
     * Mark pin as reported today
     * @param {string} pinId - PIN ID to mark
     */
    markAsReportedToday(pinId) {
        this.todayReports.add(pinId);
        
        const now = Date.now();
        this.reportHistory.set(pinId, {
            lastReported: now,
            reportCount: (this.reportHistory.get(pinId)?.reportCount || 0) + 1
        });
        
        this.saveToStorage();
    }
    
    /**
     * Get last report time for pin
     * @param {string} pinId - PIN ID
     * @returns {number|null} Last report timestamp or null
     */
    getLastReportTime(pinId) {
        const history = this.reportHistory.get(pinId);
        return history ? history.lastReported : null;
    }
    
    /**
     * Get total report count for pin
     * @param {string} pinId - PIN ID
     * @returns {number} Total report count
     */
    getReportCount(pinId) {
        const history = this.reportHistory.get(pinId);
        return history ? history.reportCount : 0;
    }
    
    // ==================== REPORT PROCESSING ====================
    
    /**
     * Process a report (storage and backend)
     * @param {Object} report - Report object
     */
    processReport(report) {
        // Add to session reports
        this.sessionReports.push(report);
        
        // Trim session reports if too many
        if (this.sessionReports.length > this.config.maxHistorySize) {
            this.sessionReports.shift();
        }
        
        // Save to local storage
        if (this.config.enableLocalStorage) {
            this.saveToStorage();
        }
        
        // Queue for backend reporting
        if (this.config.enableBackendReporting) {
            this.queueForBackend(report);
        }
    }
    
    /**
     * Queue report for backend submission
     * @param {Object} report - Report to queue
     */
    queueForBackend(report) {
        this.reportQueue.push(report);
        
        // Start processing if not already running
        if (!this.isProcessingQueue) {
            this.processBackendQueue();
        }
    }
    
    /**
     * Process backend queue
     */
    async processBackendQueue() {
        if (this.isProcessingQueue || this.reportQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.reportQueue.length > 0) {
            // Take batch from queue
            const batch = this.reportQueue.splice(0, this.config.batchSize);
            
            try {
                await this.submitToBackend(batch);
                this.statistics.backendSuccesses += batch.length;
                
                // Clear retry counts for successful reports
                batch.forEach(report => {
                    this.backendRetries.delete(report.id);
                });
                
            } catch (error) {
                console.error('Backend submission failed:', error);
                this.statistics.backendFailures += batch.length;
                
                // Handle retries
                this.handleBackendRetries(batch, error);
            }
            
            // Small delay between batches
            await this.sleep(100);
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * Submit reports to backend
     * @param {Array} reports - Reports to submit
     */
    async submitToBackend(reports) {
        // Group reports by type for different endpoints
        const pinReports = reports.filter(r => r.type === 'pin_alert');
        const routeReports = reports.filter(r => r.type === 'route_created');
        const otherReports = reports.filter(r => !['pin_alert', 'route_created'].includes(r.type));
        
        // Submit pin reports
        if (pinReports.length > 0) {
            await this.submitPinReports(pinReports);
        }
        
        // Submit route reports
        if (routeReports.length > 0) {
            await this.submitRouteReports(routeReports);
        }
        
        // Submit other reports (if we add more endpoints later)
        if (otherReports.length > 0) {
            console.log('Other reports not yet implemented:', otherReports);
        }
    }
    
    /**
     * Submit pin reports to backend
     * @param {Array} reports - Pin reports to submit
     */
    async submitPinReports(reports) {
        const payload = reports.map(report => ({
            pin_id: report.pinId,
            user_id: this.getUserId(),
            location: report.metadata.location,
            timestamp: new Date(report.timestamp).toISOString(),
            context: report.context,
            distance: report.metadata.distance,
            bearing: report.metadata.bearing
        }));
        
        const response = await fetch('/api/reports/pin-alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reports: payload })
        });
        
        if (!response.ok) {
            throw new Error(`Pin report submission failed: ${response.status}`);
        }
    }
    
    /**
     * Submit route reports to backend
     * @param {Array} reports - Route reports to submit
     */
    async submitRouteReports(reports) {
        const payload = reports.map(report => ({
            user_id: this.getUserId(),
            start: report.routeData.start,
            destination: report.routeData.destination,
            distance: report.routeData.distance,
            estimated_time: report.routeData.estimatedTime,
            profile: report.routeData.profile,
            timestamp: new Date(report.timestamp).toISOString()
        }));
        
        const response = await fetch('/api/reports/route-created', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reports: payload })
        });
        
        if (!response.ok) {
            throw new Error(`Route report submission failed: ${response.status}`);
        }
    }
    
    /**
     * Handle backend retry logic
     * @param {Array} reports - Failed reports
     * @param {Error} error - Submission error
     */
    handleBackendRetries(reports, error) {
        reports.forEach(report => {
            const retryCount = this.backendRetries.get(report.id) || 0;
            
            if (retryCount < this.config.retryAttempts) {
                // Increment retry count and re-queue
                this.backendRetries.set(report.id, retryCount + 1);
                
                // Re-queue with delay
                setTimeout(() => {
                    this.reportQueue.unshift(report); // Add to front of queue
                }, this.config.retryDelay * (retryCount + 1));
                
            } else {
                // Max retries exceeded
                console.error(`Max retries exceeded for report ${report.id}`);
                this.emit('reportFailed', { report, error });
            }
        });
    }
    
    // ==================== HOOKS SYSTEM ====================
    
    /**
     * Add hook for event type
     * @param {string} eventType - Event type to hook
     * @param {Function} callback - Callback function
     */
    addHook(eventType, callback) {
        if (!this.hooks.has(eventType)) {
            this.hooks.set(eventType, []);
        }
        this.hooks.get(eventType).push(callback);
    }
    
    /**
     * Remove hook
     * @param {string} eventType - Event type
     * @param {Function} callback - Callback to remove
     */
    removeHook(eventType, callback) {
        if (this.hooks.has(eventType)) {
            const callbacks = this.hooks.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Trigger hooks for event type
     * @param {string} eventType - Event type
     * @param {*} data - Data to pass to hooks
     */
    triggerHooks(eventType, data) {
        if (this.hooks.has(eventType)) {
            this.hooks.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Hook error for ${eventType}:`, error);
                }
            });
        }
    }
    
    // ==================== STORAGE MANAGEMENT ====================
    
    /**
     * Load data from local storage
     */
    loadFromStorage() {
        if (!this.config.enableLocalStorage) return;
        
        try {
            // Load report history
            const historyData = localStorage.getItem(this.storageKeys.reportHistory);
            if (historyData) {
                const parsed = JSON.parse(historyData);
                this.reportHistory = new Map(parsed.history || []);
                this.todayReports = new Set(parsed.todayReports || []);
                this.lastDayRotation = parsed.lastDayRotation || Date.now();
            }
            
            // Load statistics
            const statsData = localStorage.getItem(this.storageKeys.statistics);
            if (statsData) {
                this.statistics = { ...this.statistics, ...JSON.parse(statsData) };
            }
            
        } catch (error) {
            console.error('Failed to load from storage:', error);
        }
    }
    
    /**
     * Save data to local storage
     */
    saveToStorage() {
        if (!this.config.enableLocalStorage) return;
        
        try {
            // Save report history
            const historyData = {
                history: Array.from(this.reportHistory.entries()),
                todayReports: Array.from(this.todayReports),
                lastDayRotation: this.lastDayRotation
            };
            localStorage.setItem(this.storageKeys.reportHistory, JSON.stringify(historyData));
            
            // Save statistics
            localStorage.setItem(this.storageKeys.statistics, JSON.stringify(this.statistics));
            
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }
    
    // ==================== DAY ROTATION ====================
    
    /**
     * Start day rotation timer
     */
    startDayRotation() {
        // Check for day rotation every hour
        setInterval(() => {
            this.checkDayRotation();
        }, 60 * 60 * 1000);
        
        // Initial check
        this.checkDayRotation();
    }
    
    /**
     * Check if day has rotated and clear today's reports
     */
    checkDayRotation() {
        const now = Date.now();
        const dayStart = new Date().setHours(0, 0, 0, 0);
        
        if (!this.lastDayRotation || this.lastDayRotation < dayStart) {
            this.todayReports.clear();
            this.lastDayRotation = now;
            this.saveToStorage();
            
            this.emit('dayRotated', { timestamp: now });
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Generate unique report ID
     * @returns {string} Unique report ID
     */
    generateReportId() {
        return 'rpt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get user ID (placeholder - implement based on your auth system)
     * @returns {string} User ID
     */
    getUserId() {
        // Implement based on your authentication system
        return localStorage.getItem('user_id') || 'anonymous_' + this.getDeviceId();
    }
    
    /**
     * Get device ID for anonymous users
     * @returns {string} Device ID
     */
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }
    
    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get current statistics
     * @returns {Object} Current statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            queueLength: this.reportQueue.length,
            sessionReports: this.sessionReports.length,
            todayReports: this.todayReports.size,
            historySize: this.reportHistory.size
        };
    }
    
    /**
     * Clear all data
     */
    clearAllData() {
        this.reportHistory.clear();
        this.todayReports.clear();
        this.sessionReports = [];
        this.reportQueue = [];
        this.backendRetries.clear();
        
        // Reset statistics
        this.statistics = {
            totalReports: 0,
            pinReports: 0,
            routeReports: 0,
            duplicatesBlocked: 0,
            backendSuccesses: 0,
            backendFailures: 0,
            lastReport: null,
            sessionStart: Date.now()
        };
        
        this.saveToStorage();
        this.emit('dataCleared');
    }
    
    // ==================== EVENT HELPERS ====================
    
    emit(eventType, data) {
        this.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
    
    // Convenience methods for event subscription
    onPinReported(callback) {
        this.addEventListener('pinReported', (e) => callback(e.detail));
    }
    
    onRouteReported(callback) {
        this.addEventListener('routeReported', (e) => callback(e.detail));
    }
    
    onDuplicateBlocked(callback) {
        this.addEventListener('duplicateBlocked', (e) => callback(e.detail));
    }
    
    onReportFailed(callback) {
        this.addEventListener('reportFailed', (e) => callback(e.detail));
    }
}

// Make available globally
window.ReportingEngine = ReportingEngine;