# Radar Navigation System - Teknisk Dokumentasjon

https://claude.ai/chat/60500188-542e-426c-8e08-bf9b2c586e86

Shared:
https://claude.ai/share/5969cbd2-704f-4728-a6df-9885f86eb122

Analyze thread:
https://claude.ai/chat/b3b86379-2bf4-407f-a7f4-1f949b78192c

## Systemoversikt

Radar Navigation System er en webbasert GPS-navigasjonsapplikasjon bygget for å varsle om radarkontroller. Systemet kombinerer ekte GPS-tracking, ruteplanlegging og GPS-simulering for testing og utvikling.

## Arkitektur

### Frontend Komponenter

```
├── index.php                 # Hovedfil med HTML-struktur
├── config.php               # API-tokens og konfigurasjon  
├── display.php              # Flytende panel for kartvisning
├── set_route.php            # Flytende panel for ruteplanlegging
├── styles.css               # CSS for styling og layout
├── navigation-core.js       # Hovedlogikk for navigasjon og GPS
├── gps-simulator.js         # GPS-simulering og testing
└── view-setroute.js         # Kartfunksjoner og ruteplanlegging
```

### Backend Avhengigheter

- **Mapbox GL JS** - Kartvisning og interaksjon
- **Mapbox APIs:**
  - Geocoding API - Adressesøk
  - Directions API - Ruteberegning  
  - Terrain/Satellite data

## Kjernefunksjonalitet

### 1. GPS og Navigasjon (navigation-core.js)

**NavigationCore-klassen** håndterer:
- Ekte GPS-tracking via browser `geolocation` API
- Radar-pin lagring og varslingssystem  
- Kartinitalisering og lag-håndtering
- Status-oppdateringer og brukergrensesnitt

**Viktige metoder:**
- `startNavigation()` - Starter GPS-tracking eller simulering
- `handleGpsUpdate()` - Prosesserer GPS-data og oppdaterer kart
- `checkRadarWarnings()` - Sjekker avstand til radarkontroller
- `addRadarPin()` - Legger til nye radar-pins på klikk

### 2. GPS Simulering (gps-simulator.js)

**GpsSimulator-klassen** støtter:
- Avspilling av GPS-logger (GPX, JSON, KML)
- Demo-rute generering (Kristiansand→Mandal)
- Rute-til-GPS-logg konvertering
- Realistisk timing basert på faktisk reisetid

**Simuleringsflyt:**
1. Last GPS-logg eller generer fra rute
2. Beregn realistisk avspillingsintervall
3. "Hijack" ekte GPS og injiser simulerte posisjoner
4. Send data til NavigationCore via `simulateGpsPosition()`

### 3. Kart og Ruter (view-setroute.js)

**ViewSetRoute-klassen** tilbyr:
- **Display Panel:** Karttype, koordinatvisning, 3D/satellitt-modus
- **Route Panel:** Adressesøk, ruteplanlegging, eksport-funksjoner
- Mapbox API-integrasjon for geocoding og directions
- Live koordinat-oppdatering og kart-kontroller

## Brukergrensesnitt

### Kontrollpanel (venstre side)
- **Navigation Control:** Start/stopp GPS, sentrering
- **GPS Testing:** Simulering og logg-upload  
- **Radar Pins:** Vis/skjul, legg til pins
- **Status:** Live info om GPS, navigasjon, radar-avstand

### Flytende Paneler
- **Display Panel** (øvre venstre): Karttype, koordinater, 3D-kontroller
- **Route Panel** (øvre høyre): Adressesøk, ruteplanlegging, eksport

### Overlays
- **Navigasjonsoverlay:** Hastighet og kompass-visning
- **Radar-varsling:** Automatisk popup ved kontroller (≤500m)

## Dataflyt

### GPS-modus (Normal drift)
```
Browser GPS → handleGpsUpdate() → Kartoppdatering → Radar-sjekk → Varsling
```

### Simulerings-modus (Testing)
```
GPS-logg → startSimulation() → simulateGpsPosition() → handleGpsUpdate() → ...
```

### Ruteplanlegging
```
Adressesøk → Mapbox Geocoding → Directions API → Kartvisning → GPS-logg generering
```

## Tekniske Detaljer

### GPS-hijacking
Systemet sikrer at kun én GPS-kilde er aktiv:
- Ved simulering: Stopper ekte GPS og bruker simulerte data
- Ved ekte GPS: Sjekker at simulering ikke kjører
- Sømløs overgang mellom modusene

### Radar-varslingssystem
- **Avstandsberegning:** Haversine-formel for nøyaktig GPS-avstand
- **Varsling:** Automatisk popup når <500m fra radar
- **Pin-håndtering:** Klikk-basert plassering med krysshår-cursor

### Ruteoptimalisering
- **Punkttetthet:** `overview=full` for detaljerte ruter (~1500+ punkter)
- **Realistisk timing:** Beregnet intervall basert på Mapbox-estimat
- **Hastigheitsestimering:** Veitype og manøvre-basert speedmapping

## Konfigurasjon

### config.php
```php
define('MAPBOX_TOKEN', 'pk.eyJ1...');     // Mapbox API-nøkkel
define('API_BASE_URL', '/api/');           // Backend API URL
define('DEFAULT_CENTER_LNG', 8.0059);     // Kristiansand lng
define('DEFAULT_CENTER_LAT', 58.1467);    // Kristiansand lat
define('DEFAULT_ZOOM', 12);               // Standard zoom-nivå
```

### JavaScript-konfigurasjon
PHP-variabler overføres til JavaScript via `window.APP_CONFIG` objektet.

## Fil-formater

### Støttede GPS-logger
- **GPX:** Standard GPS-format med `<trkpt>` elementer
- **JSON:** Egendefinert eller Google Takeout-format
- **KML:** Google Earth-format med koordinatlister

### Eksport-formater
- **GPX:** Rute konvertert til GPS-track
- **Del-link:** URL med kart-posisjon og zoom

## Utvidelsesmuligheter

### Backend-integrasjon
- Radar-pin database (MySQL/PostgreSQL)
- Brukerkontoer og favoritt-ruter
- Sanntids trafikk-data

### Avanserte funksjoner
- Offline-kart støtte
- Voice-guided navigation
- Crowd-sourced radar-rapportering
- Machine learning for hastighetsjustering

## Feilsøking

### Vanlige problemer
1. **"Cannot read properties of undefined (reading 'setData')"**
   - Løsning: Flytt `loadRadarPins()` til `setupMapLayers()`

2. **Usynlige radar-pins**
   - Løsning: Bytt fra `symbol` til `circle` i pin-layer

3. **For rask simulering**
   - Løsning: Implementer `calculatedInterval` basert på rutetid

### Debug-tips
- Bruk `console.log()` for å følge GPS-dataflyt
- Sjekk Mapbox token-gyldighet i Network-tab
- Verifiser at alle script-filer lastes korrekt

## Sikkerhet

### API-nøkkel håndtering
- Mapbox token lagres i `config.php` (ikke i kildekode)
- Token begrenses til spesifikke domener i Mapbox dashboard
- Bruk miljøvariabler i produksjon

### Personvern
- GPS-data lagres kun lokalt i browser
- Ingen tracking eller logging av brukerposisjoner
- Radar-pins kan anonymiseres

## Ytelse

### Optimalisering
- GPS-oppdateringer: 1-5 sekunder for balanse mellom nøyaktighet og batteri
- Kart-rendering: Bruk `easeTo()` i stedet for `jumpTo()` for smooth animasjoner
- Radar-sjekk: Kun når GPS-posisjon endres

### Skalering
- Radar-pins: Spatial indexing for store datasett
- Rute-caching: Lagre beregnede ruter lokalt
- Progressive loading: Last kart-data on-demand

---

*Sist oppdatert: Juni 2025*
*Versjon: 1.0*