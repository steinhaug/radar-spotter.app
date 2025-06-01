**BRUKEROPPLEVELSE - RADARKONTROLL-APP:**

**OPPSTART OG NAVIGASJON:**
1. Bruker åpner app, setter destinasjon (Oslo fra Kristiansand)
2. GPS-tracking starter automatisk, rute beregnes
3. Alle radarkontroller langs ruten lastes inn som pins på kartet
4. Bruker starter kjøring, følger turn-by-turn instruksjoner

**UNDER KJØRING - VARSLING:**  
5. App overvåker kontinuerlig GPS-posisjon mot radarkontroller
6. **2km før Grimstad-kontrollen:**  
   - Lydsignal + popup: "⚠️ Radarkontroll om 2km - Høyre side - 80 km/t"
   - PIN på kart highlightes
   - Bruker ser distanse nedtelling: 1.8km → 1.5km → 1.0km...

**PASSERING AV KONTROLL:**
7. Når bruker passerer kontrollen:
   - "Har du sett denne kontrollen?" (Ja/Nei/Ikke der lenger)
   - Verifiseringsdata lagres
   - PIN markeres som "sett i dag" (ingen ny varsling)

**REGISTRERING AV NY KONTROLL:**
8. Bruker ser ukjent radarkontroll
9. Trykker "Registrer radarkontroll"-knapp
10. App fanger automatisk:
    - GPS-koordinater
    - Kjøreretning (bearing)
    - Estimert hastighet
11. Bruker velger: "Hvilken side?" (Venstre/Høyre/Begge)
12. Valgfritt: Hastighetsgrense, veinavnbekreftelse
13. PIN lagres og blir synlig for andre umiddelbart

**SOSIAL VERIFIKASJON:**
14. Andre brukere som passerer får: "Ny kontroll rapportert - bekrefter du?" 
15. Ved 3+ bekreftelser: PIN blir "verifisert" (grønn i stedet for gul)
16. Ved 3+ "ikke der lenger": PIN fjernes/arkiveres

**DAGLIG BRUK:**
- Samme kontroll varsler kun én gang per dag per bruker
- Historikk over varslinger og registreringer
- Statistikk: "Du har hjulpet andre 47 ganger denne måneden"

**Ser du noen gaps eller problemer i denne flyten?**