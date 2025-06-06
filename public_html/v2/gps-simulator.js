// gps-simulator.js - Complete GPS simulation system with route integration

class GpsSimulator {
    constructor() {
        this.isSimulating = false;
        this.simulationInterval = null;
        this.gpsLog = [];
        this.currentLogIndex = 0;
        this.playbackSpeed = 1; // 1x real-time
        this.defaultInterval = 1000; // 1 second between updates
        this.calculatedInterval = null; // For route-based timing
        
        // Demo route data - Kristiansand to Mandal
        this.demoRoute = this.generateDemoRoute();
        
        this.bindEventListeners();
    }
    
    bindEventListeners() {
        document.getElementById('start-simulation').addEventListener('click', () => {
            this.startSimulation();
        });
        
        document.getElementById('stop-simulation').addEventListener('click', () => {
            this.stopSimulation();
        });
    }
    
    // ==================== SIMULATION CONTROL ====================
    
    startSimulation() {
        // Stop real GPS if navigation is active
        if (window.radarNavigationSystem && window.radarNavigationSystem.locationProvider) {
            window.radarNavigationSystem.locationProvider.stop();
        }

        if (this.isSimulating) return;
        
        // Use loaded log or demo route
        const routeData = this.gpsLog.length > 0 ? this.gpsLog : this.demoRoute;
        
        if (routeData.length === 0) {
            this.updateSimulatorStatus('Ingen GPS data tilgjengelig');
            return;
        }
        
        this.isSimulating = true;
        this.currentLogIndex = 0;
        
        // Use calculated interval if available
        const interval = this.calculatedInterval || this.defaultInterval;
        
        this.updateSimulatorStatus(`Simulerer rute: ${routeData.length} punkter over ${Math.round(interval*routeData.length/60000)} min`);
        this.updateSimulatorButtons();
        
        // Start LocationProvider in simulation mode
        if (window.radarNavigationSystem && window.radarNavigationSystem.locationProvider) {
            window.radarNavigationSystem.locationProvider.loadSimulationData(routeData, interval);
            window.radarNavigationSystem.locationProvider.start('simulation');
        }
        
        this.simulationInterval = setInterval(() => {
            this.playNextGpsPoint(routeData);
        }, interval / this.playbackSpeed);
    }
    
    stopSimulation() {
        if (!this.isSimulating) return;
        
        this.isSimulating = false;
        this.currentLogIndex = 0;
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        // Stop LocationProvider simulation
        if (window.radarNavigationSystem && window.radarNavigationSystem.locationProvider) {
            window.radarNavigationSystem.locationProvider.stop();
        }
        
        this.updateSimulatorStatus('Simulering stoppet');
        this.updateSimulatorButtons();
    }
    
    playNextGpsPoint(routeData) {
        if (this.currentLogIndex >= routeData.length) {
            this.stopSimulation();
            this.updateSimulatorStatus('Simulering fullført');
            return;
        }
        
        const point = routeData[this.currentLogIndex];
        this.currentLogIndex++;
        
        this.updateSimulatorStatus(
            `Punkt ${this.currentLogIndex}/${routeData.length} - ` +
            `${Math.round(point.speed * 3.6 || 50)} km/h`
        );
    }
    
    // ==================== ROUTE INTEGRATION ====================
    
    generateFromRoute(route) {
        if (!route || !route.geometry || !route.geometry.coordinates) {
            this.updateSimulatorStatus('Ingen gyldig rute å konvertere');
            return;
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
            let speed = this.estimateSpeedFromRoute(route, progress);
            
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
        
        // Load generated GPS log with proper timing
        this.loadGeneratedLog(gpsLog, totalDuration);
        
        this.updateSimulatorStatus(
            `Rute konvertert: ${gpsLog.length} punkter (${Math.round(totalDuration/60)} min)`
        );
    }
    
    estimateSpeedFromRoute(route, progress) {
        // Simple speed estimation based on route type
        const legs = route.legs && route.legs[0];
        if (!legs || !legs.steps) return 50;
        
        // Find current step based on progress
        let accumulatedDistance = 0;
        const totalDistance = route.distance;
        const targetDistance = progress * totalDistance;
        
        for (const step of legs.steps) {
            accumulatedDistance += step.distance;
            if (accumulatedDistance >= targetDistance) {
                return this.getSpeedForManeuver(step.maneuver);
            }
        }
        
        return 50; // Default
    }
    
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
    
    // ==================== FILE LOADING ====================
    
    loadLogFile(fileContent, fileName) {
        try {
            const extension = fileName.split('.').pop().toLowerCase();
            
            switch (extension) {
                case 'gpx':
                    this.parseGpxFile(fileContent);
                    break;
                case 'json':
                    this.parseJsonFile(fileContent);
                    break;
                case 'kml':
                    this.parseKmlFile(fileContent);
                    break;
                default:
                    throw new Error(`Usupportert filformat: ${extension}`);
            }
            
            this.updateSimulatorStatus(`Lastet ${fileName}: ${this.gpsLog.length} punkter`);
            
        } catch (error) {
            console.error('Error parsing GPS log:', error);
            this.updateSimulatorStatus(`Feil ved lasting: ${error.message}`);
        }
    }
    
    loadGeneratedLog(gpsLog, routeDuration = null) {
        this.gpsLog = gpsLog;
        
        // Calculate realistic interval if we have route duration
        if (routeDuration && gpsLog.length > 0) {
            this.calculatedInterval = (routeDuration * 1000) / gpsLog.length;
            console.log(`Route duration: ${routeDuration}s, Points: ${gpsLog.length}, Interval: ${this.calculatedInterval.toFixed(1)}ms`);
        } else {
            this.calculatedInterval = this.defaultInterval;
        }
        
        this.updateSimulatorStatus(`Rute-logg lastet: ${gpsLog.length} punkter (${Math.round(this.calculatedInterval/1000*gpsLog.length/60)} min)`);
    }
    
    // ==================== FILE PARSING ====================
    
    parseGpxFile(content) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const trackPoints = xmlDoc.getElementsByTagName('trkpt');
        
        this.gpsLog = [];
        
        for (let i = 0; i < trackPoints.length; i++) {
            const point = trackPoints[i];
            const lat = parseFloat(point.getAttribute('lat'));
            const lng = parseFloat(point.getAttribute('lon'));
            
            // Extract time if available
            const timeElement = point.getElementsByTagName('time')[0];
            const timestamp = timeElement ? 
                new Date(timeElement.textContent).getTime() : 
                Date.now() + (i * 1000);
            
            // Calculate speed and heading from previous point
            let speed = 50; // Default speed km/h
            let heading = 0;
            
            if (i > 0) {
                const prevPoint = this.gpsLog[i - 1];
                const timeDiff = (timestamp - prevPoint.timestamp) / 1000; // seconds
                const distance = this.calculateDistance(
                    prevPoint.lat, prevPoint.lng, lat, lng
                );
                
                if (timeDiff > 0) {
                    speed = (distance / timeDiff) * 3.6; // m/s to km/h
                }
                
                heading = this.calculateHeading(prevPoint.lat, prevPoint.lng, lat, lng);
            }
            
            this.gpsLog.push({
                lat: lat,
                lng: lng,
                speed: speed / 3.6, // Store as m/s
                heading: heading,
                accuracy: 5,
                timestamp: timestamp,
                altitude: null,
                altitudeAccuracy: null
            });
        }
    }
    
    parseJsonFile(content) {
        const data = JSON.parse(content);
        
        // Handle different JSON formats
        if (Array.isArray(data)) {
            this.gpsLog = data.map((point, index) => ({
                lat: point.lat || point.latitude,
                lng: point.lng || point.longitude || point.lon,
                speed: (point.speed || 50) / 3.6, // Convert to m/s if in km/h
                heading: point.heading || point.bearing || 0,
                accuracy: point.accuracy || 5,
                timestamp: point.timestamp || Date.now() + (index * 1000),
                altitude: point.altitude || null,
                altitudeAccuracy: point.altitudeAccuracy || null
            }));
        } else if (data.locations) {
            // Google Takeout format
            this.gpsLog = data.locations.map((point, index) => ({
                lat: point.latitudeE7 / 1e7,
                lng: point.longitudeE7 / 1e7,
                speed: 50 / 3.6, // Estimate in m/s
                heading: 0,
                accuracy: point.accuracy || 5,
                timestamp: parseInt(point.timestampMs) || Date.now() + (index * 1000),
                altitude: null,
                altitudeAccuracy: null
            }));
        }
    }
    
    parseKmlFile(content) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const coordinates = xmlDoc.getElementsByTagName('coordinates')[0];
        
        if (!coordinates) {
            throw new Error('Ingen koordinater funnet i KML fil');
        }
        
        const coordText = coordinates.textContent.trim();
        const points = coordText.split(/\s+/);
        
        this.gpsLog = [];
        
        points.forEach((pointStr, index) => {
            const [lng, lat, alt] = pointStr.split(',').map(parseFloat);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                let speed = 50; // Default km/h
                let heading = 0;
                
                if (index > 0) {
                    const prevPoint = this.gpsLog[index - 1];
                    heading = this.calculateHeading(prevPoint.lat, prevPoint.lng, lat, lng);
                }
                
                this.gpsLog.push({
                    lat: lat,
                    lng: lng,
                    speed: speed / 3.6, // Convert to m/s
                    heading: heading,
                    accuracy: 5,
                    timestamp: Date.now() + (index * 2000),
                    altitude: alt || null,
                    altitudeAccuracy: null
                });
            }
        });
    }
    
    // ==================== DEMO ROUTE GENERATION ====================
    
    generateDemoRoute() {
        // Generate a realistic route from Kristiansand to Mandal (E39)
        const route = [];
        const startLat = 58.1467; // Kristiansand
        const startLng = 8.0059;
        const endLat = 58.0294;   // Mandal
        const endLng = 7.4609;
        
        const points = 50; // Number of GPS points
        const speedVariation = [40, 60, 80, 70, 50, 90, 80]; // km/h variations
        
        for (let i = 0; i < points; i++) {
            const progress = i / (points - 1);
            
            // Interpolate position with some curve simulation
            const lat = startLat + (endLat - startLat) * progress + 
                       (Math.sin(progress * Math.PI * 3) * 0.002); // Add road curves
            const lng = startLng + (endLng - startLng) * progress + 
                       (Math.cos(progress * Math.PI * 2) * 0.001);
            
            // Calculate realistic speed and heading
            const speed = speedVariation[i % speedVariation.length] + 
                         (Math.random() - 0.5) * 10; // ±5 km/h variation
            
            const heading = this.calculateHeading(
                i > 0 ? route[i-1].lat : lat,
                i > 0 ? route[i-1].lng : lng,
                lat, lng
            );
            
            const timestamp = Date.now() + (i * 2000); // 2 seconds between points
            
            route.push({
                lat: lat,
                lng: lng,
                speed: Math.max(0, speed) / 3.6, // Convert to m/s
                heading: heading,
                accuracy: 3 + Math.random() * 7, // 3-10m accuracy
                timestamp: timestamp,
                altitude: null,
                altitudeAccuracy: null
            });
        }
        
        return route;
    }
    
    // ==================== UTILITY METHODS ====================
    
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
    
    updateSimulatorStatus(message) {
        // Update GPS status in main interface
        if (window.radarNavigationSystem) {
            window.radarNavigationSystem.updateStatus('gps-status', `SIMULERING: ${message}`);
        }
        console.log('GPS Simulator:', message);
    }
    
    updateSimulatorButtons() {
        const startBtn = document.getElementById('start-simulation');
        const stopBtn = document.getElementById('stop-simulation');
        
        if (this.isSimulating) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.textContent = 'Simulering pågår...';
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            startBtn.textContent = 'Start GPS Simulering';
        }
    }
    
    // ==================== PUBLIC API ====================
    
    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        if (this.isSimulating) {
            this.stopSimulation();
            this.startSimulation(); // Restart with new speed
        }
    }
    
    jumpToPosition(index) {
        if (index >= 0 && index < this.gpsLog.length) {
            this.currentLogIndex = index;
        }
    }
    
    getCurrentPosition() {
        const routeData = this.gpsLog.length > 0 ? this.gpsLog : this.demoRoute;
        if (this.currentLogIndex < routeData.length) {
            return routeData[this.currentLogIndex];
        }
        return null;
    }
    
    getStatistics() {
        return {
            isSimulating: this.isSimulating,
            currentIndex: this.currentLogIndex,
            totalPoints: this.gpsLog.length,
            playbackSpeed: this.playbackSpeed,
            interval: this.calculatedInterval || this.defaultInterval
        };
    }
}

// Initialize GPS simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gpsSimulator = new GpsSimulator();
});