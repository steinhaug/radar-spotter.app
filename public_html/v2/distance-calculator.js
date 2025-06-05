// distance-calculator.js - Pure mathematical calculations for distances and geometry

class DistanceCalculator {
    
    // ==================== DISTANCE CALCULATIONS ====================
    
    /**
     * Calculate distance between two points using Haversine formula
     * @param {Object} point1 - {lat, lng}
     * @param {Object} point2 - {lat, lng}
     * @returns {number} Distance in meters
     */
    static calculateDistance(point1, point2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Calculate bearing between two points
     * @param {Object} point1 - {lat, lng}
     * @param {Object} point2 - {lat, lng}
     * @returns {number} Bearing in degrees (0-360)
     */
    static calculateBearing(point1, point2) {
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const lat1Rad = point1.lat * Math.PI / 180;
        const lat2Rad = point2.lat * Math.PI / 180;
        
        const x = Math.sin(dLng) * Math.cos(lat2Rad);
        const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                 Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
        
        let bearing = Math.atan2(x, y) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }
    
    // ==================== RADIUS OPERATIONS ====================
    
    /**
     * Find all pins within specified radius of a location
     * @param {Object} location - {lat, lng}
     * @param {Array} pins - Array of pin objects with lat/lng
     * @param {number} radiusMeters - Radius in meters
     * @returns {Array} Array of pins with distance property added
     */
    static findPinsWithinRadius(location, pins, radiusMeters) {
        const results = [];
        
        pins.forEach(pin => {
            const distance = this.calculateDistance(location, {
                lat: pin.lat,
                lng: pin.lng
            });
            
            if (distance <= radiusMeters) {
                results.push({
                    ...pin,
                    distance: distance,
                    bearing: this.calculateBearing(location, {
                        lat: pin.lat,
                        lng: pin.lng
                    })
                });
            }
        });
        
        // Sort by distance (closest first)
        return results.sort((a, b) => a.distance - b.distance);
    }
    
    /**
     * Get the closest pin to a location
     * @param {Object} location - {lat, lng}
     * @param {Array} pins - Array of pin objects
     * @returns {Object|null} Closest pin with distance, or null if no pins
     */
    static getClosestPin(location, pins) {
        if (!pins || pins.length === 0) return null;
        
        let closest = null;
        let minDistance = Infinity;
        
        pins.forEach(pin => {
            const distance = this.calculateDistance(location, {
                lat: pin.lat,
                lng: pin.lng
            });
            
            if (distance < minDistance) {
                minDistance = distance;
                closest = {
                    ...pin,
                    distance: distance,
                    bearing: this.calculateBearing(location, {
                        lat: pin.lat,
                        lng: pin.lng
                    })
                };
            }
        });
        
        return closest;
    }
    
    // ==================== ROUTE GEOMETRY OPERATIONS ====================
    
    /**
     * Find pins along a route with specified tolerance
     * @param {Object} routeGeometry - GeoJSON LineString geometry
     * @param {Array} pins - Array of pin objects
     * @param {number} toleranceMeters - Distance tolerance from route in meters
     * @returns {Array} Pins found along route with distance and position info
     */
    static findPinsOnRoute(routeGeometry, pins, toleranceMeters = 500) {
        if (!routeGeometry || !routeGeometry.coordinates) return [];
        
        const routePoints = routeGeometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
        }));
        
        const results = [];
        
        pins.forEach(pin => {
            const pinLocation = { lat: pin.lat, lng: pin.lng };
            const routeAnalysis = this.analyzePointToRoute(pinLocation, routePoints);
            
            if (routeAnalysis.distance <= toleranceMeters) {
                results.push({
                    ...pin,
                    distanceFromRoute: routeAnalysis.distance,
                    routeProgress: routeAnalysis.progress,
                    distanceAlongRoute: routeAnalysis.distanceAlongRoute,
                    closestRoutePoint: routeAnalysis.closestPoint
                });
            }
        });
        
        // Sort by distance along route
        return results.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
    }
    
    /**
     * Analyze how close a point is to a route
     * @param {Object} point - {lat, lng}
     * @param {Array} routePoints - Array of route points
     * @returns {Object} Analysis with distance, progress, etc.
     */
    static analyzePointToRoute(point, routePoints) {
        let minDistance = Infinity;
        let closestSegmentIndex = 0;
        let closestPoint = null;
        let distanceAlongRoute = 0;
        let totalRouteDistance = 0;
        
        // Calculate total route distance
        for (let i = 0; i < routePoints.length - 1; i++) {
            totalRouteDistance += this.calculateDistance(routePoints[i], routePoints[i + 1]);
        }
        
        let currentRouteDistance = 0;
        
        // Check each segment of the route
        for (let i = 0; i < routePoints.length - 1; i++) {
            const segmentStart = routePoints[i];
            const segmentEnd = routePoints[i + 1];
            const segmentLength = this.calculateDistance(segmentStart, segmentEnd);
            
            const result = this.pointToLineSegmentDistance(point, segmentStart, segmentEnd);
            
            if (result.distance < minDistance) {
                minDistance = result.distance;
                closestSegmentIndex = i;
                closestPoint = result.closestPoint;
                distanceAlongRoute = currentRouteDistance + result.distanceAlongSegment;
            }
            
            currentRouteDistance += segmentLength;
        }
        
        return {
            distance: minDistance,
            progress: totalRouteDistance > 0 ? distanceAlongRoute / totalRouteDistance : 0,
            distanceAlongRoute: distanceAlongRoute,
            closestPoint: closestPoint,
            segmentIndex: closestSegmentIndex
        };
    }
    
    /**
     * Calculate distance from point to line segment
     * @param {Object} point - {lat, lng}
     * @param {Object} lineStart - {lat, lng}
     * @param {Object} lineEnd - {lat, lng}
     * @returns {Object} Distance and closest point info
     */
    static pointToLineSegmentDistance(point, lineStart, lineEnd) {
        const A = point.lat - lineStart.lat;
        const B = point.lng - lineStart.lng;
        const C = lineEnd.lat - lineStart.lat;
        const D = lineEnd.lng - lineStart.lng;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let closestPoint;
        let distanceAlongSegment = 0;
        
        if (param < 0) {
            // Closest point is line start
            closestPoint = { lat: lineStart.lat, lng: lineStart.lng };
            distanceAlongSegment = 0;
        } else if (param > 1) {
            // Closest point is line end
            closestPoint = { lat: lineEnd.lat, lng: lineEnd.lng };
            distanceAlongSegment = this.calculateDistance(lineStart, lineEnd);
        } else {
            // Closest point is on the segment
            closestPoint = {
                lat: lineStart.lat + param * C,
                lng: lineStart.lng + param * D
            };
            distanceAlongSegment = param * this.calculateDistance(lineStart, lineEnd);
        }
        
        return {
            distance: this.calculateDistance(point, closestPoint),
            closestPoint: closestPoint,
            distanceAlongSegment: distanceAlongSegment
        };
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    /**
     * Convert meters to human readable string
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance string
     */
    static formatDistance(meters) {
        if (meters < 1000) {
            return Math.round(meters) + 'm';
        } else {
            return (meters / 1000).toFixed(1) + 'km';
        }
    }
    
    /**
     * Create a bounding box around a point
     * @param {Object} center - {lat, lng}
     * @param {number} radiusMeters - Radius in meters
     * @returns {Object} Bounding box {north, south, east, west}
     */
    static createBoundingBox(center, radiusMeters) {
        const earthRadius = 6371000; // meters
        const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI);
        const lngDelta = (radiusMeters / earthRadius) * (180 / Math.PI) / Math.cos(center.lat * Math.PI / 180);
        
        return {
            north: center.lat + latDelta,
            south: center.lat - latDelta,
            east: center.lng + lngDelta,
            west: center.lng - lngDelta
        };
    }
    
    /**
     * Check if point is within bounding box
     * @param {Object} point - {lat, lng}
     * @param {Object} bbox - {north, south, east, west}
     * @returns {boolean} True if point is within bounds
     */
    static isPointInBoundingBox(point, bbox) {
        return point.lat >= bbox.south && 
               point.lat <= bbox.north && 
               point.lng >= bbox.west && 
               point.lng <= bbox.east;
    }
    
    /**
     * Calculate area of polygon in square meters
     * @param {Array} points - Array of {lat, lng} points
     * @returns {number} Area in square meters
     */
    static calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        const earthRadius = 6371000; // meters
        
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const lat1 = points[i].lat * Math.PI / 180;
            const lat2 = points[j].lat * Math.PI / 180;
            const lng1 = points[i].lng * Math.PI / 180;
            const lng2 = points[j].lng * Math.PI / 180;
            
            area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        }
        
        area = Math.abs(area * earthRadius * earthRadius / 2);
        return area;
    }
}

// Make available globally
window.DistanceCalculator = DistanceCalculator;