KORTVERSJON AV BRUKEROPPLEVELSEN
Jeg er en bruker av vår app og skal ut på kjøretur fra Kristiansand til Oslo. Det er registrert en radarkontroll i Grimstad, slik at jeg vil motta en varsling på veien. Jeg vil også registrere en ny radarkontroll når vi kommer til Oslo, bekrefte en radarkontroll og rapportere en feilkontroll.

OPPSETT AV BRUKEROPPLEVELSEN
Når vi snakker om radarkontroller er dette på mange måter det samme som en PIN.

Vi trenger å sette opp en PIN i grimstad: 58.34716, 8.58086

Kjøretur start: 58.12816, 8.10114
Kjøretur slutt: 59.92081, 10.77059

BRUKEROPPLEVELSEN
Når bruker nå kjører mot oslo er det spørsmål om hvordan skal vi varsle om denne PIN ? Vi har tenkt det er 2 algoritmer som skal sjekke for PINs for å kunne varsle bruker. I tilfellet her hvor det er aktivert en navigasjonsrute, må det være mulig å sjekke den planlagte kjøreruten for PINs. Om

Om brukere kjører rundt uten destinasjon, så må jeg allikevel bli varslet om en kontroll. Eks i Kristiansand sentrum er det ofte kontroll plassert med samsen, som er på den ene utkjørslen fra sentrum i retning stavanger. Så helt klart om jeg befinner meg i sentrum så er jeg interessert i informasjon at den ene utkjørselen fra byen er det politikontroll på. Jeg foreslår derfor at det må være en form for radius scanning for PINs bassert på lokasjon. Det finnes sikkert noen matematiske regnemetioder for å kunne hente frem alle PINs innenfor eks. 3KM av lokasjonspunkt.

VIKTIG! En PIN skal kunne varsles en bruker EN GANG pr dag. Her er det viktig å ha en telling pr PIN fordi det er foreløpig 2 forskjellige algporitmer som kan definere PINs som skal varslse - som nevnt over.

Vi tenker oss at bruker fortsetter kjøreturen og nærmer seg Grimstad. Vår varslings-algoritme detekterer nå at her er det en PIN som er i kjøreretningen 3km fremme og det blir trigget varsel for PIN. PIN har en ID som brukes mot end-point for å hente ut varsel info, som deretter popper opp en ballong/notifikasjon i appen. Bruker ser nå at det er en kontroll lengre fremme og åpner den opp for å få informasjon om kontrollen. Fra denne infosiden kan også bruker gi tilbakemelding for om PIN er reell, eller om PIN er fake. Fordelen med dette er at dette er en veldig god måte å bygge tillitt til selve PIN og ikke minst brukeren som registrerte PIN. Over tid er dette den sikreste måten vi har i systemet for å kunne differensiere brukere fra hverandre, tenker da spesiellt på tillitt igjen.

Radarkontrollen er unngått og vår bruker er fornøyd i det han kjører forbi Grimstad. Det skjer nå ikke spesiellt mye før han ankommer drammen for her blir vår bruker oppmerksom på at det er en radarkontroll i motgående kjørebane 100m fremfor seg. Bruker tar frem appen og klikker på "registrer ny kontroll" og fordi vi allerede er i navigaskjonsmudus og mottar GPS lokasjonsdata så kan vi kalkulere bearing, hastighet og nødvendige GPS koordinater for å plassere PIN punktet. I løpet av noen sekunder er det nye kontrollen registrert og lagt inn i systemet klar for å varsle andre brukere.

VIKTIG! Alle brukere med appen aktiv vil nå raskt bli oppdatert med den nye PIN, og evt. tilhørende varsling.

Vår bruker er nå nesten fremme, men får nå opp et varsel at det er storkontroll 3km fremme i veien, like før sin destinasjon. Så kjøringen blir roet veldig ned mot slutten.... derimot viser det seg at her var det ingen kontroll å se i det hele tatt. Varselet har en helt konkret posisjon for hvor kontrollen skulle vært - så idet brukeren passerer punktet er det ingen tvil om at denne er kontrollen er avsluttet. Vår bruker klikker derfor like godt på "rapporter feil PIN" slik at systemet våres nå kan evaluere om PIN skal taes bort fra kartet. Her tenker jeg at tillits regler og litt forretningslogikk må til for dem forskjellige scenariene som vil skje her.

Destinasjon er nådd og turen er over, appen lukkes.

