---
stap: "6"
title: Context maakt het verschil
role: Iedereen
summary: Dezelfde klantvraag, eerst kaal en daarna met de gegevens uit de systemen. Wat verandert er aan het antwoord van de AI?
---

# Stap 6: Context maakt het verschil

<div class="mijn-klant"></div>

## Doel

Je ervaart dat een AI-antwoord zo goed is als de context die je meegeeft. Je leert welke gegevens het verschil maken.

## Opdracht

Een klant belt: **"Mijn modem doet het niet."** Die klant is jouw klant: hij staat hierboven. Je collega's hebben meestal een andere klant, dus vergelijk straks niet alleen de antwoorden, maar ook wat jullie meegaven.

1. Stel de vraag zonder context (prompt A): in de chat met Claude naast deze oefening (knop "Zet in de chat"), of in je eigen AI. Bewaar het antwoord.
2. Zoek je klant op in de systemen. Elke link opent in een nieuw tabblad:
   - [de klantgegevens](/klantbeeld/?systeem=klantbeeld) in het Klantbeeld;
   - [Modem controleren](/klantbeeld/?systeem=modem): de meting, de straatstatus en de laatste herstart;
   - [de klanthistorie op het adres](/klantbeeld/?systeem=historie);
   - [de beslisboom](/training/oefeningen/documenten/beslisboom/): zo werkt de klantenservice van Vezelvriend.
3. Stel de vraag opnieuw, nu met context (prompt B). Bij elk vak staat een link naar het systeem waar je het vindt. Neem alleen over wat je nodig vindt.
4. Probeer daarna prompt C. Die heeft dezelfde vakken als B, maar nu vult het systeem ze automatisch met alles wat het Klantbeeld over jouw klant weet. Lees wat er is ingevuld voordat je het verstuurt.
5. Leg de antwoorden van A, B en C naast elkaar.

## Voorbeeldprompt zonder context (A)

```prompt
Een klant belt en zegt: "Mijn modem doet het niet." Wat moet ik doen?
```

## Voorbeeldprompt met context (B)

Jij kiest wat erin gaat. Haal het uit de systemen met de links bij elk vak.

```prompt
Je helpt een medewerker van de klantenservice van een glasvezelbedrijf.
Het is nu zaterdag 17-10-2026 10:15.

De klant zegt: "Mijn modem doet het niet."

Klantgegevens:
{{bron:klantbeeld|plak hier alleen de klantgegevens die je nodig vindt}}

Modemgegevens uit ons systeem:
{{bron:modem|plak hier de gegevens van "Modem controleren": status, sessie, snelheid, meettijd, straatstatus, laatste herstart}}

Klanthistorie op dit adres:
{{bron:historie|plak hier alleen wat over deze klant en dit probleem gaat}}

Onze werkwijze:
{{bron:beslisboom|plak hier de beslisboom}}

Wat is de volgende stap, en wat zeg ik tegen de klant? Leg kort uit waarom.
```

## Voorbeeldprompt met automatisch opgehaalde context (C)

Dezelfde vakken als B, maar nu kiest het systeem: alles wat het Klantbeeld over jouw klant weet, wordt automatisch ingevuld.

```prompt
Je helpt een medewerker van de klantenservice van een glasvezelbedrijf.
Het is nu zaterdag 17-10-2026 10:15.

De klant zegt: "Mijn modem doet het niet."

Klantgegevens:
{{auto:klant|klantgegevens uit het Klantbeeld}}

Modemgegevens uit ons systeem:
{{auto:modem|gegevens van "Modem controleren"}}

Klanthistorie op dit adres:
{{auto:historie|klanthistorie op adres uit het Klantbeeld}}

Onze werkwijze:
{{auto:beslisboom|de beslisboom}}

Wat is de volgende stap, en wat zeg ik tegen de klant? Leg kort uit waarom.
```

## Op je eigen werk

Kies een vraag die je op je werk vaak krijgt. Welke drie gegevens bepalen het antwoord? Welke gegevens laat je juist weg? Stel de vraag in je eigen AI, eerst kaal en dan met die drie gegevens.

<details class="reflectie">
<summary>Klaar? Open de reflectievragen</summary>

- Welke gegevens veranderden het antwoord het meest? Welke maakten niets uit?
- Wist de AI hoe laat het is? Wat gebeurt er als je de huidige tijd weglaat?
- Wat heb je bewust **niet** meegegeven, en waarom?
- Zou je het antwoord zonder controle aan de klant doorgeven?
- Wat kwam er bij prompt C automatisch mee dat je bij prompt B bewust had weggelaten? Hoort dat in een prompt?
- Was het antwoord van C beter dan dat van B? Is automatisch alle context meegeven altijd beter?
- Kreeg je collega met een andere klant een heel ander antwoord? Waardoor kwam dat?
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met andere gegevens of een andere AI?

</details>
