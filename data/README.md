# Data

Alle data in deze map is **verzonnen** voor de training. Vezelvriend B.V. bestaat niet. Namen, telefoonnummers (06-0000...), e-mailadressen (@example.com), MAC-adressen (02:56:46:...) en IBAN's zijn verzonnen of bekende voorbeeldnummers. De adressen in deze map zijn bedachte straatnamen met nep-postcodes (0000 ..): een kleine **sjabloonwereld**.

**Echte adressen (BAG).** Op de server wordt met `tools/world/` een grotere wereld gemaakt: echte BAG-adressen uit het centrum van de trainingsstad, met 2000 verzonnen klanten. Die gegenereerde wereld staat in `data/generated/` en komt bewust **niet** in deze openbare repository: op die echte adressen wonen in werkelijkheid andere mensen. Zie `docs/change-city.md`.

| Map of bestand | Wat | Gebruikt door |
|---|---|---|
| `schema.sql` | Tabellen en kolommen van de database | Klantsysteem, Klantbeeld |
| `seed/*.json` | De inhoud van de database, één bestand per tabel | Klantsysteem, Klantbeeld |
| `documents/call-guide.json` | Gespreksleidraad | Klantbeeld |
| `documents/service-document.md` | Servicevoorwaarden | Oefening 3 |
| `documents/customer-story-de-wit.md` | Klantverhaal | Oefening 3 |
| `backlog/` | User stories in ontwikkeling | Oefening 3 |
| `mail/` | Mails binnen het bedrijf | Oefening 3 |
| `accounting/open-items.csv` | Export uit de boekhouding (apart systeem) | Oefening 6 |

**Gedeelde sleutels:** `customer_id` (K-....) en `address_id` (A-....) verbinden alle tabellen en bestanden.

**Waarom JSON en SQLite allebei:** de JSON-bestanden zijn makkelijk te lezen en te beoordelen; bij elke start van de systemen wordt er een SQLite-database van gebouwd, zodat je er ook SQL op kunt loslaten. Wijzig je data, dan wijzig je de JSON-bestanden.

**Klok:** alle tijden zijn lokale tijd in de oefenwereld, waar het altijd zaterdag 17-10-2026 10:15 is.
