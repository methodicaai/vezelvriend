# Van stad wisselen

De oefenwereld speelt in het centrum van de stad waar je de training geeft, met **echte adressen uit de BAG** en **verzonnen klanten**. Wisselen van stad kost een paar minuten.

## Zo doe je het (op de server)

1. Pas `config/world.json` aan: `city` (bijvoorbeeld `Tilburg`) en `district` (bijvoorbeeld `Centrum`), en `clockLabel` als je dat wilt.
2. Haal de adressen van die wijk op (via de openbare PDOK Locatieserver, geen sleutel nodig):
   ```bash
   docker run --rm -v "$PWD":/w -w /w node:24-alpine node tools/world/fetch-bag.mjs --city Tilburg --district centrum
   ```
   Is de wijknaam niet eenduidig, dan toont het script de wijken van die stad. Kies de juiste naam en probeer opnieuw.
3. Maak de wereld (2000 klanten, segmenten, storing, scenario's):
   ```bash
   docker run --rm -v "$PWD":/w -w /w node:24-alpine node tools/world/generate.mjs --customers 2000
   ```
   Dezelfde wijk geeft altijd precies dezelfde wereld. `data/generated/world-facts.md` laat zien in welke straten de vijf scenario's liggen.
4. Haal de grenzen van de wijk en de buurten op, voor de kaarten op de website (Ons gebied, Storingen, Pakket samenstellen):
   ```bash
   docker run --rm -v "$PWD":/w -w /w node:24-alpine node tools/world/fetch-area.mjs
   ```
   Zonder deze stap zeggen de kaarten dat ze niet beschikbaar zijn; de rest werkt gewoon.
5. Bouw en start opnieuw: `docker compose up -d --build`.

## Wat er verandert

| Waar | Wat |
|---|---|
| Klanten | 2000 verzonnen klanten op echte adressen in de wijk, ook oud-klanten op adressen waar nu iemand anders woont |
| Scenario's | Vijf situaties, elk bij vijf klanten (K-1{v}0{s}: K-1001 t/m K-1005 en vier varianten per situatie, gemaakt met `tools/world/scenario-variants.mjs`), schuiven met hun valkuilen mee naar echte straten. Elke variant van situatie 2 t/m 5 krijgt een eigen straat. Klantnummers en verhalen blijven gelijk, dus oefeningen en trainersmateriaal kloppen |
| Storing | Ligt in de straat van scenario 1 (zie `world-facts.md`) |
| Website | Storingspagina, abonnementen en stadsnaam volgen de nieuwe wereld |
| App | De demoklanten krijgen de postcodes van hun nieuwe adres |

## Waarom niet in de repository

`data/generated/` staat in `.gitignore`. Echte adressen met verzonnen bewoners horen niet op een openbare, doorzoekbare plek: op die adressen wonen echte mensen. De kleine sjabloonwereld in `data/seed/` blijft in de repository, zodat je ook zonder internet kunt testen.
