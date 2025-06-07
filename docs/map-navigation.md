# Navigasjonssystem Spesifikasjon

## Layout-grunnlag

### Seksjoner
- **A)** Kart - 100% skjermareal (base layer)
- **B)** Søkefelt/navigasjonsinfo (top-anchored rad 1)
- **C)** Karttype-knapp (top-anchored rad 2, høyrestillt)
- **D)** Skuff (bottom-anchored rad 2)
  - **D1:** Kollapsert (0px høyde)
  - **D2:** Utvidet (tar skjermareal, reduserer A)
- **E)** Knapperad (bottom-anchored rad 1, høyrestillt over D)
- **F)** Fullskjerm overlay (dekker A-E når aktiv)

### Animasjon
- Overgang D1↔D2: 2-3 animasjonsframes
- Alle seksjoner B-E er svevende over A (unntatt D2 som reduserer A)

## Moduser og tilstander

### MODUS-IDLE (grunninnstilling)
**Trigger:** Appstart eller reset

**Layout:**
- **B:** Tom søkeboks
- **C:** Karttype-knapp synlig
- **D:** D1 (kollapsert, 0px høyde)
- **E:** [Navigering] [Center map] knapper
- **F:** Ikke aktiv

### MODUS-ADDRESS-SEARCH (midlertidig prosess)
**Trigger:** Klikk på B (søkefelt) - uansett om tomt eller har verdi

**Layout:**
- **F:** Aktiv med søkegrensesnitt
  - [Tilbake] knapp
  - Adressefelt med autocomplete
  - Forslag basert på input
  - Hvis B hadde verdi: pre-fyll i søkefeltet

**Avslutning:**
- **Adresse valgt:** Oppdater B med valgt adresse, lukk F, gå til MODUS-VIEW
- **Tøm/slett:** Tøm B, lukk F, gå til MODUS-IDLE
- **[Tilbake]:** Lukk F, behold B som den var, gå til forrige modus

### MODUS-VIEW
**Trigger:** B har gyldig destinasjonsadresse

**Layout:**
- **B:** Viser destinasjonsadresse (klikk → MODUS-ADDRESS-SEARCH)
- **D:** D2 utvidet med innhold:
  ```
  DRAWER1: [Destinasjonsadresse] [X-lukk]
  DRAWER2: Postnummer
  DRAWER3: [Rutetype-ikon] [Estimert reisetid minutter]
  DRAWER4: [Beregn rute] [Start turn-by-turn]
  DRAWER5: Metadata om stedet
  ```

**Knappefunksjonalitet:**
- **[X-lukk]:** Tøm B, D→D1, gå til MODUS-IDLE
- **[Beregn rute]:** GPS→START, adresse→DESTINASJON, gå til MODUS-ROUTE
- **[Start turn-by-turn]:** GPS→START, adresse→DESTINASJON, gå til MODUS-TURNBASED

### MODUS-ROUTE
**Trigger:** [Beregn rute] fra MODUS-VIEW

**Layout:**
- **B:** Dobbelt adressefelt: [START] [⇄ reverse] [DESTINASJON]
  - Klikk på adressefelt → MODUS-ADDRESS-SEARCH for det feltet
  - Endringer oppdaterer rute på kart automatisk
- **D:** D2 utvidet med innhold:
  ```
  Linje1: Kjør | [X]
  Linje2: [Bil][Kollektiv][Gå][Sykkel] navigering
  Linje3: ESTIMERT TID MINUTT
  Linje4: Rute kort beskrivelse (1 linje)
  Linje5: [START TURNBASED]
  ```

**Knappefunksjonalitet:**
- **[X]:** Gå tilbake til MODUS-VIEW
- **Rutetype-knapper:** Omberegn rute med valgt transportmiddel
- **[START TURNBASED]:** Gå til MODUS-TURNBASED

### MODUS-TURNBASED
**Trigger:** [Start turn-by-turn] fra MODUS-VIEW eller [START TURNBASED] fra MODUS-ROUTE

**Layout:**
- **B:** Turn-by-turn instruksjoner
- **D:** D2 utvidet, sort drawer:
  ```
  DRAWER1: [Rapport-data langs rute - tom som default]
           Liste med PIN-lokasjoner og titler (klikk = zoom til PIN)
  DRAWER2: [X] - estimert minutt igjen [2D map]
  ```
- **E:** 
  - **Høyre:** [Nål][Add]
  - **Venstre (ny rad):** [Km/t boks]

**Knappefunksjonalitet:**
- **[X]:** Gå tilbake til MODUS-ROUTE
- **[Nål]:** Still kart mot nord
- **[Add]:** Legg til ny kontroll
- **[2D map]:** Bytt til 2D-visning, erstatt knapp med [3D map] på venstre side over drawer
- **PIN-liste items:** Klikk zoomer inn på valgt PIN på kartet

## Navigasjonslogikk

### Standard oppførsel
- **Navigering:** Alltid fra nåværende GPS-posisjon til valgt destinasjon
- **Ruteberegning:** Automatisk ved modusendringer og adresseendringer
- **Karttilpasning:** Automatisk resize ved D1↔D2 overganger

### Adressehåndtering
- **Adressesøk:** Samme prosess uansett hvilken adresse som editeres
- **Autocomplete:** Via MapBox Geocoding API
- **Validering:** Kun gyldige adresser tillatt

### Rapport-funksjonalitet
- **Aktivering:** Automatisk ved start av MODUS-TURNBASED
- **Innhold:** PIN-lokasjoner langs planlagt rute med titler
- **Interaksjon:** Klikk på PIN-item zoomer kartet til den posisjonen
- **Oppdatering:** Genereres ved rutestart, ikke dynamisk under kjøring

## Tekniske notater

### MapBox integrering
- **Innebygde kontroller:** NavigationControl (zoom), GeolocateControl (center map)
- **APIs:** Directions API (ruteberegning), Geocoding API (adressesøk)
- **Custom komponenter:** B (søkefelt), D (skuff), F (overlay), tilstandshåndtering

### Tilstandsoverganger
```
IDLE → ADDRESS-SEARCH (klikk B)
ADDRESS-SEARCH → VIEW (adresse valgt)
ADDRESS-SEARCH → IDLE (adresse slettet)
VIEW → ROUTE (beregn rute)
VIEW → TURNBASED (start turn-by-turn)
ROUTE → VIEW (X knapp)
ROUTE → TURNBASED (start turnbased)
TURNBASED → ROUTE (X knapp)
```