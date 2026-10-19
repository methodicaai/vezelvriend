---
number: 1
title: Context maakt het verschil
role: Iedereen
summary: Dezelfde klantvraag, eerst kaal en daarna met de gegevens uit het Klantbeeld. Wat verandert er aan het antwoord van de AI?
---

# Oefening 1: Context maakt het verschil

## Doel

Je ervaart dat een AI-antwoord zo goed is als de context die je meegeeft. Je leert welke gegevens het verschil maken.

## Opdracht

Een klant belt: **"Mijn modem doet het niet."**

1. Kies een klant uit de lijst hieronder (of krijg er een van de trainer).
2. Stel je AI-assistent de vraag zonder context (prompt A). Bewaar het antwoord.
3. Open de klant in het **Klantbeeld**. Kijk op het tabblad **Techniek** en klik op **Modem controleren**. Kijk ook naar **Klanthistorie op adres**.
4. Stel de vraag opnieuw, nu met context (prompt B). Neem alleen over wat je nodig vindt.
5. Leg de twee antwoorden naast elkaar.

Klanten om mee te oefenen: Familie De Wit, Mevrouw Jansen, De heer El Amrani, Familie Bakker, Bloemenhuis Lente.

## Voorbeeldprompt zonder context (A)

```prompt
Een klant belt en zegt: "Mijn modem doet het niet." Wat moet ik doen?
```

## Voorbeeldprompt met context (B)

```prompt
Je helpt een medewerker van de klantenservice van een glasvezelbedrijf.
Het is nu zaterdag 17-10-2026 10:15.

De klant zegt: "Mijn modem doet het niet."

Modemgegevens uit ons systeem:
{{plak hier de gegevens van "Modem controleren": status, sessie, snelheid, meettijd, straatstatus, laatste herstart}}

Relevante klanthistorie op dit adres:
{{plak hier alleen wat over deze klant en dit probleem gaat}}

Onze werkwijze: {{plak hier de beslisboom uit de documentatie}}

Wat is de volgende stap, en wat zeg ik tegen de klant? Leg kort uit waarom.
```

## Reflectievragen

- Welke gegevens veranderden het antwoord het meest? Welke maakten niets uit?
- Wist de AI hoe laat het is? Wat gebeurt er als je de huidige tijd weglaat?
- Wat heb je bewust **niet** meegegeven, en waarom?
- Zou je het antwoord zonder controle aan de klant doorgeven?
