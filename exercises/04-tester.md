---
number: 4
title: Testcases uit de beslisboom
role: Tester
summary: Leid met AI testcases af uit de beslisboom, inclusief randgevallen, en toets ze aan het Klantsysteem en het Klantbeeld.
---

# Oefening 4: Testcases uit de beslisboom

## Doel

Je gebruikt AI om testcases te bedenken en leert dat de AI vooral de voor de hand liggende gevallen vindt. De randgevallen moet je zelf bewaken.

## Opdracht

1. Lees de beslisboom bij **De systemen** op de site (of `docs/decision-tree.md`).
2. Laat de AI testcases maken, eerst kaal (prompt A), dan met de beslisboom en de definities erbij (prompt B).
3. Vul de lijst zelf aan met randgevallen. Denk in elk geval aan:
   - een meting die **precies 15 minuten** oud is;
   - een snelheid die precies op de grens van "normaal" ligt;
   - een klant die **dubbel** in de zoekresultaten van het Klantsysteem staat;
   - een herstart op afstand die vóór of ná de laatste meting gebeurde.
4. Zoek in het Klantsysteem en het Klantbeeld naar een echte klant voor zoveel mogelijk testcases. Waar vind je er geen?
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

## Reflectievragen

- Welke randgevallen bedacht de AI zelf, en welke moest jij toevoegen?
- Waar was de beslisboom niet eenduidig? Wie moet dat beslissen: jij, de AI of de product owner?
- Wat doet een dubbele klant in de zoekresultaten met je test, en met een echt telefoongesprek?
- Hoe weet je of de verwachte uitkomsten van de AI kloppen?
