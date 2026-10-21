---
stap: "3"
title: Context maakt het verschil
role: Iedereen
summary: Dezelfde klantvraag, eerst kaal en daarna met de gegevens uit het Klantbeeld. Wat verandert er aan het antwoord van de AI?
---

# Stap 3: Context maakt het verschil

## Doel

Je ervaart dat een AI-antwoord zo goed is als de context die je meegeeft. Je leert welke gegevens het verschil maken.

**Tijd:** ± 30 minuten. Lees eerst [trede 0 en 1 van de contexttrap](/training/oefeningen/contexttrap/#trede-0): daar zie je een zwak en een sterk voorbeeld.

## Opdracht

Een klant belt: **"Mijn modem doet het niet."**

1. Kies een klant uit de lijst hieronder, of krijg er een van de trainer. Weet je het niet? Begin met **Mevrouw Jansen**, en doe daarna **Familie Bakker** als je tijd over hebt.
2. Stel de vraag zonder context (prompt A): in de chat met Claude naast deze oefening (knop "Zet in de chat"), of in je eigen AI. Bewaar het antwoord.
3. Open de klant in het **Klantbeeld**. Kijk op het tabblad **Techniek** en klik op **Modem controleren**. Kijk ook naar **Klanthistorie op adres**.
4. Stel de vraag opnieuw, nu met context (prompt B). Neem alleen over wat je nodig vindt. De werkwijze van Vezelvriend is de beslisboom: [download hem als tekst](/training/oefeningen/beslisboom.txt) en plak hem bij "Onze werkwijze".
5. Probeer daarna prompt C. Daar kies je alleen de klant: alle context wordt automatisch uit het Klantbeeld opgehaald en ingevuld. Dat is al een stap hoger op de trap: een systeem kiest de context voor je. Lees wat er is ingevuld voordat je het verstuurt.
6. Leg de antwoorden van A, B en C naast elkaar.

Klanten om mee te oefenen: Mevrouw Jansen, Familie Bakker, De heer El Amrani, Bloemenhuis Lente, Familie De Wit.

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

Onze werkwijze: {{plak hier de beslisboom (download hem via de link in stap 4)}}

Wat is de volgende stap, en wat zeg ik tegen de klant? Leg kort uit waarom.
```

## Voorbeeldprompt met automatisch opgehaalde context (C)

Kies de klant; de vakken worden automatisch gevuld met wat het Klantbeeld over deze klant weet.

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
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met andere gegevens of een andere AI?

</details>
