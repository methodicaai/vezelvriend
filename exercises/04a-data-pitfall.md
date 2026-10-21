---
stap: "4a"
title: Wat mag er naar de AI?
role: Iedereen
summary: Vijftig logregels van de servicedesk. Wat geef je aan de AI, wat vervang je, en wat meld je aan het bronteam?
---

# Stap 4a: Wat mag er naar de AI?

## Doel

Je leert data bekijken voordat je hem aan een AI geeft. Ook data die "gewoon logregels" lijken, kunnen gegevens bevatten die daar niet horen.

**Tijd:** ± 30 minuten. Dit hoort bij [trede 1 van de contexttrap](/training/oefeningen/contexttrap/#trede-1): heb ik de juiste gegevens, en niet te veel? Wat er volgens Vezelvriend wel en niet naar een AI mag, staat in het [AI-beleid](/training/oefeningen/documenten/ai-beleid.txt).

## Opdracht

Het team wil met AI een overzicht maken van waar klanten gisteren over belden. Daarvoor zijn er 50 notities van de servicedesk (vrijdag 16-10-2026).

1. [Download de 50 notities](/training/oefeningen/servicedesk-notities.txt) en open ze. Kun je SQL? Dan kan het ook in het **Klantsysteem**, scherm **SQL**: `SELECT * FROM support_log ORDER BY logged_at;`
2. Bekijk de regels **voordat** je ze aan een AI geeft. Wat valt je op?
3. Bepaal per soort gegeven:
   - wat er gewoon naar de AI mag;
   - wat je vervangt door een label, bijvoorbeeld `[IBAN]`;
   - wat je meldt aan het team dat de bron beheert.
4. Bedenk hoe je het vervangen betrouwbaar doet: met de hand, of met zoeken en vervangen in een teksteditor. Probeer het uit, en kijk daarna nog één keer of je niets hebt gemist.
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

## Op je eigen werk

Welke gegevens uit je eigen werk (mail, tickets, een export) zou je aan een AI willen geven? Wat moet je eruit halen voordat het mag? Zoek op wat het AI-beleid van je eigen werkgever erover zegt.

<details class="reflectie">
<summary>Klaar? Open de reflectievragen</summary>

- Hoeveel regels bevatten iets dat niet naar de AI mocht? Vond je ze allemaal? Hoe weet je dat zeker?
- Werkte een eenvoudige zoekopdracht voor alle gevallen?
- Welke afspraak zou je met het bronteam willen maken, zodat dit niet meer gebeurt?
- Mag een klantnummer wel naar de AI? Waarom wel of niet?
- De notities bevatten ook de voornamen van medewerkers. Zijn dat persoonsgegevens? Mogen die naar de AI?
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met andere gegevens of een andere AI?

</details>
