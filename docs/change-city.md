# De stad wijzigen

De oefenwereld speelt in **Breda Centrum**. De stad is één instelling, zodat je de omgeving makkelijk naar een andere stad verplaatst.

## Zo doe je het

1. Open `config/world.json`.
2. Pas `city` en `district` aan, bijvoorbeeld:
   ```json
   "city": "Tilburg",
   "district": "Centrum",
   ```
3. Start de omgeving opnieuw: `docker compose up --build`.

## Wat er dan verandert

| Waar | Hoe |
|---|---|
| Site | De bedrijfspagina en de voettekst lezen de stad uit `config/world.json` bij het bouwen. |
| Klantsysteem en Klantbeeld | De kopbalk toont de stad; alle adressen krijgen bij het bouwen van de database de stad uit de instelling (kolom `addresses.city`). |
| Data | De seed-bestanden bevatten bewust **geen** stad, dus daar hoef je niets te wijzigen. |

## Wat niet vanzelf verandert

- **Straatnamen en postcodes** zijn voorlopig bedachte namen met nep-postcodes (`0000 ..`). Komen er echte adressen (BAG via PDOK, zie de roadmap), dan horen die bij één stad en moet je ze opnieuw ophalen voor de nieuwe stad.
- **Teksten** in de oefeningen noemen de stad niet bij naam. Doe je dat later wel, zoek dan naar "Breda" in `exercises/` en `site/src/`.
- **Netwerksegmenten** (`S-KABEL` enzovoort) zijn verzonnen codes en hangen niet aan een stad.
