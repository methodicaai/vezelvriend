---
stap: "5"
title: Wat mag er naar de AI?
role: Iedereen
summary: "Vijftig notities van de servicedesk. Wat geef je aan de AI, wat vervang je, en wat meld je aan het bronteam? Daarna twaalf situaties: groen, oranje of rood?"
---

# Stap 5: Wat mag er naar de AI?

## Doel

Je leert data bekijken voordat je hem aan een AI geeft. Ook data die "gewoon notities" lijken, kunnen gegevens bevatten die daar niet horen. Daarna toets je bij twaalf situaties wat jij denkt dat mag.

Wat er volgens Vezelvriend wel en niet naar een AI mag, staat in het [AI-beleid](/training/oefeningen/documenten/ai-beleid/).

## Deel 1: de 50 notities

Het team wil met AI een overzicht maken van waar klanten gisteren over belden. Daarvoor zijn er 50 notities van de servicedesk (vrijdag 16-10-2026). Je werkt met de chat naast deze oefening.

1. [Bekijk de 50 notities](/training/oefeningen/notities/), of [download ze](/training/oefeningen/servicedesk-notities.txt) om ze in een teksteditor te bewerken. Kun je SQL? Dan kan het ook in het [Klantsysteem](/klantsysteem/sql), met `SELECT * FROM support_log ORDER BY logged_at;`
2. Bekijk de notities **voordat** je ze aan een AI geeft. Wat valt je op?
3. Bepaal per soort gegeven:
   - wat er gewoon naar de AI mag;
   - wat je vervangt door een label, bijvoorbeeld `[IBAN]`;
   - wat je meldt aan het team dat de bron beheert.
4. Maak de notities schoon. Hoe je dat betrouwbaar doet, lees je hieronder bij [Zo maak je gegevens veilig](#zo-maak-je-gegevens-veilig). Kijk daarna nog één keer of je niets hebt gemist.
5. Zet de prompt hieronder in de chat (knop "Zet in de chat"), plak je opgeschoonde notities eronder en verstuur.
6. Kleurt de chat rood? Dan stond er nog iets in dat niet naar een AI mag. De chat laat zien wat hij vond. Let op: de chat herkent niet alles. Wat zag hij niet?

```prompt
Hieronder staan 50 notities van onze servicedesk. Persoonsgegevens en bankgegevens zijn vervangen door labels zoals [IBAN] en [KLANT].
Maak een overzicht: welke onderwerpen komen voor, hoe vaak, en welke vragen zouden we kunnen voorkomen met betere informatie op de website?
Neem geen labels of klantnummers over in je antwoord.

De notities:
```

## Zo maak je gegevens veilig

Zo maak je gegevens veilig voordat je ze in een AI zet, ook op je werk in Copilot:

1. **Vervang het zelf.** Maak van namen "Klant A", "Klant B", van rekeningnummers `[IBAN]` en van e-mailadressen `[e-mail]`. Dat kan altijd, met zoeken en vervangen in een teksteditor, en je hebt niets extra's nodig. Kijk daarna alles nog één keer na: een zoekopdracht mist vaak een schrijfwijze (met spaties, kleine letters).
2. **Een hulpmiddel kan helpen.** Er zijn browserextensies die tekst maskeren voordat je hem plakt, en de echte gegevens in het antwoord weer terugzetten. Een voorbeeld is [Privatiser](https://addons.mozilla.org/firefox/addon/privatiser/) voor Firefox (werkt in ChatGPT, Claude, Gemini en Copilot). Een overzicht van gratis hulpmiddelen staat op [deze pagina](https://pasqualepillitteri.it/nl/news/19981/klantgegevens-anonimiseren-ai-avg). Microsoft heeft [Presidio](https://microsoft.github.io/presidio/), maar dat is gereedschap voor ontwikkelaars: alleen zinvol als IT het voor iedereen inricht. Zet nooit zelf iets op je werklaptop zonder toestemming van IT, en controleer het resultaat altijd: geen hulpmiddel vindt alles, en ze zijn niet getest op Nederlandse gegevens zoals een BSN.
3. **Vraag je IT-afdeling welke route jullie hebben.** Misschien is er al een afspraak of een hulpmiddel. De lange prompt van stap 1 vroeg je AI hier ook naar (vraag 21).

Kleurt de chat rood, doe dan dit en stuur het opnieuw.

## Op je eigen werk

Welke gegevens uit je eigen werk (mail, tickets, een export) zou je aan een AI willen geven? Wat moet je eruit halen voordat het mag? Zoek op wat het AI-beleid van je eigen werkgever erover zegt.

<details class="reflectie">
<summary>Klaar met deel 1? Open de reflectievragen</summary>

- Hoeveel notities bevatten iets dat niet naar de AI mocht? Vond je ze allemaal? Hoe weet je dat zeker?
- Werkte een eenvoudige zoekopdracht voor alle gevallen?
- Wat zag de chat, en wat zag hij niet? Kun je op zo'n waarschuwing vertrouwen?
- Welke afspraak zou je met het bronteam willen maken, zodat dit niet meer gebeurt?
- Mag een klantnummer wel naar de AI? Waarom wel of niet?
- De notities bevatten ook de voornamen van medewerkers. Zijn dat persoonsgegevens? Mogen die naar de AI?
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met andere gegevens of een andere AI?

</details>
