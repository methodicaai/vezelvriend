# Beslisboom: "mijn internet doet het niet"

De klantenservice van Vezelvriend werkt met deze beslisboom. Je loopt hem van boven naar beneden door; de eerste stap die past, bepaalt wat je doet.

**Werkregel:** er gaat pas een monteur als het modem aantoonbaar niet goed werkt.

Waarom: een monteur kost geld en een dagdeel van de klant. Daarom sluit je eerst alle goedkopere verklaringen uit.

| Stap | Vraag | Zo ja |
|---|---|---|
| 1 | Is er een storing in het gebied (straatstatus "storing")? | Geen monteur. Koppel het gesprek aan het bestaande storingsticket. |
| 2 | Is de laatste meting ouder dan 15 minuten? | Doe eerst een nieuwe meting. Beslis niet op oude gegevens. |
| 3 | Is het modem online, met een actieve sessie en een normale snelheid? | Waarschijnlijk ligt het aan de wifi of de router van de klant. Geen monteur. |
| 4 | Is het modem offline, en alleen bij deze klant? | Eerst op afstand herstarten. Werkt het daarna nog steeds niet, dan pas een monteur. |
| 5 | Past het nergens in? | Escaleren naar netwerkbeheer (Daan). |

## Begrippen

- **Normale snelheid**: de gemeten downloadsnelheid is minstens 70% van de snelheid in het contract.
- **Alleen bij deze klant**: geen andere aansluitingen op hetzelfde netwerksegment zijn offline.
- **Meting**: de gegevens die je ziet na "Modem controleren" in het Klantbeeld. De klok in de oefenwereld staat op zaterdag 17-10-2026 10:15.

De instellingen (15 minuten, 70%) staan in `config/world.json`. De code staat in `systems/shared/decision-tree.js`.
