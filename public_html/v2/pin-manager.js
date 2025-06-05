// pin-manager.js - PIN management, display and interaction

class PinManager {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.pins = new Map(); // Local cache: pinId -> pin object
        this.pinTypes = this.initializePinTypes();
        this.isVisible = true;
        this.clickHandlers = new Map(); // pinId -> callback function
        
        // Batch update optimization
        this.updateQueue = new Set();
        this.updatePending = false;
        
        this.init();
    }
    
    init() {
        this.setupMapLayers();
        this.bindEvents();
    }
    
    // ==================== PIN TYPE DEFINITIONS ====================
    
    initializePinTypes() {
        return {
            'radar': {
                name: 'Speed Camera',
                icon: '📷',
                color: '#ff0000',
                size: 8,
                strokeColor: '#ffffff',
                strokeWidth: 2
            },
            'accident': {
                name: 'Traffic Accident',
                icon: '⚠️',
                color: '#ffa500',
                size: 10,
                strokeColor: '#ffffff',
                strokeWidth: 2
            },
            'roadwork': {
                name: 'Road Work',
                icon: '🚧',
                color: '#ffff00',
                size: 8,
                strokeColor: '#000000',
                strokeWidth: 1
            },
            'police': {
                name: 'Police Control',
                icon: '👮',
                color: '#0066cc',
                size: 9,
                strokeColor: '#ffffff',
                strokeWidth: 2
            }
        };
    }
    
    // ==================== MAP LAYER SETUP ====================
    
    setupMapLayers() {
        if (!this.mapCore.map) {
            console.error('Map not initialized');
            return;
        }
        
        // Create pin source
        this.mapCore.map.addSource('pins-source', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        
        // Add circle layer for pins
        this.mapCore.map.addLayer({
            id: 'pins-layer',
            type: 'circle',
            source: 'pins-source',
            paint: {
                'circle-radius': [
                    'case',
                    ['==', ['get', 'type'], 'radar'], 8,
                    ['==', ['get', 'type'], 'accident'], 10,
                    ['==', ['get', 'type'], 'roadwork'], 8,
                    ['==', ['get', 'type'], 'police'], 9,
                    8 // default
                ],
                'circle-color': [
                    'case',
                    ['==', ['get', 'type'], 'radar'], '#ff0000',
                    ['==', ['get', 'type'], 'accident'], '#ffa500',
                    ['==', ['get', 'type'], 'roadwork'], '#ffff00',
                    ['==', ['get', 'type'], 'police'], '#0066cc',
                    '#ff0000' // default
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });
        
        // Add text layer for pin icons (emojis)
        this.mapCore.map.addLayer({
            id: 'pins-labels',
            type: 'symbol',
            source: 'pins-source',
            layout: {
                'text-field': [
                    'case',
                    ['==', ['get', 'type'], 'radar'], '📷',
                    ['==', ['get', 'type'], 'accident'], '⚠️',
                    ['==', ['get', 'type'], 'roadwork'], '🚧',
                    ['==', ['get', 'type'], 'police'], '👮',
                    '📍' // default
                ],
                'text-size': 12,
                'text-allow-overlap': true,
                'text-ignore-placement': true
            }
        });
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Insert a pin into the system
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @param {string} pinType - Type of pin (radar, accident, etc.)
     * @param {Object} data - Pin metadata
     */
    insertPin(lng, lat, pinType, data) {
        if (!this.pinTypes[pinType]) {
            console.warn(`Unknown pin type: ${pinType}`);
            pinType = 'radar'; // fallback
        }
        
        const pin = {
            id: data.id || this.generatePinId(),
            lng: lng,
            lat: lat,
            type: pinType,
            data: data || {},
            created: Date.now(),
            ...data // Allow data to override defaults
        };
        
        this.pins.set(pin.id, pin);
        this.queueUpdate();
        
        return pin.id;
    }
    
    /**
     * Remove a pin
     * @param {string} pinId - PIN ID to remove
     */
    removePin(pinId) {
        if (this.pins.has(pinId)) {
            this.pins.delete(pinId);
            this.clickHandlers.delete(pinId);
            this.queueUpdate();
            return true;
        }
        return false;
    }
    
    /**
     * Get pin by ID
     * @param {string} pinId - PIN ID
     * @returns {Object|null} Pin object or null
     */
    getPin(pinId) {
        return this.pins.get(pinId) || null;
    }
    
    /**
     * Get all pins
     * @returns {Array} Array of pin objects
     */
    getAllPins() {
        return Array.from(this.pins.values());
    }
    
    /**
     * Get pins by type
     * @param {string} pinType - PIN type filter
     * @returns {Array} Array of filtered pins
     */
    getPinsByType(pinType) {
        return this.getAllPins().filter(pin => pin.type === pinType);
    }
    
    /**
     * Update map with current pins (batch operation)
     */
    updateMap() {
        if (!this.mapCore.map.getSource('pins-source')) {
            console.warn('Pins source not found');
            return;
        }
        
        const features = this.getAllPins().map(pin => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [pin.lng, pin.lat]
            },
            properties: {
                id: pin.id,
                type: pin.type,
                name: pin.data.name || `${this.pinTypes[pin.type]?.name || 'Pin'}`,
                ...pin.data
            }
        }));
        
        this.mapCore.map.getSource('pins-source').setData({
            type: 'FeatureCollection',
            features: features
        });
        
        this.updateQueue.clear();
        this.updatePending = false;
    }
    
    /**
     * Make a pin clickable
     * @param {string} pinId - PIN ID
     * @param {Function} callback - Click callback function
     */
    makePinClickable(pinId, callback) {
        this.clickHandlers.set(pinId, callback);
    }
    
    /**
     * Remove click handler from pin
     * @param {string} pinId - PIN ID
     */
    removePinClickHandler(pinId) {
        this.clickHandlers.delete(pinId);
    }
    
    // ==================== VISIBILITY CONTROL ====================
    
    /**
     * Show/hide all pins
     * @param {boolean} visible - Whether pins should be visible
     */
    setVisibility(visible) {
        this.isVisible = visible;
        const visibility = visible ? 'visible' : 'none';
        
        if (this.mapCore.map.getLayer('pins-layer')) {
            this.mapCore.map.setLayoutProperty('pins-layer', 'visibility', visibility);
        }
        if (this.mapCore.map.getLayer('pins-labels')) {
            this.mapCore.map.setLayoutProperty('pins-labels', 'visibility', visibility);
        }
    }
    
    /**
     * Toggle pin visibility
     */
    toggleVisibility() {
        this.setVisibility(!this.isVisible);
    }
    
    /**
     * Show/hide pins by type
     * @param {string} pinType - PIN type to filter
     * @param {boolean} visible - Whether to show or hide
     */
    setTypeVisibility(pinType, visible) {
        // Implementation would require separate layers per type
        // For now, we'll filter the data itself
        this.updateMap();
    }
    
    // ==================== BATCH OPERATIONS ====================
    
    /**
     * Load multiple pins at once
     * @param {Array} pinsData - Array of pin objects
     */
    loadPins(pinsData) {
        pinsData.forEach(pinData => {
            const pin = {
                id: pinData.id || this.generatePinId(),
                lng: pinData.lng,
                lat: pinData.lat,
                type: pinData.type || 'radar',
                data: pinData.data || {},
                created: pinData.created || Date.now(),
                ...pinData
            };
            
            this.pins.set(pin.id, pin);
        });
        
        this.updateMap();
    }
    
    /**
     * Clear all pins
     */
    clearAllPins() {
        this.pins.clear();
        this.clickHandlers.clear();
        this.updateMap();
    }
    
    /**
     * Apply delta updates (for backend sync)
     * @param {Object} delta - {added: [], updated: [], deleted: []}
     */
    applyDelta(delta) {
        // Add new pins
        if (delta.added) {
            delta.added.forEach(pin => {
                this.pins.set(pin.id, pin);
            });
        }
        
        // Update existing pins
        if (delta.updated) {
            delta.updated.forEach(pin => {
                if (this.pins.has(pin.id)) {
                    this.pins.set(pin.id, { ...this.pins.get(pin.id), ...pin });
                }
            });
        }
        
        // Remove deleted pins
        if (delta.deleted) {
            delta.deleted.forEach(pinId => {
                this.pins.delete(pinId);
                this.clickHandlers.delete(pinId);
            });
        }
        
        this.updateMap();
    }
    
    // ==================== EVENT HANDLING ====================
    
    bindEvents() {
        if (!this.mapCore.map) return;
        
        // Handle pin clicks
        this.mapCore.map.on('click', 'pins-layer', (e) => {
            if (e.features.length > 0) {
                const pinId = e.features[0].properties.id;
                const clickHandler = this.clickHandlers.get(pinId);
                
                if (clickHandler) {
                    const pin = this.getPin(pinId);
                    clickHandler(pin, e);
                } else {
                    // Default click behavior - show popup
                    this.showPinPopup(pinId, e.lngLat);
                }
            }
        });
        
        // Change cursor on hover
        this.mapCore.map.on('mouseenter', 'pins-layer', () => {
            this.mapCore.map.getCanvas().style.cursor = 'pointer';
        });
        
        this.mapCore.map.on('mouseleave', 'pins-layer', () => {
            this.mapCore.map.getCanvas().style.cursor = '';
        });
    }
    
    /**
     * Show popup for pin
     * @param {string} pinId - PIN ID
     * @param {Object} lngLat - MapBox LngLat object
     */
    showPinPopup(pinId, lngLat) {
        const pin = this.getPin(pinId);
        if (!pin) return;
        
        const pinTypeInfo = this.pinTypes[pin.type] || this.pinTypes['radar'];
        
        const popup = new mapboxgl.Popup()
            .setLngLat(lngLat)
            .setHTML(`
                <div class="pin-popup">
                    <h4>${pinTypeInfo.icon} ${pinTypeInfo.name}</h4>
                    <p><strong>ID:</strong> ${pin.id}</p>
                    ${pin.data.name ? `<p><strong>Name:</strong> ${pin.data.name}</p>` : ''}
                    ${pin.data.description ? `<p><strong>Description:</strong> ${pin.data.description}</p>` : ''}
                    <p><strong>Location:</strong> ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}</p>
                    ${pin.data.speed_limit ? `<p><strong>Speed Limit:</strong> ${pin.data.speed_limit} km/h</p>` : ''}
                </div>
            `)
            .addTo(this.mapCore.map);
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Queue a map update (for batch operations)
     */
    queueUpdate() {
        if (!this.updatePending) {
            this.updatePending = true;
            // Use requestAnimationFrame to batch updates
            requestAnimationFrame(() => {
                this.updateMap();
            });
        }
    }
    
    /**
     * Generate unique PIN ID
     * @returns {string} Unique PIN ID
     */
    generatePinId() {
        return 'pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get statistics about loaded pins
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const stats = {
            total: this.pins.size,
            byType: {}
        };
        
        Object.keys(this.pinTypes).forEach(type => {
            stats.byType[type] = this.getPinsByType(type).length;
        });
        
        return stats;
    }
    
    /**
     * Export pins as GeoJSON
     * @returns {Object} GeoJSON FeatureCollection
     */
    exportAsGeoJSON() {
        const features = this.getAllPins().map(pin => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [pin.lng, pin.lat]
            },
            properties: {
                id: pin.id,
                type: pin.type,
                created: pin.created,
                ...pin.data
            }
        }));
        
        return {
            type: 'FeatureCollection',
            features: features
        };
    }
    
    // ==================== LAYER RESTORATION ====================
    
    /**
     * Restore pin layers after map style change
     */
    restoreLayers() {
        this.setupMapLayers();
        this.updateMap();
        this.bindEvents();
    }
}

// Make available globally
window.PinManager = PinManager;