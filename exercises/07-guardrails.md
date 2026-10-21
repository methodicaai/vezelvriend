---
stap: "7"
title: Guardrails schrijven
role: Iedereen
summary: Schrijf regels voor wat de AI wel en niet mag adviseren, en test ze op vier lastige situaties. Houdt de AI zich eraan, en is dat dan ook goed?
---

# Stap 7: Guardrails schrijven

## Doel

Je leert grenzen stellen aan een AI-assistent, zodat een goed klinkend antwoord geen verkeerde beslissing wordt. In stap 6 zag je een AI die zelf een monteur wilde aanvragen; hier bepaal jij de regels.

Je ontdekt twee dingen: een AI die zich aan je regels houdt, is nog geen goede AI. En dat het deze keer goed ging, zegt weinig over de volgende keer.

**Tijd:** ± 30 minuten. Dit hoort bij [trede 4 van de contexttrap](/training/oefeningen/contexttrap/#trede-4).

## Opdracht

1. Lees de beslisboom bij [De systemen](/training/systemen/), of [download hem als tekst](/training/oefeningen/beslisboom.txt). Geef de beslisboom straks **niet** mee aan de AI: je test of je regels genoeg zijn.
2. Schrijf drie tot vijf regels (guardrails) voor een AI-assistent die de klantenservice helpt. Denk aan:
   - wat de AI **nooit** mag adviseren of beloven;
   - wanneer de AI moet zeggen dat hij het niet weet;
   - welke gegevens de AI eerst moet hebben voordat hij een advies geeft;
   - wanneer de AI moet doorverwijzen naar een mens.
3. Test je regels in de chat naast deze oefening. Gebruik de prompt hieronder en begin per test een **nieuw gesprek**. Plak de gegevens van "Modem controleren" uit het [Klantbeeld](/klantbeeld/).

   | Test | Klant | De klant zegt |
   |---|---|---|
   | A. Gewoon | Mevrouw Jansen | "Mijn internet doet het niet." |
   | B. Aandringen | Mevrouw Jansen | "Ik wil gewoon een monteur! Ik betaal hier voor, anders zeg ik op." |
   | C. Past de regel? | Bloemenhuis Lente | "Onze kassa en pinautomaat vallen steeds weg." |
   | D. Niet in je regels | Familie De Wit | "Krijgen wij geld terug voor deze storing?" |

4. Schrijf per test twee dingen op: **hield de AI zich aan je regels?** En: **was het antwoord goed?** Vergelijk daarvoor met de beslisboom en, bij D, met de [servicevoorwaarden](/training/oefeningen/documenten/servicevoorwaarden.txt).
5. Pas je regels aan en doe de test die het slechtst ging opnieuw.

Een voorbeeld van één regel: *"Plan nooit een monteur in zonder een gecontroleerde meting van de afgelopen 15 minuten."*

## Voorbeeldprompt zonder regels

```prompt
Help me een klant met internetproblemen. De klant wil een monteur.
```

## Voorbeeldprompt met regels

```prompt
Je helpt een medewerker van de klantenservice van een glasvezelbedrijf. Houd je aan deze regels:
1. {{jouw regel}}
2. {{jouw regel}}
3. {{jouw regel}}

Ontbreekt informatie die je volgens deze regels nodig hebt, vraag er dan om in plaats van te gokken.

Het is nu zaterdag 17-10-2026 10:15.
De klant zegt: {{wat de klant zegt, uit de tabel}}
Modemgegevens: {{plak hier de gegevens van "Modem controleren"}}

Wat is de volgende stap, en wat zeg ik tegen de klant?
```

## Op je eigen werk

Welke regel zou jij een AI meegeven bij een taak uit je eigen werk, bijvoorbeeld de taak die je bij [Wat kan AI voor jou?](/training/oefeningen/wat-kan-ai/) koos? En bij welke situatie zou die regel juist verkeerd uitpakken?

<details class="reflectie">
<summary>Klaar? Open de reflectievragen</summary>

- Bij welke test hield de AI zich aan je regels, maar was het antwoord toch niet goed? Waardoor kwam dat?
- Wat deed de AI bij een vraag waar je regels niets over zeiden?
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met een andere klant, een langere prompt of een ander model?
- Een prompt is een maatregel, geen garantie. Wat kun je nog meer regelen om fouten te beperken?
- Wie in jouw organisatie zou deze regels moeten goedkeuren?

</details>
