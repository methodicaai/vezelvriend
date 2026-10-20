---
number: 6
title: SQL schrijven met AI
role: Businessanalist en tester
summary: Laat de AI SQL schrijven voor vragen over de klantdata. Met en zonder het schema als context. Klopt de uitkomst?
---

# Oefening 6: SQL schrijven met AI

## Doel

Je ervaart dat een AI pas bruikbare SQL schrijft als hij de tabellen en kolommen kent, en dat je de uitkomst zelf moet controleren.

## Opdracht

Open in het **Klantsysteem** het scherm **SQL**. Daar zie je ook het schema: alle tabellen en kolommen.

Beantwoord deze vragen met een SQL-vraag die je door de AI laat schrijven:

1. Welke actieve klanten wonen op hetzelfde adres?
2. Welke klanten hebben een modem met een firmwareversie die niet de nieuwste is (4.2.1)?
3. Wat is per klant de tijd van de laatste modemmeting, en hoeveel minuten was dat voor 10:15 op 17-10-2026?
4. Wat staat er per klant open volgens het Klantsysteem? Vergelijk dat met de export van de boekhouding: download [open-items.csv](/training/oefeningen/open-items.csv). Een apart systeem, dus een apart bestand.

Werkwijze per vraag:

1. Vraag de AI om SQL zonder het schema mee te geven (prompt A). Voer het uit. Wat gebeurt er?
2. Vraag het opnieuw met het schema als context (prompt B). Voer het uit.
3. Controleer de uitkomst: klopt het met wat je in het Klantsysteem en Klantbeeld ziet?

## Voorbeeldprompt zonder context (A)

```prompt
Schrijf een SQL-query die laat zien welke klanten op hetzelfde adres wonen.
```

## Voorbeeldprompt met context (B)

```prompt
Schrijf een SQL-query voor SQLite. Gebruik alleen de tabellen en kolommen uit dit schema:

{{plak het schema uit het SQL-scherm}}

Vraag: welke actieve klanten wonen op hetzelfde adres? Toon klantnummer, naam en adres.
Leg in één zin per regel uit wat de query doet.
```

## Reflectievragen

- Wat ging er mis zonder het schema? Verzon de AI tabel- of kolomnamen?
- Gaf een query die zonder foutmelding draaide ook het juiste antwoord? Hoe controleerde je dat?
- Wat zegt de uitkomst van vraag 1 over de data in het Klantsysteem? Wie moet daar iets mee?
- Bij vraag 4: welk getal klopt? Hoe kom je daarachter, en kan de AI je daarbij helpen?
