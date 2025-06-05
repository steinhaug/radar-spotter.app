// gps-simulator.js - GPS log simulation and testing

class GpsSimulator {
    constructor() {
        this.isSimulating = false;
        this.simulationInterval = null;
        this.gpsLog = [];
        this.currentLogIndex = 0;
        this.playbackSpeed = 1; // 1x real-time
        this.defaultInterval = 1000; // 1 second between updates
        
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
                speed: Math.max(0, speed),
                heading: heading,
                accuracy: 3 + Math.random() * 7, // 3-10m accuracy
                timestamp: timestamp
            });
        }
        
        return route;
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
    
    startSimulation() {
        // Stopp ekte GPS hvis navigasjon er aktiv
        if (window.navigationCore && window.navigationCore.gpsWatchId) {
            navigator.geolocation.clearWatch(window.navigationCore.gpsWatchId);
            window.navigationCore.gpsWatchId = null;
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
        
        // Bruk beregnet intervall hvis tilgjengelig
        const interval = this.calculatedInterval || this.defaultInterval;
        
        this.updateSimulatorStatus(`Simulerer rute: ${routeData.length} punkter over ${Math.round(interval*routeData.length/60000)} min`);
        this.updateSimulatorButtons();
        
        // Start playback
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
        
        // Create GPS position object compatible with browser geolocation API
        const gpsPosition = {
            coords: {
                latitude: point.lat,
                longitude: point.lng,
                accuracy: point.accuracy || 5,
                speed: (point.speed || 50) / 3.6, // Convert km/h to m/s
                heading: point.heading || 0
            },
            timestamp: point.timestamp || Date.now()
        };
        
        // Send to navigation core
        if (window.navigationCore) {
            window.navigationCore.simulateGpsPosition(gpsPosition);
        }
        
        this.currentLogIndex++;
        this.updateSimulatorStatus(
            `Punkt ${this.currentLogIndex}/${routeData.length} - ` +
            `${Math.round(point.speed || 50)} km/h`
        );
    }
    
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
            let speed = 50; // Default speed
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
                speed: Math.min(speed, 120), // Cap at 120 km/h
                heading: heading,
                accuracy: 5,
                timestamp: timestamp
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
                speed: point.speed || 50,
                heading: point.heading || point.bearing || 0,
                accuracy: point.accuracy || 5,
                timestamp: point.timestamp || Date.now() + (index * 1000)
            }));
        } else if (data.locations) {
            // Google Takeout format
            this.gpsLog = data.locations.map((point, index) => ({
                lat: point.latitudeE7 / 1e7,
                lng: point.longitudeE7 / 1e7,
                speed: 50, // Estimate
                heading: 0,
                accuracy: point.accuracy || 5,
                timestamp: parseInt(point.timestampMs) || Date.now() + (index * 1000)
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
                let speed = 50;
                let heading = 0;
                
                if (index > 0) {
                    const prevPoint = this.gpsLog[index - 1];
                    heading = this.calculateHeading(prevPoint.lat, prevPoint.lng, lat, lng);
                }
                
                this.gpsLog.push({
                    lat: lat,
                    lng: lng,
                    speed: speed,
                    heading: heading,
                    accuracy: 5,
                    timestamp: Date.now() + (index * 2000)
                });
            }
        });
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
    
    updateSimulatorStatus(message) {
        // Update GPS status in main interface
        if (window.navigationCore) {
            window.navigationCore.updateStatus('gps-status', `SIMULERING: ${message}`);
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
    
    // Public methods for external control
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


    loadGeneratedLog(gpsLog, routeDuration = null) {
        this.gpsLog = gpsLog;
        
        // Beregn realistisk intervall hvis vi har rutetid
        if (routeDuration && gpsLog.length > 0) {
            this.calculatedInterval = (routeDuration * 1000) / gpsLog.length;
            console.log(`Route duration: ${routeDuration}s, Points: ${gpsLog.length}, Interval: ${this.calculatedInterval.toFixed(1)}ms`);
        } else {
            this.calculatedInterval = this.defaultInterval;
        }
        
        this.updateSimulatorStatus(`Rute-logg lastet: ${gpsLog.length} punkter (${Math.round(this.calculatedInterval/1000*gpsLog.length/60)} min)`);
    }




}

// Initialize GPS simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gpsSimulator = new GpsSimulator();
});