# Architectuur in één pagina

```
browser
   │
   ▼
gateway (nginx, poort 8080)  ── /               → statische site (Astro, gebouwd in de image)
   │                          ── /klantsysteem/ → klantsysteem (Node, poort 3000)
   │                          ── /klantbeeld/   → klantbeeld   (Node, poort 3000)
   ▼
klantsysteem / klantbeeld ── bouwen bij elke start een eigen SQLite-database
                               uit data/schema.sql + data/seed/*.json (alleen-lezen)
```

## Keuzes en waarom

| Keuze | Waarom |
|---|---|
| **Eén gateway** | Eén poort lokaal, één domein en één certificaat op de server. De systemen zijn niet los bereikbaar. |
| **Statische site (Astro)** | Alleen HTML en CSS, geen JavaScript, geen cookies, geen tracking. Dezelfde strenge Content-Security-Policy als methodica.nl. |
| **Node zonder framework** | Twee kleine schermen hebben geen Express of React nodig. Alleen de standaardbibliotheek van Node 24, dus geen `npm install` voor de systemen. |
| **SQLite (ingebouwd in Node 24)** | Deelnemers kunnen echte SQL schrijven, zonder databaseserver. Eén bestand per proces. |
| **JSON als bron, database bij elke start opnieuw** | De JSON-bestanden zijn leesbaar en goed te beoordelen in git. Niemand kan de data blijvend kapotmaken: een herstart zet alles terug. |
| **Database alleen-lezen** | Geen enkel scherm mag data wijzigen. Het SQL-scherm draait vragen in een aparte thread met een tijdslimiet van 2 seconden en maximaal 500 rijen, zodat een eindeloze vraag de server niet blokkeert. |
| **Server-side HTML, tabbladen als links** | Werkt zonder JavaScript, en de "Modem controleren"-knop is een gewone link. |
| **Vaste klok** | Iedereen ziet dezelfde situatie: "is deze meting ouder dan 15 minuten?" heeft voor iedereen hetzelfde antwoord. |
| **Containers alleen-lezen, met geheugenlimiet** | Kleinere schade als er ooit iets misgaat; de database staat in een tijdelijke map (`tmpfs`). |

## Gedeelde code (`systems/shared/`)

| Bestand | Wat |
|---|---|
| `world.js` | Leest `config/world.json`: stad, klok, tijdrekenen. |
| `db.js` | Bouwt de database uit schema en seed-bestanden. |
| `queries.js` | De SQL-vragen die beide systemen gebruiken. |
| `decision-tree.js` | De beslisboom. Wordt bewust niet in de schermen getoond. |
| `web.js` | Kleine HTTP-laag, HTML-escaping, paginaframe. |
| `systems.css` | Opmaak van de systemen. |

## Sleutels

`customer_id` (K-....) en `address_id` (A-....) verbinden alle tabellen. Een adres kan meerdere klanten hebben gehad; de klanthistorie in het Klantbeeld hangt aan het adres.
