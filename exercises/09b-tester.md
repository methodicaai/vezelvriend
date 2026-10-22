---
stap: "9"
onderdeel: verdiepen
keuze: tester
title: Testcases uit de beslisboom
role: Tester
summary: Leid met AI testcases af uit de beslisboom, inclusief randgevallen, en toets ze aan het Klantsysteem en het Klantbeeld.
---

# Tester: testcases uit de beslisboom

## Doel

Je gebruikt AI om testcases te bedenken en leert dat de AI vooral de voor de hand liggende gevallen vindt. De randgevallen moet je zelf bewaken.



## Opdracht

1. Lees [de beslisboom](/training/oefeningen/documenten/beslisboom/).
2. Laat de AI testcases maken, eerst kaal (prompt A). Schrijf daarna **zelf** een prompt met de beslisboom erbij, met het [promptkader](/training/oefeningen/werkbladen/). Vergelijk je prompt met prompt B hieronder, en gebruik de beste.
3. Vul de lijst zelf aan met randgevallen. Denk in elk geval aan:
   - een meting die **precies 15 minuten** oud is;
   - een snelheid die precies op de grens van "normaal" ligt;
   - een klant die **dubbel** in de zoekresultaten van het Klantsysteem staat;
   - een herstart op afstand die vóór of ná de laatste meting gebeurde.
4. Zoek in het [Klantsysteem](/klantsysteem/) en het [Klantbeeld](/klantbeeld/) naar een echte klant voor zoveel mogelijk testcases. Waar vind je er geen?
5. Schrijf per testcase: beginsituatie, stappen, verwachte uitkomst en waar die verwachting op gebaseerd is.

## Voorbeeldprompt zonder context (A)

```prompt
Maak testcases voor een systeem dat bepaalt of er een monteur naar een klant moet.
```

## Voorbeeldprompt met context (B)

```prompt
Je bent een ervaren tester. Hieronder staat een beslisboom die de klantenservice gebruikt.

{{plak de beslisboom en de begrippen}}

1. Maak een tabel met testcases: per stap van de boom minstens één geval dat de stap raakt en één dat er net niet onder valt.
2. Benoem expliciet de grenswaarden.
3. Noem gevallen waarin de boom onduidelijk is of tegenstrijdige uitkomsten kan geven.
```

## Op je eigen werk

Neem een regel of beschrijving uit je eigen werk. Laat de AI testgevallen maken en vul zelf de randgevallen aan. Welke had de AI niet bedacht?

<details class="reflectie">
<summary>Klaar? Open de reflectievragen</summary>

- Welke randgevallen bedacht de AI zelf, en welke moest jij toevoegen?
- Waar was de beslisboom niet eenduidig? Wie moet dat beslissen: jij, de AI of de product owner?
- Wat doet een dubbele klant in de zoekresultaten met je test, en met een echt telefoongesprek?
- Hoe weet je of de verwachte uitkomsten van de AI kloppen?
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met andere gegevens of een andere AI?

</details>
