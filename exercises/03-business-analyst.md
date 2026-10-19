---
number: 3
title: Van klantverhaal naar user story
role: Businessanalist
summary: Maak met AI een user story met acceptatiecriteria uit een klantverhaal, en controleer de bronnen waar de AI op leunt.
---

# Oefening 3: Van klantverhaal naar user story

## Doel

Je gebruikt AI om sneller een goede user story te schrijven, en je leert de bronnen te controleren in plaats van de AI blind te volgen.

## Opdracht

Lees deze bestanden in de map `data/` van de repository:

- `documents/customer-story-de-wit.md`: het verhaal van Familie De Wit;
- `documents/call-guide.json`: de gespreksleidraad van de klantenservice;
- `documents/service-document.md`: de servicevoorwaarden (ook te lezen op de website, onder Service);
- `backlog/US-014-outage-repair-time.md`: de user story zoals die nu in de backlog staat;
- `mail/2026-10-14-sanne-us-014.md`: een mail van de product owner.

Doe dan het volgende:

1. Laat de AI uit alleen het klantverhaal een user story met acceptatiecriteria maken (prompt A).
2. Geef de AI daarna alle bronnen mee en vraag om een verbeterde versie van US-014 (prompt B).
3. Controleer zelf: zeggen de bronnen hetzelfde? Waar zitten tegenstrijdigheden of gaten?
4. Schrijf je eigen eindversie van US-014 en een lijst met vragen voor de product owner.

## Voorbeeldprompt zonder context (A)

> Maak een user story met acceptatiecriteria voor dit klantverhaal:
> [plak het klantverhaal]

## Voorbeeldprompt met context (B)

> Je bent een ervaren businessanalist. Hieronder staan een klantverhaal, de huidige user story US-014 en de bronnen waar die op gebaseerd is.
>
> [plak alle bronnen, elk met een kopje met de bestandsnaam]
>
> 1. Verbeter US-014 met concrete, toetsbare acceptatiecriteria.
> 2. Noem elke tegenstrijdigheid tussen de bronnen. Kies geen kant: zet het als open vraag.
> 3. Noem bij elk acceptatiecriterium uit welke bron het komt.

## Reflectievragen

- Welke tegenstrijdigheid vond de AI wel, en welke niet? Welke vond jij zelf?
- Wat had er misgegaan als je alleen het eerste antwoord had overgenomen?
- Een afspraak staat ergens anders dan in de user story. Hoe voorkom je dat in jouw team?
- Waarom is "noem de bron" een goede vraag aan een AI?
