---
number: 5
title: Wat mag er naar de AI?
role: Iedereen
summary: Vijftig logregels van de servicedesk. Wat geef je aan de AI, wat vervang je, en wat meld je aan het bronteam?
---

# Oefening 5: Wat mag er naar de AI?

## Doel

Je leert data bekijken voordat je hem aan een AI geeft. Ook data die "gewoon logregels" lijken, kunnen gegevens bevatten die daar niet horen.

## Opdracht

Het team wil met AI een overzicht maken van waar klanten gisteren over belden. Daarvoor zijn er 50 notities van de servicedesk (vrijdag 16-10-2026).

1. Haal de notities op. Dat kan op twee manieren:
   - in het **Klantsysteem**, scherm **SQL**: `SELECT * FROM support_log ORDER BY logged_at;`
   - of in de repository: `data/seed/support_log.json`.
2. Bekijk de regels **voordat** je ze aan een AI geeft. Wat valt je op?
3. Bepaal per soort gegeven:
   - wat er gewoon naar de AI mag;
   - wat je vervangt door een label, bijvoorbeeld `[IBAN]`;
   - wat je meldt aan het team dat de bron beheert.
4. Bedenk hoe je het vervangen betrouwbaar doet: met de hand, met een zoekopdracht of met een SQL-vraag. Probeer het uit.
5. Geef pas daarna de opgeschoonde regels aan de AI en vraag om het overzicht.

## Voorbeeldprompt zonder context

```prompt
Hier zijn onze servicedesknotities van gisteren. Maak een overzicht van de onderwerpen.
{{plak alle 50 regels}}
```

## Voorbeeldprompt met context

```prompt
Hieronder staan 50 notities van onze servicedesk. Persoonsgegevens en bankgegevens zijn vervangen door labels zoals [IBAN] en [KLANT].
Maak een overzicht: welke onderwerpen komen voor, hoe vaak, en welke vragen zouden we kunnen voorkomen met betere informatie op de website?
Neem geen labels of klantnummers over in je antwoord.

{{plak de opgeschoonde regels}}
```

## Reflectievragen

- Hoeveel regels bevatten iets dat niet naar de AI mocht? Vond je ze allemaal? Hoe weet je dat zeker?
- Werkte een eenvoudige zoekopdracht voor alle gevallen?
- Welke afspraak zou je met het bronteam willen maken, zodat dit niet meer gebeurt?
- Mag een klantnummer wel naar de AI? Waarom wel of niet?
