// navigation-core.js - Main navigation system logic

class NavigationCore {
    constructor() {
        // Mapbox token - må settes til din egen token
        mapboxgl.accessToken = window.APP_CONFIG.mapboxToken;

        this.map = null;
        this.isNavigationActive = false;
        this.currentPosition = null;
        this.currentHeading = 0;
        this.gpsWatchId = null;
        this.radarPins = [];
        this.userMarker = null;
        this.pinsVisible = true;
        this.addPinMode = false;
        this.lastPositionTime = 0;
        this.speed = 0;
        
        // Warning system
        this.warningDistance = 500; // meters
        this.activeWarning = false;
        
        this.init();
    }
    
    init() {
        this.initializeMap();
        this.bindEventListeners();
        
        this.updateStatus('gps-status', 'Initialiserer...');
    }
    
    initializeMap() {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: window.APP_CONFIG.defaultCenter,
            zoom: 12,
            bearing: 0,
            pitch: 0
        });
        
        this.map.on('load', () => {
            this.setupMapLayers();
            this.updateStatus('gps-status', 'Kart lastet');
        });
        
        // Click handler for adding pins
        this.map.on('click', (e) => {
            if (this.addPinMode) {
                this.addRadarPin(e.lngLat.lng, e.lngLat.lat);
                this.toggleAddPinMode(false);
            }
        });
    }
    
    setupMapLayers() {
        // Add radar pins source
        this.map.addSource('radar-pins', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        
        // Add radar pins layer
        this.map.addLayer({
            id: 'radar-pins-layer',
            type: 'symbol',
            source: 'radar-pins',
            layout: {
                'icon-image': 'police-15',
                'icon-size': 2,
                'icon-allow-overlap': true
            },
            paint: {
                'icon-color': '#ff0000'
            }
        });
        
        // User position source
        this.map.addSource('user-position', {
            type: 'geojson',
            data: {
                type: 'Point',
                coordinates: [0, 0]
            }
        });
        
        // User position layer
        this.map.addLayer({
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

        this.loadRadarPins();

    }
    
    bindEventListeners() {
        // Navigation controls
        document.getElementById('start-navigation').addEventListener('click', () => {
            this.startNavigation();
        });
        
        document.getElementById('stop-navigation').addEventListener('click', () => {
            this.stopNavigation();
        });
        
        document.getElementById('center-map').addEventListener('click', () => {
            this.centerOnPosition();
        });
        
        // Pin controls
        document.getElementById('toggle-pins').addEventListener('click', () => {
            this.togglePinsVisibility();
        });
        
        document.getElementById('add-pin-mode').addEventListener('click', () => {
            this.toggleAddPinMode();
        });
        
        // GPS log upload
        document.getElementById('load-gps-log').addEventListener('click', () => {
            document.getElementById('gps-log-upload').click();
        });
        
        document.getElementById('gps-log-upload').addEventListener('change', (e) => {
            this.handleGpsLogUpload(e);
        });

        // Etter eksisterende event listeners, legg til:
        document.getElementById('generate-from-route').addEventListener('click', () => {
            this.generateGpsFromRoute();
        });

    }
    
    startNavigation() {
        if (!navigator.geolocation) {
            this.updateStatus('gps-status', 'GPS ikke støttet');
            return;
        }
        
        this.isNavigationActive = true;
        this.updateStatus('nav-status', 'Aktiv');
        this.showNavigationOverlay(true);
        
        // Start GPS tracking
        this.gpsWatchId = navigator.geolocation.watchPosition(
            (position) => this.handleGpsUpdate(position),
            (error) => this.handleGpsError(error),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000
            }
        );
        
        this.updateStatus('gps-status', 'Kobler til GPS...');
    }
    
    stopNavigation() {
        this.isNavigationActive = false;
        this.updateStatus('nav-status', 'Inaktiv');
        this.showNavigationOverlay(false);
        this.hideRadarWarning();
        
        if (this.gpsWatchId) {
            navigator.geolocation.clearWatch(this.gpsWatchId);
            this.gpsWatchId = null;
        }
        
        this.updateStatus('gps-status', 'Frakoblet');
    }
    
    handleGpsUpdate(position) {
        const coords = position.coords;
        const timestamp = position.timestamp;
        
        this.currentPosition = {
            lng: coords.longitude,
            lat: coords.latitude,
            accuracy: coords.accuracy,
            timestamp: timestamp
        };
        
        // Calculate speed and heading
        this.calculateSpeedAndHeading(timestamp);
        
        // Update map
        this.updateUserPosition();
        this.updateNavigationDisplay();
        
        // Check for radar warnings
        this.checkRadarWarnings();
        
        this.updateStatus('gps-status', `GPS aktiv (±${Math.round(coords.accuracy)}m)`);

        // Etter existing code i handleGpsUpdate(), legg til:
        if (window.viewSetRoute) {
            window.viewSetRoute.updateGpsCoordinates(this.currentPosition);
        }

    }
    
    handleGpsError(error) {
        let message = 'GPS feil';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS tilgang nektet';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'GPS posisjon utilgjengelig';
                break;
            case error.TIMEOUT:
                message = 'GPS timeout';
                break;
        }
        this.updateStatus('gps-status', message);
    }
    
    calculateSpeedAndHeading(timestamp) {
        if (this.lastPositionTime > 0 && this.currentPosition) {
            const timeDiff = (timestamp - this.lastPositionTime) / 1000; // seconds
            
            if (timeDiff > 0) {
                // Calculate speed (simplified)
                this.speed = this.currentPosition.accuracy > 50 ? 0 : Math.random() * 60; // Placeholder for demo
                
                // Calculate heading (simplified)
                this.currentHeading = (this.currentHeading + (Math.random() - 0.5) * 10) % 360;
                if (this.currentHeading < 0) this.currentHeading += 360;
            }
        }
        this.lastPositionTime = timestamp;
    }
    
    updateUserPosition() {
        if (!this.currentPosition) return;
        
        this.map.getSource('user-position').setData({
            type: 'Point',
            coordinates: [this.currentPosition.lng, this.currentPosition.lat]
        });
        
        // Auto-center in navigation mode
        if (this.isNavigationActive) {
            this.map.easeTo({
                center: [this.currentPosition.lng, this.currentPosition.lat],
                bearing: this.currentHeading,
                duration: 1000
            });
        }
    }
    
    updateNavigationDisplay() {
        if (!this.isNavigationActive) return;
        
        // Update speed display
        document.querySelector('.speed-value').textContent = Math.round(this.speed);
        
        // Update compass
        const compassArrow = document.querySelector('.compass-arrow');
        compassArrow.style.transform = `rotate(${this.currentHeading}deg)`;
        
        // Update direction text
        const directions = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
        const directionIndex = Math.round(this.currentHeading / 45) % 8;
        document.querySelector('.direction-text').textContent = directions[directionIndex];
    }
    
    checkRadarWarnings() {
        if (!this.currentPosition || this.radarPins.length === 0) return;
        
        let nearestPin = null;
        let nearestDistance = Infinity;
        
        this.radarPins.forEach(pin => {
            const distance = this.calculateDistance(
                this.currentPosition.lat, this.currentPosition.lng,
                pin.lat, pin.lng
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPin = pin;
            }
        });
        
        this.updateStatus('nearest-radar', nearestPin ? nearestPin.name : 'Ingen');
        this.updateStatus('radar-distance', nearestDistance < Infinity ? `${Math.round(nearestDistance)}m` : '-');
        
        // Show warning if within warning distance
        if (nearestDistance <= this.warningDistance && !this.activeWarning) {
            this.showRadarWarning(Math.round(nearestDistance));
        } else if (nearestDistance > this.warningDistance && this.activeWarning) {
            this.hideRadarWarning();
        }
    }
    
    showRadarWarning(distance) {
        this.activeWarning = true;
        document.getElementById('warning-distance').textContent = `${distance}m fremover`;
        document.getElementById('radar-warning').classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideRadarWarning();
        }, 5000);
    }
    
    hideRadarWarning() {
        this.activeWarning = false;
        document.getElementById('radar-warning').classList.add('hidden');
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
    
    centerOnPosition() {
        if (this.currentPosition) {
            this.map.flyTo({
                center: [this.currentPosition.lng, this.currentPosition.lat],
                zoom: 15
            });
        }
    }
    
    showNavigationOverlay(show) {
        const overlay = document.getElementById('navigation-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
    
    togglePinsVisibility() {
        this.pinsVisible = !this.pinsVisible;
        this.map.setLayoutProperty('radar-pins-layer', 'visibility', 
            this.pinsVisible ? 'visible' : 'none');
    }
    
    toggleAddPinMode(force = null) {
        this.addPinMode = force !== null ? force : !this.addPinMode;
        const btn = document.getElementById('add-pin-mode');
        
        if (this.addPinMode) {
            btn.textContent = 'Avbryt Pin';
            btn.classList.add('primary');
            btn.classList.remove('secondary');
            this.map.getCanvas().style.cursor = 'crosshair';
        } else {
            btn.textContent = 'Legg til Pin';
            btn.classList.add('secondary');
            btn.classList.remove('primary');
            this.map.getCanvas().style.cursor = '';
        }
    }
    
    addRadarPin(lng, lat) {
        const pin = {
            id: Date.now(),
            lng: lng,
            lat: lat,
            name: `Radar ${this.radarPins.length + 1}`,
            type: 'speed_camera'
        };
        
        this.radarPins.push(pin);
        this.updateRadarPinsLayer();
        
        // Save to backend (placeholder)
        this.saveRadarPin(pin);
    }
    
    loadRadarPins() {
        // Placeholder - load from backend
        // For now, add some demo pins around Kristiansand
        this.radarPins = [
            { id: 1, lng: 8.0059, lat: 58.1467, name: 'E18 Sør', type: 'speed_camera' },
            { id: 2, lng: 7.9956, lat: 58.1599, name: 'Vågsbygd', type: 'speed_camera' },
            { id: 3, lng: 8.0194, lat: 58.1525, name: 'Sentrum', type: 'speed_camera' }
        ];
        
        this.updateRadarPinsLayer();
    }
    
    updateRadarPinsLayer() {
        const features = this.radarPins.map(pin => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [pin.lng, pin.lat]
            },
            properties: {
                id: pin.id,
                name: pin.name,
                type: pin.type
            }
        }));
        
        this.map.getSource('radar-pins').setData({
            type: 'FeatureCollection',
            features: features
        });
    }
    
    saveRadarPin(pin) {
        // Placeholder for backend save
        console.log('Saving pin:', pin);
        // fetch('/api/radar-pins', { method: 'POST', body: JSON.stringify(pin) });
    }
    
    handleGpsLogUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Pass to GPS simulator
                if (window.gpsSimulator) {
                    window.gpsSimulator.loadLogFile(e.target.result, file.name);
                }
            } catch (error) {
                console.error('Error loading GPS log:', error);
                this.updateStatus('gps-status', 'Feil ved lasting av logg');
            }
        };
        reader.readAsText(file);
    }

    generateGpsFromRoute() {
        if (window.viewSetRoute) {
            const routeData = window.viewSetRoute.generateGpsLogFromRoute();
            if (routeData && window.gpsSimulator) {
                window.gpsSimulator.loadGeneratedLog(routeData.gpsLog, routeData.duration);
                this.updateStatus('gps-status', 'GPS-logg generert fra rute med realistisk timing');
            }
        }
    }

    updateStatus(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    // Public method for GPS simulator to inject position
    simulateGpsPosition(position) {
        if (this.isNavigationActive) {
            this.handleGpsUpdate(position);
        }
    }
}

// Initialize navigation system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationCore = new NavigationCore();
});