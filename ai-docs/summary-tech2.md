**TEKNISK OPPSUMMERING - NAVIGASJON TIL RADARKONTROLL-SYSTEM:**

**1. KOORDINAT-KORREKSJON:**
- Fikset Mapbox format: [longitude, latitude] i directions-felter

**2. RADARKONTROLL-DATASTRUKTUR:**
```javascript
const radarControl = {
    id: 'unique_id',
    coords: [lng, lat], // Mapbox-format
    bearing: 45.5, // True bearing (0-360°)
    speedLimit: 80,
    side: 'left|right|both',
    roadName: 'E18',
    verifiedCount: 3,
    lastVerified: timestamp
}
```

**3. DISTANSE-BEREGNING:**
- **Primær:** Vei-distanse via Mapbox Matrix API
- **Fallback:** Luftlinje via Turf.js
- **Trigger:** 2km terskel for varsling

**4. RETNINGS-LOGIKK:**
- Bruk Mapbox rutedata for å identifisere om PIN er "foran" i kjøreretning
- True bearing (geografisk nord = 0°) via Turf.js
- Bearing beregnes fra GPS-punkter ved registrering

**5. VARSLING-SYSTEM:**
- En varsling per PIN per dag per bruker
- Trigger når: innenfor 2km + i kjøreretning + ikke varslet i dag
- Verifikasjons-mulighet for andre brukere

**6. PIN-LASTING STRATEGI:**
- Initial load: alle pins i området (med clustering)
- Cache-strategi for ytelse
- Dynamisk lasting ved zoom/pan

**7. FRONTEND-ARKITEKTUR:**
- Simulerte AJAX-kall (mock data først)
- Kontinuerlig GPS-tracking med distanse-sjekk
- Varslings-system med bruker-feedback
