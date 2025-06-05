
# Filoversikt

https://claude.ai/chat/60500188-542e-426c-8e08-bf9b2c586e86

## API-breakpoint

Breakpoint: respons avslutter med "Stemmer dette med dine backend-planer? Noen endringer eller tillegg?"

Edit 2, inneholder backend API.

## Filene

### location-provider.js

Her er **LocationProvider** - det fundamentale abstraksjons-laget for all GPS-håndtering:

**Arkitektoniske prinsipper:**
- **Single Point of Truth** - all posisjonering går gjennom denne klassen
- **Mode-agnostic** - samme API for ekte GPS og simulering
- **Event-driven** - andre klasser lytter på events i stedet for polling
- **Error resilient** - retry-logikk og graceful error handling

**Hovedfunksjoner:**
- `start(mode)` - starter ekte GPS eller simulering
- `getCurrentPosition()` - returnerer siste kjente posisjon
- `injectPosition()` - for ekstern simulering
- Event callbacks: `onPositionUpdate()`, `onStatusChange()`, `onError()`

**Smart beregninger:**
- Speed/heading beregnet fra posisjonhistorikk
- Fallback til GPS-data når tilgjengelig
- Position history for trend-analyse

**Battery-smart:**
- Ingen polling - kun event-basert
- Konfigurerbar simulation-hastighet
- Automatic cleanup ved stop

Dette blir "hjertet" i systemet - alle andre klasser vil referere til `window.locationProvider` i stedet for direkte GPS-API.

### distance-calculator.js og pin-manager.js

Her er **DistanceCalculator** og **PinManager**:

**DistanceCalculator** - ren matematikk-klasse med:
- **Haversine-formel** for nøyaktig avstandsberegning
- **Radius-søk** - finn alle pins innenfor X meter
- **Rute-analyse** - finn pins langs kjørerute med toleranse
- **Geometri-hjelpere** - bounding boxes, polygon-areal, osv.

**PinManager** - komplett PIN-håndtering med:
- **PIN-typer** - radar, ulykke, veiarbeid, politikontroll
- **Batch-oppdateringer** - effektiv MapBox-rendering
- **Klikkbare pins** - popup og custom click handlers
- **Delta-sync** - for backend-oppdateringer (added/updated/deleted)
- **Layer-gjenoppretting** - for kartstil-endringer

**Arkitektoniske fordeler:**
- PinManager kjenner kun til MapCore (ikke direkte MapBox API)
- DistanceCalculator er stateless og kan brukes av alle klasser
- Batch-updates optimerer performance
- Event-driven design for interaktivitet

### map-core.js

Her er **MapCore** - kjernen i kart-systemet:

**Hovedfunksjoner:**
- **Style-håndtering** - 6 forhåndsdefinerte stiler (dark, light, satellite, osv.)
- **Layer-preservering** - automatisk gjenoppretting av custom layers ved stilendring
- **Event-system** - clean API for kart-events med automatic cleanup
- **Navigation** - flyTo, easeTo, fitBounds med konfigurerbare opsjoner

**Arkitektoniske fordeler:**
- **Style-change protection** - løser problemet vi hadde med forsvinnende pins
- **Custom layer tracking** - alle tillagte layers/sources gjenopprettes automatisk
- **Event abstraction** - andre klasser slipper å jobbe direkte med MapBox events
- **Resource management** - proper cleanup ved destroy

**Style-system:**
```javascript
mapCore.changeStyle('satellite'); // Automatisk layer-restoration
mapCore.getAvailableStyles(); // Alle tilgjengelige stiler
```

**Layer-restoration løser PIN-problemet:**
- `backupCustomLayers()` før style-endring
- `restoreCustomLayers()` etter 'styledata' event
- PinManager kan kalle `restoreLayers()` etter style-change

### proximity-scanner.js

Her er **ProximityScanner** - hjernen i overvåkningssystemet:

**Hovedfunksjoner:**
- **Proximity scanning** - kontinuerlig overvåking av pins innenfor 2km radius
- **Battery-smart** - scanner kun ved 100m+ bevegelse (konfigurerbar threshold)
- **Route analysis** - hybrid lokal/backend scanning av planlagte ruter
- **Intelligent reporting** - deduplikering og context-aware pin-varsling

**Scanning-modes:**
- **Continuous proximity** - følger GPS-oppdateringer med threshold-basert scanning
- **Route-based** - engangsskanning av hele kjørerute for pins
- **Backend integration** - kan bruke backend for kompleks rute-geometri

**Batterisparing-strategier:**
- Movement threshold (100m) før ny scanning
- Konfigurerbar scan-intervall (1 sekund default)
- Effektiv distance-beregning med DistanceCalculator
- Debouncing og result-caching

**Intelligent varsling:**
- **Proximity alerts** - pins innenfor 1km ved kjøring
- **Route planning alerts** - alle pins langs planlagt rute
- **Deduplication** - samme pin rapporteres kun én gang per dag
- **Context-aware** - forskjellig logikk for proximity vs route

**Integration:**
```javascript
proximityScanner.startProximityScanning({ radius: 3000 });
proximityScanner.scanRoute(routeGeometry, { useBackend: true });
proximityScanner.onPinAlert((alert) => showWarning(alert));
```

### reporting-engine.js

Her er **ReportingEngine** - det komplette rapporterings- og dedupliseringssystemet:

**Hovedfunksjoner:**
- **24-timers deduplikering** - samme PIN rapporteres kun én gang per dag
- **Batch backend-rapportering** - effektiv API-kommunikasjon med retry-logikk
- **Hook-system** - ekstern integrasjon for analytics og custom logic
- **Persistent storage** - lokal lagring av rapporthistorikk og statistikk

**Deduplikering:**
- `isDuplicateToday(pinId)` - sjekker om PIN allerede er rapportert
- Automatisk dag-rotasjon ved midnatt
- Permanent rapporthistorikk for statistikk

**Backend-integrasjon:**
```javascript
// Automatisk batch-rapportering
reportingEngine.reportPin('pin123', 'proximity', { distance: 500 });
reportingEngine.reportRoute({ start: {...}, destination: {...} });

// Hook for custom analytics
reportingEngine.addHook('pinReported', (report) => {
    analytics.track('speed_camera_alert', report);
});
```

**Intelligent batching:**
- 10 rapporter per batch (konfigurerbart)
- Retry-logikk med eksponentiell backoff
- Separate endpoints for PIN-alerts vs rute-rapporter

**Statistikk og monitoring:**
- Total rapporter, duplikater blokkert, backend-status
- Session-tracking og performance-metrics
- Real-time status via events

### init.js

Her er **init.js** - den komplette systemintegrasjonen:

**Hovedfunksjoner:**
- **Orchestrert initialisering** - komponenter startes i riktig rekkefølge med dependency-håndtering
- **Event-integrasjon** - kobler sammen alle komponenter via events
- **UI-binding** - knapper og kontroller fungerer automatisk
- **Auto-loading** - henter pins fra backend eller bruker demo-data

**Initialiserings-sekvens:**
1. **Validering** - sjekker MapBox token og konfigurasjon
2. **Komponent-opprettelse** - i dependency-orden
3. **Data-loading** - pins fra backend med fallback til demo
4. **Event-kobling** - alle cross-component events
5. **UI-binding** - alle knapper og kontroller
6. **Background-services** - pin-oppdateringer hver 5. minutt

**Smart integrasjon:**
```javascript
// Automatisk GPS → Proximity → Reporting flow
locationProvider.onPositionUpdate() → proximityScanner.handleLocationUpdate() 
→ proximityScanner.onPinAlert() → reportingEngine.reportPin() → backend

// UI-kontroller virker automatisk
window.startNavigation() // Starter hele kjeden
```

**Global tilgang:**
- `window.radarNavigationSystem` - hovedsystem
- `window.startNavigation()` - hurtig-commands
- `window.getSystemStatus()` - debugging og monitoring

### index.php

Her er **index.php** - den komplette hovedsiden:

**Hovedstrukturer:**
- **Loading screen** med progress-indikator under oppstart
- **Control panel** med alle navigasjons- og simuleringskontroller
- **Map container** med overlays for navigasjon og varsler
- **Error handling** med graceful fallbacks

**PHP-integrasjon:**
- Henter konfigurasjon fra `config.php`
- URL-parametere for initial posisjon (`?lat=58.1&lng=8.0&zoom=15`)
- Feature flags for å enable/disable funksjoner
- Environment-spesifikke debugging

**UI-komponenter:**
- **Navigation controls** - start/stopp navigasjon
- **GPS simulation** - fil-upload og demo-data
- **PIN management** - vis/skjul og legg til
- **Quick actions** - hopp til kjente steder
- **Real-time status** - GPS, proximity, radar-distanse

**Smart features:**
- **Loading progress** - viser initialisering av komponenter
- **Error overlay** - hvis system feiler under oppstart
- **Toast notifications** - for user feedback
- **Collapsible sections** - for å spare plass

**Event-integration:**
- Lytter på `radar:systemReady` og `radar:systemError`
- Quick location buttons integrert med MapCore
- Development helpers i dev-mode

**Responsive design-ready:**
- Mobile-friendly struktur
- Touch-friendly buttons
- Collapsible control panel

### styles.css

Her er **styles.css** - komplett styling for hele systemet:

**Design-system:**
- **Mørkt tema** med gradient bakgrunner og glassmorfisme-effekter
- **Responsive design** fra desktop til mobile
- **Accessibility** med focus-states og reduced-motion support

**Hovedkomponenter:**
- **Loading screen** med spinner og progress-bar
- **Control panel** med moderne kort-design og hover-effekter
- **Navigation overlay** med neon-grønn hastighetsvisning og kompas
- **Warning system** med pulserende røde alerts
- **Toast notifications** med slide-in animasjoner

**Button-system:**
- 5 varianter: primary, secondary, success, warning, outline
- Hover-effekter med transform og box-shadow
- Touch-friendly sizing (44px minimum)
- Disabled states med opacity

**Responsive breakpoints:**
- **Desktop:** Side-ved-side layout
- **Tablet (768px):** Stacked layout med redusert kontrollpanel
- **Mobile (480px):** Kompakt design med mindre elementer

**Special effects:**
- **Pulse animasjoner** for status-indikatorer
- **Glassmorfisme** med backdrop-filter blur
- **Gradient overlays** for depth og moderne look
- **Bounce/scale animasjoner** for radar-varsler

**MapBox integration:**
- Mørke kontroller som matcher app-temaet
- Custom popup-styling
- Overlay-positioning som ikke kolliderer
