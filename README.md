# Vezelvriend: oefenomgeving van Methodica

> **Let op: Vezelvriend B.V. is een fictief bedrijf.** Het is geen echte internetaanbieder en heeft niets te maken met bestaande glasvezel- of telecombedrijven. Alle klanten, namen, telefoonnummers, MAC-adressen, IBAN's en adressen in deze repository zijn verzonnen. Het modemmerk "Vezelbox" is ook verzonnen.

Dit is de oefenomgeving bij de Nederlandstalige AI-training van [Methodica](https://methodica.nl/) voor businessanalisten en testers.

**De kernboodschap: AI is zo goed als de context die je meegeeft.**

Je werkt een ochtend bij het verzonnen glasvezelbedrijf Vezelvriend in Breda Centrum. In de oefenwereld is het altijd zaterdag 17-10-2026 10:15. Je leert:

- **context meegeven**: wat moet de AI weten om een goed antwoord te geven?
- **guardrails stellen**: wat mag de AI wel en niet adviseren?
- **valkuilen in data herkennen**: wat klopt er niet, en wat hoort niet in een prompt?

## Zo begin je (deelnemers)

1. **Installeer Docker Desktop** via [docker.com](https://www.docker.com/products/docker-desktop/) en start het. (Doe je de training met de online omgeving? Ga dan naar [vezelvriend.nl/training](https://vezelvriend.nl/training/) en sla stap 1 t/m 4 over.)
2. **Download deze repository**: knop *Code* → *Download ZIP* op GitHub, en pak het bestand uit. Of: `git clone https://github.com/methodicaai/vezelvriend.git`
3. **Start de omgeving**: open een terminal in de map en typ `docker compose up --build`. De eerste keer duurt dat een paar minuten.
4. **Open** [http://localhost:8080](http://localhost:8080). Je ziet de website van het (fictieve) bedrijf. De training met uitleg, systemen en oefeningen staat op [http://localhost:8080/training/](http://localhost:8080/training/).
5. **Kies een oefening** bij *Oefeningen* en werk met je eigen AI-assistent. Stoppen doe je met `Ctrl+C` in de terminal.

Zonder Docker kan het ook, met [Node.js 24](https://nodejs.org/): bouw eenmalig de site (`npm ci --prefix site && npm run --prefix site build`) en start alles met `npm start` op http://localhost:8080. De AI draait dan in testmodus (nepantwoorden); het trainerscherm heeft wachtwoord `test`.

## Wat zit er in deze repository

| Map | Wat | Waarom zo |
|---|---|---|
| `site/` | De nep-bedrijfswebsite van Vezelvriend (`/`) en de trainingspagina's met de oefeningen (`/training/`) (Astro, statisch) | Statische HTML: snel, veilig, geen tracking, geen formulieren. Het bedrijf heeft een eigen huisstijl, de training die van methodica.nl, zodat je altijd ziet waar je bent. |
| `systems/` | De nepsystemen: **Klantsysteem** en **Klantbeeld** | Kleine Node-apps zonder framework of extra pakketten: weinig om te onderhouden of uit te leggen. |
| `data/` | De verzonnen brondata (JSON) en het databaseschema | JSON is leesbaar en goed te beoordelen; bij elke start wordt er een SQLite-database van gebouwd. |
| `exercises/` | De oefeningen voor deelnemers | Markdown: leesbaar op GitHub én op de site, één bron. |
| `docs/` | Architectuur, beslisboom, stad wijzigen, server, roadmap | |
| `config/world.json` | Instellingen van de oefenwereld: stad, klok, grenzen van de beslisboom | Eén plek om de wereld te veranderen. |
| `gateway/` | nginx: serveert de site en stuurt door naar de systemen | Eén ingang: één poort lokaal, één domein op de server. |
| `trainer-private.example/` | Lege structuur van het trainersmateriaal | Laat zien wat er in de privé-map hoort, zonder antwoorden. |

Meer uitleg: [docs/architecture.md](docs/architecture.md).

## Prompts invullen, kopiëren en naar de AI sturen

De voorbeeldprompts in de oefeningen zijn invulblokken: vaste tekst plus duidelijk gelabelde vakken voor wat je zelf invult, met een knop om de prompt te kopiëren. Bij stap 4 is er ook prompt C, waarin alle context voor je eigen klant automatisch uit het Klantbeeld wordt opgehaald.

Als de trainer de AI-koppeling aanzet (zie [docs/server.md](docs/server.md)), kunnen deelnemers met een persoonlijke code inloggen en een prompt direct naar Claude sturen. Gesprekken worden bewaard, zodat de trainer ze kan bespreken; het trainerscherm staat op `/trainer/`.

## Waarom de systemen niet met een AI praten

Het Klantbeeld heeft een knop **Modem controleren**. Die toont de modemgegevens alleen aan de medewerker; geen AI roept hem aan. Dat is bewust: de deelnemer kiest zelf wat in de prompt komt, en ziet zelf of een meting oud is of een straat een storing heeft. Dat is precies de vaardigheid die je oefent.

## Publiek en privé

Deze repository is **publiek** en bevat alleen wat deelnemers mogen zien. De antwoorden, het valkuilenregister, de trainerversies van de oefeningen en de verwachte uitkomsten van de modem-scenario's staan in een **aparte privé-repository** (`methodicaai/vezelvriend-trainer`). Lokaal zet de trainer die als map `trainer-private/` in deze map; die map staat in `.gitignore` en wordt nooit gecommit.

### De test van de beslisboom

Er is een automatische test die controleert dat de beslisboom (`systems/shared/decision-tree.js`) voor alle vijf modem-scenario's de verwachte uitkomst geeft. **Die test staat bewust in de privé-map**, omdat hij de verwachte uitkomsten bevat, en dat zijn de antwoorden op de oefeningen. De trainer draait hem zo:

```bash
node --test "trainer-private/tests/*.test.js"
```

## Licenties

| Wat | Licentie | Bestand |
|---|---|---|
| Broncode (`systems/`, `gateway/`, `site/` behalve de teksten, configuratie) | MIT | [LICENSE](LICENSE) |
| Oefeningen, teksten op de site, documentatie en de verzonnen data | CC BY-NC 4.0 | [LICENSE-CONTENT](LICENSE-CONTENT) |
| Lettertypen Instrument Serif en DM Sans (`site/public/assets/fonts/`) | SIL Open Font License | |

Kort gezegd: de code mag je vrij hergebruiken. De oefeningen en teksten mag je delen en aanpassen met naamsvermelding, maar niet commercieel gebruiken, bijvoorbeeld niet voor een betaalde training. Dit is een samenvatting en **geen juridisch advies**; de licentieteksten zijn bindend.

## Voor beheerders

- [docs/architecture.md](docs/architecture.md): hoe het in elkaar zit, op één pagina.
- [docs/change-city.md](docs/change-city.md): de stad van de oefenwereld wijzigen.
- [docs/server.md](docs/server.md): draaien op de server achter Nginx Proxy Manager.
- [docs/roadmap.md](docs/roadmap.md): wat er nog komt.
