# Radar Navigation System

A GPS-based navigation system with radar speed camera alerts for Norwegian roads. This project evolved through multiple iterations, from initial concept to production-ready architecture.

Demo: [https://app.steinhaug.no/radar-spotter-concept/](https://app.steinhaug.no/radar-spotter-concept/)  

## Project Overview

The Radar Navigation System provides real-time navigation with automatic alerts for speed cameras, police controls, and other road hazards. The system integrates MapBox for mapping, includes GPS simulation for testing, and features comprehensive route planning with PIN analysis.

---

## Development Phases

### Pre-Demo: MapBox Minimal Setup

**Objective:** Validate MapBox integration and basic mapping functionality.

**Implementation:**
- Single HTML file with minimal MapBox GL JS setup
- Basic map rendering and interaction
- Token validation and API connectivity test
- Foundation for understanding MapBox capabilities

**Key Learning:** Established that MapBox provided sufficient functionality for the navigation requirements.

---

### Demo 1: Proof of Concept

**Objective:** Create a working prototype demonstrating core navigation features.

**Architecture:**
- **Monolithic approach** - functionality spread across multiple files without clear separation
- **Mixed responsibilities** - UI, GPS, and business logic intertwined
- **Direct API integration** - components directly calling MapBox APIs
- **Token-heavy implementation** - rapid prototyping prioritized over structure

**Core Features Implemented:**
- ✅ **GPS Tracking** - Real GPS positioning with browser geolocation API
- ✅ **PIN Management** - Add, display, and manage speed camera locations
- ✅ **Proximity Alerts** - Distance-based warnings for nearby speed cameras
- ✅ **GPS Simulation** - File upload and route-based simulation for testing
- ✅ **Route Planning** - Basic MapBox Directions API integration
- ✅ **Dragable Panels** - Floating UI components for controls

**Technical Challenges Addressed:**
- MapBox style changes destroying custom layers (PINs disappearing)
- GPS simulation timing accuracy
- Battery-efficient proximity scanning
- Real-time coordinate display and map interaction

**Outcome:** Successfully demonstrated all core features working together. Proved the concept was viable but revealed architectural limitations for production scaling.

---

### Demo 2: Production Architecture

**Objective:** Complete rewrite with production-ready code structure and API foundation.

**Architecture Revolution:**
- **Modular class-based design** - Clear separation of concerns
- **Abstraction layers** - LocationProvider isolates GPS/simulation logic
- **Event-driven integration** - Components communicate via events, not direct calls
- **API-ready backend hooks** - Prepared for server integration
- **Token-efficient structure** - Optimized for maintenance and scaling

#### Core Architecture Components

```
LocationProvider (GPS Abstraction)
    ↓ (events)
ProximityScanner (PIN Analysis) → ReportingEngine (Analytics)
    ↓ (events)
MapCore (Rendering) ← PinManager (Data) ← RouteManager (Planning)
    ↓
Init.js (Orchestration)
```

#### New Production Features

**🔥 Advanced Navigation System:**
- **Turn-by-turn directions** with voice-ready instructions
- **Live route progress tracking** with automatic instruction updates
- **Intelligent re-routing** when deviating from planned route
- **Context-aware PIN alerts** during active navigation

**📊 Comprehensive Reporting:**
- **24-hour deduplication** - Same PIN reported once per day
- **Backend-ready analytics** - Batch reporting with retry logic
- **Route-based PIN scanning** - Analyze entire routes for speed cameras
- **User behavior tracking** - Foundation for usage analytics

**🎯 Smart PIN Management:**
- **Automatic layer restoration** - Solves MapBox style-change issues
- **Batch-optimized rendering** - Efficient handling of thousands of PINs
- **Click-to-add functionality** - Interactive PIN placement
- **Multiple PIN types** - Radar, police, accidents, roadwork

**🗺️ Advanced Route Planning:**
- **Address autocomplete** with MapBox Geocoding
- **Route options** - Avoid highways/tolls
- **GPS/map center shortcuts** - Quick route setup
- **GPX export functionality** - Save routes for external use
- **Modal PIN reporting** - Better UX for route analysis

#### Technical Improvements

**Clean Code Architecture:**
```javascript
// Demo 1: Mixed responsibilities
function handleGPS() {
    // GPS logic + UI updates + PIN checking + map updates
}

// Demo 2: Separation of concerns
LocationProvider.onPositionUpdate() → ProximityScanner.checkPins() → ReportingEngine.report()
```

**Error Handling & Resilience:**
- Graceful API failures with user feedback
- Retry logic for backend communication
- Progressive enhancement for offline scenarios

**Performance Optimizations:**
- Battery-efficient GPS scanning (100m movement threshold)
- Smart re-routing triggers (>100m off-route)
- Optimized MapBox layer management

**Developer Experience:**
- Modular file structure for easy maintenance
- Environment-aware configuration (dev/staging/prod)
- Comprehensive error logging and debugging tools

---

## Feature Comparison

| Feature | Demo 1 | Demo 2 |
|---------|--------|--------|
| **GPS Tracking** | ✅ Basic | ✅ Advanced with abstractions |
| **PIN Alerts** | ✅ Proximity only | ✅ Proximity + Route analysis |
| **Navigation** | ❌ | ✅ Turn-by-turn with re-routing |
| **Route Planning** | ✅ Basic | ✅ Advanced with geocoding |
| **GPS Simulation** | ✅ File-based | ✅ Route-generated + File-based |
| **Reporting** | ❌ | ✅ Analytics with deduplication |
| **UI/UX** | ✅ Functional | ✅ Modal dialogs + Better UX |
| **API Integration** | ❌ | ✅ Backend-ready hooks |
| **Code Structure** | ⚠️ Monolithic | ✅ Modular classes |
| **Error Handling** | ⚠️ Basic | ✅ Comprehensive |
| **Performance** | ⚠️ Adequate | ✅ Optimized |

---

## Mock-API Directory Structure
```
/api/
├── .htaccess              # URL routing and CORS
├── common.php             # Shared utilities and mock data
├── options.php            # CORS preflight handler
├── error.php              # 404 handler
├── pins/
│   ├── all.php           # GET /api/pins/all
│   ├── changes.php       # GET /api/pins/changes
│   └── details.php       # GET /api/pins/{id}/details
├── route/
│   └── scan.php          # POST /api/route/scan
├── reports/
│   ├── pin-alert.php     # POST /api/reports/pin-alert
│   └── route-created.php # POST /api/reports/route-created
└── logs/                 # Activity logs (auto-created)
    ├── activity.log
    ├── pin_alerts.json
    └── route_reports.json
```

---

## Mock-API Endpoints

### PIN Management
- `GET /api/pins/all` - Get all active pins
- `GET /api/pins/changes?since=2025-01-08T10:00:00Z` - Get changes since timestamp
- `GET /api/pins/{pinId}/details` - Get detailed pin information

### Route Analysis
- `POST /api/route/scan` - Scan route for pins within tolerance

### Reporting
- `POST /api/reports/pin-alert` - Report PIN alert/notification
- `POST /api/reports/route-created` - Report route creation

## Mock Data
- **~10 test pins** across Norway (Agder, Oslo, Bergen, Trondheim, Sweden border)
- **Realistic coordinates** for major cities and highways
- **PIN types**: radar, accident
- **Detailed information** for notifications

## Migration to Real Backend
This mock backend provides the exact interface your frontend expects. To migrate:
1. Replace mock data with database queries
2. Add authentication/authorization
3. Implement real distance calculations
4. Add rate limiting
5. Set up proper error monitoring

## Security Notes
- ⚠️ **No authentication** in mock mode
- ⚠️ **Open CORS** for development
- ⚠️ **No rate limiting**
- ⚠️ **All logs stored in files**

---

## Technology Stack

**Frontend:**
- **MapBox GL JS** - Maps, routing, geocoding
- **Vanilla JavaScript** - ES6+ classes and modules
- **CSS3** - Modern styling with glassmorphism effects
- **HTML5** - Semantic structure with accessibility

**Backend Integration Ready:**
- **RESTful API endpoints** - Defined for PIN management and analytics
- **Batch processing** - Efficient data synchronization
- **Rate limiting** - Production-ready request handling

**Development Tools:**
- **PHP configuration** - Environment-aware settings
- **Modular CSS** - Separate styling for different components
- **Error logging** - Comprehensive debugging capabilities

---

## Getting Started

### Prerequisites
- MapBox account and access token
- Modern web browser with GPS capabilities
- Local web server (for file uploads and API simulation)

### Installation

1. **Clone and configure:**
```bash
git clone [repository]
cd radar-navigation-system
```

2. **Set up configuration:**
```php
// config.php
define('MAPBOX_TOKEN', 'your_mapbox_token_here');
define('API_BASE_URL', '/api/');
define('DEFAULT_CENTER_LNG', 8.0059); // Kristiansand
define('DEFAULT_CENTER_LAT', 58.1467);
```

3. **Launch application:**
```bash
echo "Apache server required, rewrite rules in /api folder";
```

### Usage

1. **Start GPS tracking** - Click "Start Navigation" 
2. **Plan routes** - Use address search in route planner
3. **Test with simulation** - Upload GPX files or generate from routes
4. **Add speed cameras** - Click "Add PIN" and place on map
5. **Navigate actively** - Start navigation for turn-by-turn directions

---

## Key Achievements

**Demo 1 → Demo 2 Evolution:**

- **Code Quality:** From prototype to production standards
- **Maintainability:** Modular architecture enables easy feature additions
- **Scalability:** Event-driven design supports complex feature interactions
- **User Experience:** Professional UI with modal dialogs and smooth interactions
- **API Readiness:** Backend integration hooks prepared for server deployment
- **Performance:** Battery-efficient algorithms for mobile usage

**Technical Debt Elimination:**
- Removed monolithic functions with mixed responsibilities
- Eliminated direct MapBox API calls scattered throughout codebase
- Solved layer persistence issues with proper abstraction
- Implemented proper error handling and user feedback

**Production Readiness:**
- Environment configuration management
- Comprehensive error logging and monitoring hooks
- API rate limiting and batch processing capabilities
- Mobile-optimized responsive design

---

## Future Development

The Demo 2 architecture provides a solid foundation for:

- **Backend API integration** - All hooks are prepared
- **Mobile app development** - Core logic can be adapted
- **Advanced analytics** - Reporting system ready for expansion
- **Multi-user features** - Architecture supports user management
- **Offline capabilities** - Modular design enables progressive enhancement

---

## Technical Documentation

For detailed technical documentation, see:
- `location-provider.js` - GPS abstraction and simulation
- `route-manager.js` - Navigation and route planning
- `proximity-scanner.js` - PIN detection and analysis
- `reporting-engine.js` - Analytics and deduplication
- `init.js` - System orchestration and integration

**Architecture Diagram:**
```
User Input → Init.js → LocationProvider → ProximityScanner → ReportingEngine
                   ↓
              MapCore ← PinManager ← RouteManager
                   ↓
              MapBox GL JS → Visual Output
```

This project demonstrates the evolution from rapid prototyping to production-ready code, showcasing both the importance of proving concepts quickly and the value of architectural refactoring for long-term success.

## Version history

v1.2 demo2, 6 june 
- prod demo ready

v1.1 demo1
- feature test demo

v1.0 start
- proof of concept demo ready

