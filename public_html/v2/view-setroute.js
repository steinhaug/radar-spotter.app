// view-setroute.js - Display panel and route planning functionality

class ViewSetRoute {
    constructor(navigationCore) {
        this.nav = navigationCore;
        this.map = navigationCore.map;
        
        // Display panel state
        this.currentMapStyle = 'mapbox://styles/mapbox/dark-v11';
        this.is3DEnabled = false;
        this.isSatelliteMode = false;
        this.labelsVisible = true;
        
        // Route planning state
        this.currentRoute = null;
        this.routeLayer = null;
        this.startMarker = null;
        this.destinationMarker = null;
        this.waypoints = [];
        this.searchResults = [];
        
        this.init();
    }
    
    init() {
        this.bindDisplayPanelEvents();
        this.bindRoutePanelEvents();
        this.setupMapEventListeners();
        this.startCoordinateUpdates();
        this.initializeDragFunctionality();
        // Start with both panels collapsed
        document.getElementById('display-panel').classList.add('collapsed');
        document.getElementById('route-panel').classList.add('collapsed');
    }
    
    // ==================== DISPLAY PANEL FUNCTIONALITY ====================
    
    bindDisplayPanelEvents() {
        // Panel toggle
        document.getElementById('toggle-display-panel').addEventListener('click', () => {
            this.togglePanel('display-panel');
        });
        
        // Map type buttons
        document.querySelectorAll('.map-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeMapType(e.target.closest('.map-type-btn'));
            });
        });
        
        // Coordinate copy buttons
        document.getElementById('copy-lat').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('center-lat').value);
        });
        
        document.getElementById('copy-lng').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('center-lng').value);
        });
        
        document.getElementById('copy-gps-lat').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('gps-lat').value);
        });
        
        document.getElementById('copy-gps-lng').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('gps-lng').value);
        });
        
        // Map control buttons
        document.getElementById('toggle-3d').addEventListener('click', () => {
            this.toggle3DTerrain();
        });
        
        document.getElementById('toggle-satellite').addEventListener('click', () => {
            this.toggleSatelliteMode();
        });
        
        document.getElementById('toggle-labels').addEventListener('click', () => {
            this.toggleLabels();
        });
        
        document.getElementById('fullscreen-map').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.map.zoomIn();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.map.zoomOut();
        });
        
        // Reset controls
        document.getElementById('reset-bearing').addEventListener('click', () => {
            this.map.setBearing(0);
        });
        
        document.getElementById('reset-pitch').addEventListener('click', () => {
            this.map.setPitch(0);
        });
    }
    
    changeMapType(button) {
        // Remove active class from all buttons
        document.querySelectorAll('.map-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get style and type from data attributes
        const style = button.dataset.style;
        const type = button.dataset.type;
        
        // Store for route calculations
        this.currentTransportMode = type;

        this.currentMapStyle = style;
        this.map.setStyle(style);
        
        // Gjenopprett lag når stil er lastet
        this.map.once('styledata', () => {
            this.restoreMapLayers();
        });

    }
    
    toggle3DTerrain() {
        const btn = document.getElementById('toggle-3d');
        this.is3DEnabled = !this.is3DEnabled;
        
        if (this.is3DEnabled) {
            this.map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });
            this.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
            btn.classList.add('active');
        } else {
            this.map.setTerrain(null);
            if (this.map.getSource('mapbox-dem')) {
                this.map.removeSource('mapbox-dem');
            }
            btn.classList.remove('active');
        }
    }
    
    toggleSatelliteMode() {
        const btn = document.getElementById('toggle-satellite');
        this.isSatelliteMode = !this.isSatelliteMode;
        
        if (this.isSatelliteMode) {
            this.map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
            btn.classList.add('active');
        } else {
            this.map.setStyle(this.currentMapStyle);
            btn.classList.remove('active');
        }
        
        // Gjenopprett lag når stil er lastet
        this.map.once('styledata', () => {
            this.restoreMapLayers();
        });
    }
    
    toggleLabels() {
        const btn = document.getElementById('toggle-labels');
        this.labelsVisible = !this.labelsVisible;
        
        // Toggle visibility of label layers
        const labelLayers = ['country-label', 'state-label', 'place-label', 'poi-label'];
        labelLayers.forEach(layer => {
            if (this.map.getLayer(layer)) {
                this.map.setLayoutProperty(layer, 'visibility', 
                    this.labelsVisible ? 'visible' : 'none');
            }
        });
        
        if (this.labelsVisible) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.getElementById('map-container').requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    setupMapEventListeners() {
        // Update coordinates when map moves
        this.map.on('move', () => {
            this.updateMapInfo();
        });
        
        this.map.on('zoom', () => {
            this.updateMapInfo();
        });
        
        this.map.on('rotate', () => {
            this.updateMapInfo();
        });
        
        this.map.on('pitch', () => {
            this.updateMapInfo();
        });
    }
    
    startCoordinateUpdates() {
        // Update coordinates every 100ms for smooth updates
        setInterval(() => {
            this.updateMapInfo();
        }, 100);
    }
    
    updateMapInfo() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const bearing = this.map.getBearing();
        const pitch = this.map.getPitch();
        
        // Update coordinate displays
        document.getElementById('center-lat').value = center.lat.toFixed(6);
        document.getElementById('center-lng').value = center.lng.toFixed(6);
        
        // Update map info
        document.getElementById('current-zoom').textContent = zoom.toFixed(1);
        document.getElementById('current-bearing').textContent = Math.round(bearing) + '°';
        document.getElementById('current-pitch').textContent = Math.round(pitch) + '°';
    }
    
    updateGpsCoordinates(position) {
        if (position) {
            document.getElementById('gps-lat').value = position.lat.toFixed(6);
            document.getElementById('gps-lng').value = position.lng.toFixed(6);
            document.getElementById('gps-accuracy').value = Math.round(position.accuracy || 0);
        } else {
            document.getElementById('gps-lat').value = '−';
            document.getElementById('gps-lng').value = '−';
            document.getElementById('gps-accuracy').value = '−';
        }
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback - could add a toast notification here
            console.log('Copied to clipboard:', text);
        });
    }
    
    // ==================== ROUTE PANEL FUNCTIONALITY ====================
    
    bindRoutePanelEvents() {
        // Panel toggle
        document.getElementById('toggle-route-panel').addEventListener('click', () => {
            this.togglePanel('route-panel');
        });
        
        // Address search
        const searchInput = document.getElementById('address-search');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    this.searchAddresses(query);
                }, 300);
                document.getElementById('clear-search').classList.remove('hidden');
            } else {
                this.hideSearchResults();
                document.getElementById('clear-search').classList.add('hidden');
            }
        });
        
        document.getElementById('search-btn').addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.searchAddresses(query);
            }
        });
        
        document.getElementById('clear-search').addEventListener('click', () => {
            searchInput.value = '';
            this.hideSearchResults();
            document.getElementById('clear-search').classList.add('hidden');
        });
        
        // Quick location buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const location = btn.dataset.location;
                const coords = JSON.parse(btn.dataset.coords);
                this.setDestination(coords[0], coords[1], location);
            });
        });
        
        // Route point controls
        document.getElementById('use-current-location').addEventListener('click', () => {
            this.useCurrentLocationAsStart();
        });
        
        document.getElementById('use-map-center').addEventListener('click', () => {
            this.useMapCenterAsDestination();
        });
        
        document.getElementById('add-waypoint').addEventListener('click', () => {
            this.addWaypoint();
        });
        
        // Route actions
        document.getElementById('calculate-route').addEventListener('click', () => {
            this.calculateRoute();
        });
        
        document.getElementById('clear-route').addEventListener('click', () => {
            this.clearRoute();
        });
        
        document.getElementById('reverse-route').addEventListener('click', () => {
            this.reverseRoute();
        });
        
        document.getElementById('optimize-route').addEventListener('click', () => {
            this.optimizeRoute();
        });
        
        // Export functions
        document.getElementById('export-gpx').addEventListener('click', () => {
            this.exportRouteAsGpx();
        });
        
        document.getElementById('share-route').addEventListener('click', () => {
            this.shareRoute();
        });
    }
    
    async searchAddresses(query) {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
                `access_token=${window.APP_CONFIG.mapboxToken}&` +
                `country=NO&` +
                `proximity=${this.map.getCenter().lng},${this.map.getCenter().lat}&` +
                `limit=5`
            );
            
            const data = await response.json();
            this.displaySearchResults(data.features);
            
        } catch (error) {
            console.error('Address search error:', error);
            this.hideSearchResults();
        }
    }
    
    displaySearchResults(features) {
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '';
        
        if (features.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">Ingen resultater funnet</div>';
        } else {
            features.forEach(feature => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="result-name">${feature.text}</div>
                    <div class="result-address">${feature.place_name}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.selectSearchResult(feature);
                });
                
                resultsContainer.appendChild(item);
            });
        }
        
        resultsContainer.classList.remove('hidden');
    }
    
    selectSearchResult(feature) {
        const [lng, lat] = feature.center;
        this.setDestination(lng, lat, feature.place_name);
        this.hideSearchResults();
        document.getElementById('address-search').value = '';
    }
    
    hideSearchResults() {
        document.getElementById('search-results').classList.add('hidden');
    }
    
    setDestination(lng, lat, name) {
        // Update destination input and coordinates
        document.getElementById('destination-address').value = name;
        document.getElementById('destination-coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        // Remove existing destination marker
        if (this.destinationMarker) {
            this.destinationMarker.remove();
        }
        
        // Add new destination marker
        this.destinationMarker = new mapboxgl.Marker({ color: '#ff0000' })
            .setLngLat([lng, lat])
            .addTo(this.map);
        
        // Center map on destination
        this.map.flyTo({
            center: [lng, lat],
            zoom: 14
        });
    }
    
    useCurrentLocationAsStart() {
        if (this.nav.currentPosition) {
            const pos = this.nav.currentPosition;
            document.getElementById('start-address').value = 'Nåværende GPS-posisjon';
            document.getElementById('start-coords').textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
            
            // Remove existing start marker
            if (this.startMarker) {
                this.startMarker.remove();
            }
            
            // Add start marker
            this.startMarker = new mapboxgl.Marker({ color: '#00ff00' })
                .setLngLat([pos.lng, pos.lat])
                .addTo(this.map);
        } else {
            alert('GPS-posisjon ikke tilgjengelig. Start navigasjon først.');
        }
    }
    
    useMapCenterAsDestination() {
        const center = this.map.getCenter();
        this.setDestination(center.lng, center.lat, 'Kartsentrum');
    }
    
    async calculateRoute() {
        const startCoords = this.getStartCoordinates();
        const destCoords = this.getDestinationCoordinates();
        
        if (!startCoords || !destCoords) {
            alert('Både start og destinasjon må være satt');
            return;
        }
        
        try {
            const profile = document.querySelector('input[name="route-profile"]:checked').value;
            const avoidTolls = document.getElementById('avoid-tolls').checked;
            const avoidHighways = document.getElementById('avoid-highways').checked;
            
            let url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/` +
                    `${startCoords.lng},${startCoords.lat};${destCoords.lng},${destCoords.lat}?` +
                    `geometries=geojson&steps=true&overview=full&` +
                    `access_token=${window.APP_CONFIG.mapboxToken}`;
            
            if (avoidTolls) url += '&exclude=toll';
            if (avoidHighways) url += '&exclude=motorway';
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                this.displayRoute(data.routes[0]);
                this.showRouteInfo(data.routes[0]);
                this.nav.updateStatus('active-route', 'Rute beregnet');
            } else {
                alert('Kunne ikke beregne rute');
            }
            
        } catch (error) {
            console.error('Route calculation error:', error);
            alert('Feil ved ruteberegning');
        }
    }
    
    displayRoute(route) {
        // Remove existing route
        this.clearRouteLayer();
        
        // Add route source and layer
        this.map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
            }
        });
        
        this.map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
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
        
        this.currentRoute = route;
        
        // Fit map to route
        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        
        this.map.fitBounds(bounds, { padding: 50 });
    }
    
    showRouteInfo(route) {
        const distance = (route.distance / 1000).toFixed(1); // km
        const duration = Math.round(route.duration / 60); // minutes
        const fuel = (route.distance / 100000 * 8).toFixed(1); // rough estimate: 8L/100km
        
        document.getElementById('route-distance').textContent = `${distance} km`;
        document.getElementById('route-duration').textContent = `${duration} min`;
        document.getElementById('route-fuel').textContent = `${fuel} L`;
        document.getElementById('route-tolls').textContent = 'Ukjent';
        
        document.getElementById('route-info-section').style.display = 'block';
    }
    
    clearRoute() {
        this.clearRouteLayer();
        this.clearMarkers();
        this.clearInputs();
        document.getElementById('route-info-section').style.display = 'none';
        this.nav.updateStatus('active-route', 'Ingen');
    }
    
    clearRouteLayer() {
        if (this.map.getLayer('route')) {
            this.map.removeLayer('route');
        }
        if (this.map.getSource('route')) {
            this.map.removeSource('route');
        }
    }
    
    clearMarkers() {
        if (this.startMarker) {
            this.startMarker.remove();
            this.startMarker = null;
        }
        if (this.destinationMarker) {
            this.destinationMarker.remove();
            this.destinationMarker = null;
        }
    }
    
    clearInputs() {
        document.getElementById('start-address').value = '';
        document.getElementById('destination-address').value = '';
        document.getElementById('start-coords').textContent = 'Ikke satt';
        document.getElementById('destination-coords').textContent = 'Ikke satt';
    }
    
    reverseRoute() {
        const startAddr = document.getElementById('start-address').value;
        const destAddr = document.getElementById('destination-address').value;
        const startCoords = document.getElementById('start-coords').textContent;
        const destCoords = document.getElementById('destination-coords').textContent;
        
        if (startAddr && destAddr) {
            document.getElementById('start-address').value = destAddr;
            document.getElementById('destination-address').value = startAddr;
            document.getElementById('start-coords').textContent = destCoords;
            document.getElementById('destination-coords').textContent = startCoords;
            
            // Swap markers
            const tempMarker = this.startMarker;
            this.startMarker = this.destinationMarker;
            this.destinationMarker = tempMarker;
            
            // Update marker colors
            if (this.startMarker) this.startMarker._color = '#00ff00';
            if (this.destinationMarker) this.destinationMarker._color = '#ff0000';
        }
    }
    
    exportRouteAsGpx() {
        if (!this.currentRoute) {
            alert('Ingen rute å eksportere');
            return;
        }
        
        // Generate GPX content
        const coordinates = this.currentRoute.geometry.coordinates;
        let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Radar Navigation System">
<trk>
<name>Generated Route</name>
<trkseg>`;
        
        coordinates.forEach(coord => {
            gpxContent += `<trkpt lat="${coord[1]}" lon="${coord[0]}"></trkpt>\n`;
        });
        
        gpxContent += `</trkseg>
</trk>
</gpx>`;
        
        // Download file
        const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'route.gpx';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    shareRoute() {
        if (!this.currentRoute) {
            alert('Ingen rute å dele');
            return;
        }
        
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const url = `${window.location.origin}${window.location.pathname}?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}`;
        
        navigator.clipboard.writeText(url).then(() => {
            alert('Rute-link kopiert til utklippstavle');
        });
    }
    

    // Ny metode for å gjenopprette lag
    restoreMapLayers() {
        // Be navigation core om å gjenopprette sine lag
        if (this.nav.setupMapLayers) {
            this.nav.setupMapLayers();
        }
        
        // Gjenopprett eventuelle andre lag fra view-setroute
        this.restoreRouteLayers();
    }

    restoreRouteLayers() {
        // Gjenopprett rute hvis den eksisterer
        if (this.currentRoute) {
            this.displayRoute(this.currentRoute);
        }
    }



    // ==================== UTILITY FUNCTIONS ====================
    
    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        panel.classList.toggle('collapsed');

        // Bring panel to front when opening
        if (!panel.classList.contains('collapsed')) {
            this.bringPanelToFront(panelId);
        }

    }
    
    getStartCoordinates() {
        const coords = document.getElementById('start-coords').textContent;
        if (coords === 'Ikke satt') return null;
        
        const [lat, lng] = coords.split(', ').map(parseFloat);
        return { lat, lng };
    }
    
    getDestinationCoordinates() {
        const coords = document.getElementById('destination-coords').textContent;
        if (coords === 'Ikke satt') return null;
        
        const [lat, lng] = coords.split(', ').map(parseFloat);
        return { lat, lng };
    }
    
    // Method for generating GPS log from current route
    generateGpsLogFromRoute() {
        if (!this.currentRoute) {
            alert('Ingen rute å konvertere til GPS-logg');
            return null;
        }
        

        const coordinates = this.currentRoute.geometry.coordinates;
        const routeDuration = this.currentRoute.duration;
        const steps = this.currentRoute.legs[0].steps;
        
        const gpsLog = coordinates.map((coord, index) => {
            const [lng, lat] = coord;
            
            // Find corresponding step for speed estimation
            let speed = 50; // Default speed
            const currentStep = steps.find(step => {
                const stepCoords = step.geometry.coordinates;
                return stepCoords.some(sc => 
                    Math.abs(sc[0] - lng) < 0.001 && Math.abs(sc[1] - lat) < 0.001
                );
            });
            
            if (currentStep && currentStep.maneuver) {
                // Estimate speed based on road type or maneuver
                speed = this.estimateSpeedFromStep(currentStep);
            }
            
            return {
                lat: lat,
                lng: lng,
                speed: speed,
                heading: index > 0 ? this.calculateHeading(
                    coordinates[index-1][1], coordinates[index-1][0],
                    lat, lng
                ) : 0,
                accuracy: 5,
                timestamp: Date.now() + (index * 2000) // 2 seconds between points
            };
        });
        
        return { gpsLog, duration: routeDuration };
    }
    
    // ==================== PANEL MANAGEMENT ====================

    activatePanel(panelId) {
        // Remove active class from all panels
        document.querySelectorAll('.floating-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Add active class to clicked panel
        const activePanel = document.getElementById(panelId);
        if (activePanel && !activePanel.classList.contains('collapsed')) {
            activePanel.classList.add('active');
        }
    }

    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        const isCollapsing = !panel.classList.contains('collapsed');
        
        panel.classList.toggle('collapsed');
        
        if (!isCollapsing) {
            // Panel is being opened - make it active
            this.activatePanel(panelId);
        } else {
            // Panel is being collapsed - remove active state
            panel.classList.remove('active');
        }
    }

    estimateSpeedFromStep(step) {
        const maneuver = step.maneuver.type;
        const roadClass = step.intersections?.[0]?.classes || [];
        
        // Speed estimation based on maneuver and road type
        if (roadClass.includes('motorway')) return 90;
        if (roadClass.includes('trunk')) return 80;
        if (maneuver.includes('roundabout')) return 30;
        if (maneuver.includes('turn')) return 40;
        
        return 50; // Default urban speed
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

    // ==================== PANEL Z-INDEX MANAGEMENT ====================

    bringPanelToFront(activePanelId) {
        // List of all draggable panels
        const panelIds = ['display-panel', 'route-panel'];
        
        // Set all panels to low z-index
        panelIds.forEach(id => {
            const panel = document.getElementById(id);
            if (panel) {
                panel.style.zIndex = '1000';
            }
        });
        
        // Set active panel to high z-index
        const activePanel = document.getElementById(activePanelId);
        if (activePanel) {
            activePanel.style.zIndex = '1100';
        }
    }

    // ==================== DRAG FUNCTIONALITY ====================

    initializeDragFunctionality() {
        this.makePanelDraggable('display-panel');
        this.makePanelDraggable('route-panel');
    
        // Add click listeners to bring panels to front
        ['display-panel', 'route-panel'].forEach(panelId => {
            const panel = document.getElementById(panelId);
            panel.addEventListener('mousedown', () => {
                this.bringPanelToFront(panelId);
            });
        });
    }

    makePanelDraggable(panelId) {
        const panel = document.getElementById(panelId);
        const header = panel.querySelector('.panel-header');
        
        let isDragging = false;
        let startPos = { x: 0, y: 0 };
        let panelStart = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            panel.classList.add('dragging');
            
            // Lagre start-posisjoner
            startPos.x = e.clientX;
            startPos.y = e.clientY;
            panelStart.x = parseInt(panel.style.left || getComputedStyle(panel).left);
            panelStart.y = parseInt(panel.style.top || getComputedStyle(panel).top);
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startPos.x;
            const deltaY = e.clientY - startPos.y;
            
            const newX = panelStart.x + deltaX;
            const newY = panelStart.y + deltaY;
            
            panel.style.left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, newX)) + 'px';
            panel.style.top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newY)) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.classList.remove('dragging');
        });
    }


}

// Initialize when DOM is loaded and navigation core is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for navigation core to be initialized
    const checkNavigationCore = () => {
        if (window.navigationCore && window.navigationCore.map) {
            window.viewSetRoute = new ViewSetRoute(window.navigationCore);
        } else {
            setTimeout(checkNavigationCore, 100);
        }
    };
    checkNavigationCore();
});
