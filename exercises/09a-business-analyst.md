---
stap: "9"
onderdeel: verdiepen
keuze: analist
title: Van klantverhaal naar user story
role: Businessanalist
summary: Maak met AI een user story met acceptatiecriteria uit een klantverhaal, en controleer de bronnen waar de AI op leunt.
---

# Analist: van klantverhaal naar user story

## Doel

Je gebruikt AI om sneller een goede user story te schrijven, en je leert de bronnen te controleren in plaats van de AI blind te volgen.



## Opdracht

Lees deze documenten. Ze staan ook in de [documentenmap](/training/oefeningen/documenten/):

- [Klantverhaal Familie De Wit](/training/oefeningen/documenten/klantverhaal-de-wit/): het verhaal van de klant;
- [Gespreksleidraad](/training/oefeningen/documenten/gespreksleidraad/): hoe de klantenservice een gesprek voert;
- [Servicevoorwaarden](/training/oefeningen/documenten/servicevoorwaarden/): ook te lezen op de website, onder Service;
- [User story US-014](/training/oefeningen/documenten/us-014/): de user story zoals die nu in de backlog staat;
- [Mail van Sanne over US-014](/training/oefeningen/documenten/mail-sanne-us-014/): een mail van de product owner.

Doe dan het volgende:

1. Laat de AI uit alleen het klantverhaal een user story met acceptatiecriteria maken (prompt A).
2. Schrijf nu **zelf** een prompt waarmee je de AI alle bronnen meegeeft en om een verbeterde versie van US-014 vraagt. Gebruik het [promptkader](/training/oefeningen/werkbladen/). Vergelijk je prompt daarna met prompt B hieronder: wat had jij niet, en wat had jij wel?
3. Controleer zelf: zeggen de bronnen hetzelfde? Waar zitten tegenstrijdigheden of gaten?
4. Schrijf je eigen eindversie van US-014 en een lijst met vragen voor de product owner.

## Voorbeeldprompt zonder context (A)

```prompt
Maak een user story met acceptatiecriteria voor dit klantverhaal:
{{plak het klantverhaal}}
```

## Voorbeeldprompt met context (B)

```prompt
Je bent een ervaren businessanalist. Hieronder staan een klantverhaal, de huidige user story US-014 en de bronnen waar die op gebaseerd is.

{{plak alle bronnen, elk met een kopje met de bestandsnaam}}

1. Verbeter US-014 met concrete, toetsbare acceptatiecriteria.
2. Noem elke tegenstrijdigheid tussen de bronnen. Kies geen kant: zet het als open vraag.
3. Noem bij elk acceptatiecriterium uit welke bron het komt.
```

## Op je eigen werk

Neem een mailwisseling of een verslag uit je eigen werk. Laat de AI er de eisen uit halen, met de bron bij elke eis. Wat ontbrak, en wat had de AI verzonnen?

<details class="reflectie">
<summary>Klaar? Open de reflectievragen</summary>

- Welke tegenstrijdigheid vond de AI wel, en welke niet? Welke vond jij zelf?
- Wat had er misgegaan als je alleen het eerste antwoord had overgenomen?
- Een afspraak staat ergens anders dan in de user story. Hoe voorkom je dat in jouw team?
- Waarom is "noem de bron" een goede vraag aan een AI?
- Ging alles goed? Hoe weet je dat het de volgende keer ook goed gaat, met andere gegevens of een andere AI?

</details>
