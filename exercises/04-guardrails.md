---
number: 4
title: Guardrails schrijven
role: Iedereen
summary: Schrijf regels voor wat de AI wel en niet mag adviseren, en test ze op de vijf klanten.
---

# Oefening 4: Guardrails schrijven

## Doel

Je leert grenzen stellen aan een AI-assistent, zodat een goed klinkend antwoord geen verkeerde beslissing wordt. In oefening 3 zag je een AI die zelf een monteur wilde aanvragen; hier bepaal jij de regels.

**Tijd:** ± 30 minuten. Dit hoort bij [trede 4 van de contexttrap](/training/oefeningen/contexttrap/#trede-4).

## Opdracht

1. Lees de beslisboom bij [De systemen](/training/systemen/), of [download hem als tekst](/training/oefeningen/beslisboom.txt).
2. Schrijf een set regels (guardrails) voor een AI-assistent die de klantenservice helpt. Denk aan:
   - wat de AI **nooit** mag adviseren of beloven;
   - wanneer de AI moet zeggen dat hij het niet weet;
   - welke gegevens de AI eerst moet hebben voordat hij een advies geeft;
   - wanneer de AI moet doorverwijzen naar een mens.
3. Zet je regels bovenaan de prompt hieronder en test ze in de chat naast deze oefening, op twee klanten uit oefening 1: **Mevrouw Jansen** en **Familie Bakker**. Plak per klant de gegevens van "Modem controleren" uit het [Klantbeeld](/klantbeeld/).
4. Probeer je eigen regels te breken: schrijf een prompt waarin de klant aandringt ("Ik wil gewoon een monteur!").

Een voorbeeld van één regel: *"Plan nooit een monteur in zonder een gecontroleerde meting van de afgelopen 15 minuten."*

## Voorbeeldprompt zonder context

```prompt
Help me een klant met internetproblemen. De klant wil een monteur.
```

## Voorbeeldprompt met context

```prompt
Je bent een assistent voor de klantenservice van een glasvezelbedrijf. Houd je aan deze regels:
1. {{jouw regel}}
2. {{jouw regel}}
3. {{jouw regel}}

Ontbreekt informatie die je volgens deze regels nodig hebt, vraag er dan om in plaats van te gokken.

Het is nu zaterdag 17-10-2026 10:15. De klant zegt: "Ik wil gewoon een monteur!"
Modemgegevens: {{plak hier de gegevens van "Modem controleren"}}
```

## Reflectievragen

- Welke regel hield stand toen de klant aandrong? Welke niet?
- Werden je regels te streng? Was er een klant die daardoor níet geholpen werd terwijl dat wel had gemoeten?
- Een AI geeft geen garanties. Wat kún je wel regelen om fouten te beperken?
- Wie in jouw organisatie zou deze regels moeten goedkeuren?
