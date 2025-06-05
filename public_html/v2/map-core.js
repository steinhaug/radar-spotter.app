// map-core.js - Core map functionality and style management

class MapCore extends EventTarget {
    constructor(containerId, config = {}) {
        super();
        
        this.containerId = containerId;
        this.map = null;
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            accessToken: config.accessToken || window.APP_CONFIG?.mapboxToken,
            center: config.center || [8.0059, 58.1467], // Kristiansand default
            zoom: config.zoom || 12,
            bearing: config.bearing || 0,
            pitch: config.pitch || 0,
            style: config.style || 'mapbox://styles/mapbox/dark-v11',
            ...config
        };
        
        // Style management
        this.currentStyle = this.config.style;
        this.availableStyles = this.initializeStyles();
        this.customLayers = new Map(); // Track custom layers for restoration
        this.customSources = new Map(); // Track custom sources for restoration
        
        // Event tracking
        this.eventListeners = new Map();
        
        this.init();
    }
    
    // ==================== INITIALIZATION ====================
    
    init() {
        if (!this.config.accessToken) {
            throw new Error('MapBox access token is required');
        }
        
        mapboxgl.accessToken = this.config.accessToken;
        this.createMap();
    }
    
    createMap() {
        try {
            this.map = new mapboxgl.Map({
                container: this.containerId,
                style: this.currentStyle,
                center: this.config.center,
                zoom: this.config.zoom,
                bearing: this.config.bearing,
                pitch: this.config.pitch,
                antialias: true,
                preserveDrawingBuffer: true
            });
            
            this.bindMapEvents();
            
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.emit('error', { type: 'initialization', error });
        }
    }
    
    bindMapEvents() {
        // Map load event
        this.map.on('load', () => {
            this.isInitialized = true;
            this.emit('mapReady');
        });
        
        // Style load event (for layer restoration)
        this.map.on('styledata', () => {
            if (this.isInitialized) {
                this.restoreCustomLayers();
                this.emit('styleChanged', { style: this.currentStyle });
            }
        });
        
        // Error handling
        this.map.on('error', (e) => {
            console.error('Map error:', e);
            this.emit('error', { type: 'runtime', error: e });
        });
        
        // Movement events
        this.map.on('move', () => {
            this.emit('mapMove', this.getMapState());
        });
        
        this.map.on('zoom', () => {
            this.emit('mapZoom', this.getMapState());
        });
        
        this.map.on('rotate', () => {
            this.emit('mapRotate', this.getMapState());
        });
        
        this.map.on('pitch', () => {
            this.emit('mapPitch', this.getMapState());
        });
    }
    
    // ==================== STYLE MANAGEMENT ====================
    
    initializeStyles() {
        return {
            'dark': {
                name: 'Dark',
                style: 'mapbox://styles/mapbox/dark-v11',
                icon: '🌙',
                description: 'Dark theme for navigation'
            },
            'light': {
                name: 'Light',
                style: 'mapbox://styles/mapbox/light-v11',
                icon: '☀️',
                description: 'Light theme for daytime'
            },
            'streets': {
                name: 'Streets',
                style: 'mapbox://styles/mapbox/streets-v12',
                icon: '🏙️',
                description: 'Detailed street map'
            },
            'satellite': {
                name: 'Satellite',
                style: 'mapbox://styles/mapbox/satellite-streets-v12',
                icon: '🛰️',
                description: 'Satellite imagery with labels'
            },
            'outdoors': {
                name: 'Outdoors',
                style: 'mapbox://styles/mapbox/outdoors-v12',
                icon: '🏔️',
                description: 'Topographic style with terrain'
            },
            'traffic': {
                name: 'Traffic',
                style: 'mapbox://styles/mapbox/traffic-day-v2',
                icon: '🚦',
                description: 'Real-time traffic information'
            }
        };
    }
    
    /**
     * Change map style
     * @param {string} styleId - Style identifier or full style URL
     */
    changeStyle(styleId) {
        let styleUrl;
        
        if (this.availableStyles[styleId]) {
            styleUrl = this.availableStyles[styleId].style;
        } else if (styleId.startsWith('mapbox://')) {
            styleUrl = styleId;
        } else {
            console.warn(`Unknown style: ${styleId}`);
            return false;
        }
        
        // Store current custom layers before style change
        this.backupCustomLayers();
        
        this.currentStyle = styleUrl;
        this.map.setStyle(styleUrl);
        
        this.emit('styleChanging', { from: this.currentStyle, to: styleUrl });
        
        return true;
    }
    
    /**
     * Get available map styles
     */
    getAvailableStyles() {
        return { ...this.availableStyles };
    }
    
    /**
     * Get current style
     */
    getCurrentStyle() {
        return this.currentStyle;
    }
    
    // ==================== LAYER MANAGEMENT ====================
    
    /**
     * Add a layer and track it for restoration
     * @param {Object} layerDefinition - MapBox layer definition
     * @param {string} beforeId - Optional layer ID to insert before
     */
    addLayer(layerDefinition, beforeId = null) {
        if (!this.isInitialized) {
            console.warn('Map not yet initialized');
            return false;
        }
        
        try {
            this.map.addLayer(layerDefinition, beforeId);
            
            // Track custom layer for restoration
            this.customLayers.set(layerDefinition.id, {
                definition: { ...layerDefinition },
                beforeId: beforeId
            });
            
            this.emit('layerAdded', { layerId: layerDefinition.id });
            return true;
            
        } catch (error) {
            console.error('Failed to add layer:', error);
            return false;
        }
    }
    
    /**
     * Remove a layer
     * @param {string} layerId - Layer ID to remove
     */
    removeLayer(layerId) {
        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId);
            this.customLayers.delete(layerId);
            this.emit('layerRemoved', { layerId });
            return true;
        }
        return false;
    }
    
    /**
     * Add a source and track it for restoration
     * @param {string} sourceId - Source ID
     * @param {Object} sourceDefinition - MapBox source definition
     */
    addSource(sourceId, sourceDefinition) {
        if (!this.isInitialized) {
            console.warn('Map not yet initialized');
            return false;
        }
        
        try {
            this.map.addSource(sourceId, sourceDefinition);
            
            // Track custom source for restoration
            this.customSources.set(sourceId, { ...sourceDefinition });
            
            this.emit('sourceAdded', { sourceId });
            return true;
            
        } catch (error) {
            console.error('Failed to add source:', error);
            return false;
        }
    }
    
    /**
     * Remove a source
     * @param {string} sourceId - Source ID to remove
     */
    removeSource(sourceId) {
        if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
            this.customSources.delete(sourceId);
            this.emit('sourceRemoved', { sourceId });
            return true;
        }
        return false;
    }
    
    /**
     * Update source data
     * @param {string} sourceId - Source ID
     * @param {Object} data - New data for the source
     */
    updateSourceData(sourceId, data) {
        const source = this.map.getSource(sourceId);
        if (source && source.setData) {
            source.setData(data);
            return true;
        }
        return false;
    }
    
    // ==================== LAYER RESTORATION ====================
    
    /**
     * Backup custom layers before style change
     */
    backupCustomLayers() {
        // This is called before style change, customLayers Map is already maintained
        // Additional backup logic could go here if needed
    }
    
    /**
     * Restore custom layers after style change
     */
    restoreCustomLayers() {
        // Restore sources first
        this.customSources.forEach((sourceDefinition, sourceId) => {
            try {
                if (!this.map.getSource(sourceId)) {
                    this.map.addSource(sourceId, sourceDefinition);
                }
            } catch (error) {
                console.error(`Failed to restore source ${sourceId}:`, error);
            }
        });
        
        // Then restore layers
        this.customLayers.forEach((layerData, layerId) => {
            try {
                if (!this.map.getLayer(layerId)) {
                    this.map.addLayer(layerData.definition, layerData.beforeId);
                }
            } catch (error) {
                console.error(`Failed to restore layer ${layerId}:`, error);
            }
        });
        
        this.emit('layersRestored');
    }
    
    // ==================== NAVIGATION CONTROLS ====================
    
    /**
     * Fly to a location
     * @param {Object} options - Fly options {center, zoom, bearing, pitch, duration}
     */
    flyTo(options) {
        if (this.isInitialized) {
            this.map.flyTo({
                duration: 2000,
                ...options
            });
        }
    }
    
    /**
     * Ease to a location (smoother transition)
     * @param {Object} options - Ease options
     */
    easeTo(options) {
        if (this.isInitialized) {
            this.map.easeTo({
                duration: 1000,
                ...options
            });
        }
    }
    
    /**
     * Jump to a location (instant)
     * @param {Object} options - Jump options
     */
    jumpTo(options) {
        if (this.isInitialized) {
            this.map.jumpTo(options);
        }
    }
    
    /**
     * Fit bounds to include all features
     * @param {Array} bounds - [[west, south], [east, north]]
     * @param {Object} options - Additional options
     */
    fitBounds(bounds, options = {}) {
        if (this.isInitialized) {
            this.map.fitBounds(bounds, {
                padding: 50,
                duration: 2000,
                ...options
            });
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Get current map state
     */
    getMapState() {
        if (!this.isInitialized) return null;
        
        return {
            center: this.map.getCenter(),
            zoom: this.map.getZoom(),
            bearing: this.map.getBearing(),
            pitch: this.map.getPitch(),
            bounds: this.map.getBounds()
        };
    }
    
    /**
     * Get map center
     */
    getCenter() {
        return this.isInitialized ? this.map.getCenter() : null;
    }
    
    /**
     * Get map zoom level
     */
    getZoom() {
        return this.isInitialized ? this.map.getZoom() : null;
    }
    
    /**
     * Get map bounds
     */
    getBounds() {
        return this.isInitialized ? this.map.getBounds() : null;
    }
    
    /**
     * Check if layer exists
     * @param {string} layerId - Layer ID to check
     */
    hasLayer(layerId) {
        return this.isInitialized && this.map.getLayer(layerId) !== undefined;
    }
    
    /**
     * Check if source exists
     * @param {string} sourceId - Source ID to check
     */
    hasSource(sourceId) {
        return this.isInitialized && this.map.getSource(sourceId) !== undefined;
    }
    
    /**
     * Get layer property
     * @param {string} layerId - Layer ID
     * @param {string} property - Property name
     */
    getLayerProperty(layerId, property) {
        if (this.hasLayer(layerId)) {
            return this.map.getLayoutProperty(layerId, property) || 
                   this.map.getPaintProperty(layerId, property);
        }
        return undefined;
    }
    
    /**
     * Set layer property
     * @param {string} layerId - Layer ID
     * @param {string} property - Property name
     * @param {*} value - Property value
     * @param {string} type - 'layout' or 'paint'
     */
    setLayerProperty(layerId, property, value, type = 'layout') {
        if (this.hasLayer(layerId)) {
            if (type === 'layout') {
                this.map.setLayoutProperty(layerId, property, value);
            } else {
                this.map.setPaintProperty(layerId, property, value);
            }
            return true;
        }
        return false;
    }
    
    // ==================== EVENT SYSTEM ====================
    
    /**
     * Add event listener to map
     * @param {string} eventType - Event type
     * @param {Function} callback - Event callback
     * @param {string} layerId - Optional layer ID for layer-specific events
     */
    addEventListener(eventType, callback, layerId = null) {
        const eventKey = layerId ? `${eventType}:${layerId}` : eventType;
        
        if (!this.eventListeners.has(eventKey)) {
            this.eventListeners.set(eventKey, new Set());
        }
        
        this.eventListeners.get(eventKey).add(callback);
        
        if (layerId) {
            this.map.on(eventType, layerId, callback);
        } else {
            this.map.on(eventType, callback);
        }
    }
    
    /**
     * Remove event listener from map
     * @param {string} eventType - Event type
     * @param {Function} callback - Event callback
     * @param {string} layerId - Optional layer ID
     */
    removeEventListener(eventType, callback, layerId = null) {
        const eventKey = layerId ? `${eventType}:${layerId}` : eventType;
        
        if (this.eventListeners.has(eventKey)) {
            this.eventListeners.get(eventKey).delete(callback);
        }
        
        if (layerId) {
            this.map.off(eventType, layerId, callback);
        } else {
            this.map.off(eventType, callback);
        }
    }
    
    /**
     * Emit custom event
     * @param {string} eventType - Event type
     * @param {*} data - Event data
     */
    emit(eventType, data) {
        this.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    }
    
    // ==================== CLEANUP ====================
    
    /**
     * Destroy the map and clean up resources
     */
    destroy() {
        if (this.map) {
            // Remove all custom layers and sources
            this.customLayers.forEach((_, layerId) => {
                if (this.hasLayer(layerId)) {
                    this.map.removeLayer(layerId);
                }
            });
            
            this.customSources.forEach((_, sourceId) => {
                if (this.hasSource(sourceId)) {
                    this.map.removeSource(sourceId);
                }
            });
            
            // Clear tracking
            this.customLayers.clear();
            this.customSources.clear();
            this.eventListeners.clear();
            
            // Remove the map
            this.map.remove();
            this.map = null;
            this.isInitialized = false;
        }
    }
}

// Make available globally
window.MapCore = MapCore;