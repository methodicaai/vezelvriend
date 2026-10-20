# Intake: wat kan jouw AI op het werk?

Laat elke deelnemer vóór de training onderstaande prompt plakken in de AI die hij of zij op het werk gebruikt (Microsoft Copilot, ChatGPT, Claude, Gemini, of een AI in de terminal zoals Claude Code). De uitkomst laat zien op welke trede van de contexttrap de organisatie staat. Er komt geen inhoud uit mail of documenten in het antwoord, alleen wat wel en niet lukt.

De deelnemer stuurt alleen de tabel naar de trainer.

## De prompt

```text
Ik bereid me voor op een AI-training. Ik wil weten wat jij in mijn organisatie wel en niet kunt. Test onderstaande punten en vul per punt in wat de uitkomst is. Verzin niets.

TESTREGELS
- Test elk punt echt. Dat je ziet dat een recht of koppeling bestaat, telt niet als test. Punten die over instellingen of beleid gaan (zoals 26, 28 en 30) hoef je niet te testen: geef dan aan wat je weet, of "vraag na bij IT".
- Is er geen directe functie, probeer dan eerst een andere route voordat je opgeeft (bijvoorbeeld: een transcript ophalen via een vergadering in mijn agenda; een wiki apart van werkitems testen).
- "Weet ik niet" gebruik je alleen als testen echt onmogelijk is. Zeg dan waarom.
- Krijg je een foutmelding of weigering, noem dan kort de oorzaak (bijvoorbeeld "uitgezet door beheerder", "koppeling staat uit in dit gesprek", "geen koppeling", "geen toestemming gekregen").
- Staat iets uit, zeg dan of ik het zelf kan aanzetten of dat een beheerder dat moet doen.
- Noem per punt via welke koppeling, tool of bron je het hebt getest (bijvoorbeeld "Microsoft 365-koppeling", "webzoekfunctie", "geheugen", "organisatie-instructies", of de naam van een connector, plugin, extensie, app of MCP-server). Heb je niets kunnen gebruiken, schrijf dan "geen".
- Haal je bij het testen inhoud op (zoals een transcript, mail of document), gebruik die dan alleen om te zien of het lukt. Toon er niets van in je antwoord.
- Voer niets uit dat iets verandert, verstuurt, installeert of verwijdert. Controleer alleen of het mogelijk is. Heb je toegang tot mijn computer of een terminal, gebruik dan alleen opdrachten die iets lezen.

Belangrijk: laat in je antwoord GEEN inhoud zien uit mijn mail, documenten, agenda, chats, bestanden of andere systemen. Noem ook geen namen van mappen, bestanden, sites of personen, tenzij een punt daar uitdrukkelijk om vraagt. Noem alleen of het lukte en, waar gevraagd, de naam van het systeem of de agent.

0. Wat voor AI ben je?
1. Welk product ben je (bijvoorbeeld Microsoft Copilot, ChatGPT, Claude, Gemini, Claude Code) en, als je dat weet, welk model?
2. Waar draai je: in een chatvenster in de browser of app, ingebouwd in kantoorprogramma's (zoals Word, Outlook of Teams), of in een terminal of ontwikkelomgeving op mijn computer?
3. Is dit een zakelijk account van mijn organisatie of een persoonlijk account? Zeg "weet ik niet" als je het niet zeker weet.

A. Mijn werkgegevens
4. Kun je de onderwerpregels van mijn e-mails van deze week zien?
5. Kun je documenten vinden waar ik recent aan heb gewerkt (bijvoorbeeld OneDrive, SharePoint, Teams of Google Drive)?
6. Kun je mijn agenda zien?
7. Kun je mijn chats zien (bijvoorbeeld Teams of Slack)?
8. Kun je verslagen of transcripties van vergaderingen gebruiken? Probeer het transcript van een recente vergadering uit mijn agenda op te halen.

B. Internet
9. Kun je op internet zoeken? Zo ja: noem één nieuwskop van vandaag met de bron en de datum van het bericht. Kun je die datum niet controleren, zeg dat dan.

C. Bestanden en werkruimtes
10. Kan ik een bestand uploaden of toevoegen aan dit gesprek?
11. Is er een vaste werkruimte waarin ik documenten en instructies kan bewaren voor later (bijvoorbeeld Projecten, Notebooks, Pages, eigen GPT's of Gems)?
12. Onthoud je dingen over mij tussen gesprekken (geheugen, persoonlijke instructies of een instructiebestand)?

D. Andere systemen (koppelingen)
Probeer per systeem een onschuldige zoekopdracht, bijvoorbeeld naar het woord "test". Noem alleen of het lukte, geen resultaten. Is een koppeling geïnstalleerd maar staat die uit in dit gesprek, zeg dat dan, en of ik hem zelf kan aanzetten.
Zeg per systeem ook of je er alleen in kunt lezen, of ook iets kunt wijzigen of aanmaken (zoals een werkitem of ticket). Controleer dat alleen; maak of wijzig niets.
13. Azure DevOps: test werkitems én wiki apart.
14. Jira
15. Confluence
16. ServiceNow
17. Power BI (rapporten of datasets)
18. Salesforce of een ander CRM
19. Andere systemen, connectors, plugins, extensies, apps of MCP-servers die je kunt gebruiken: noem hun namen, of ze aan of uit staan, en of je er alleen kunt lezen of ook kunt wijzigen.

E. Agents
20. Welke agents of assistenten met een eigen taak kan ik hier gebruiken? Noem hun namen en in één zin wat ze doen (bijvoorbeeld Researcher, Analyst, eigen GPT's, Gems, of agents die mijn organisatie zelf heeft gemaakt).
21. Is er een agent, instructie of hulpmiddel voor het anonimiseren of weglaten van persoonsgegevens? Zo ja: hoe heet het?
22. Kan ik zelf een agent of eigen assistent maken (bijvoorbeeld met Copilot Studio, "agent maken", een eigen GPT of een Gem)?

F. Regels en beleid
23. Kun je een document vinden met het beleid van mijn organisatie over het gebruik van AI? Noem alleen de titel en waar het staat.
24. Zie je bij documenten gevoeligheidslabels (zoals "Vertrouwelijk")? Houd je daar rekening mee?

G. Werking en instellingen
Weet je het antwoord niet zeker, zeg dan "weet ik niet, vraag dit na bij IT". Gok niet.
25. Kun je de webpagina lezen die ik nu open heb in mijn browser? Probeer het via de beschikbare browserkoppeling of -extensie.
26. Hoe lang worden onze gesprekken bewaard, kan een beheerder in mijn organisatie ze inzien, en worden ze gebruikt om AI-modellen te trainen?
27. Welke modellen of standen kan ik kiezen (bijvoorbeeld een stand om dieper na te denken)?
28. Hoe groot mag een bestand zijn dat ik toevoeg, en hoeveel bestanden tegelijk?
29. Kun je zelf acties uitvoeren, zoals een e-mail versturen, een afspraak maken, een ticket aanmaken of een automatisering starten (bijvoorbeeld Power Automate)? Controleer per actie of de functie bestaat, maar voer niets uit.
30. Wie in mijn organisatie mag agents maken, en mogen die met collega's gedeeld worden?

H. Alleen als je toegang hebt tot een computer, terminal of werkomgeving (sla dit blok anders over en schrijf "niet van toepassing")
Maak bij elk punt onderscheid tussen MIJN EIGEN COMPUTER en een AFGESCHERMDE WERKOMGEVING IN DE CLOUD (die niet mijn computer is).
31. Kun je bestanden op mijn eigen computer lezen? Test dit door te kijken of er bestanden in een map staan, zonder namen te tonen. Zeg of dit alle mappen zijn of alleen bepaalde mappen.
32. Kun je opdrachten uitvoeren in een terminal? Test dit alleen met een opdracht die niets verandert (bijvoorbeeld de huidige map tonen). Zeg of die terminal op mijn eigen computer draait of in een werkomgeving in de cloud.
33. Vraag je toestemming voordat je een opdracht uitvoert of een bestand wijzigt, of gebeurt dat automatisch?

Zet je antwoorden in een tabel met vier kolommen: nummer, onderwerp, koppeling/bron, uitkomst (gelukt / niet gelukt + oorzaak / staat uit: zelf aan te zetten of via beheerder / weet ik niet + reden / vraag na bij IT / niet van toepassing). Noem bij koppelingen en acties ook: alleen lezen, of ook wijzigen.
Sluit af met één zin: kun je bij mijn werkgegevens, bij andere systemen, alleen bij internet, of bij geen van alle?
```

## Hoe je de uitkomst leest

| Uitkomst | Trede of module |
|---|---|
| Alleen B, eventueel 10 | **Trede 1**: zelf plakken, bestanden toevoegen |
| 11 (een vaste werkruimte) | **Trede 2**: jij kiest de documenten |
| A lukt, of 25 (de AI leest je browserpagina) | **Trede 3**: de AI zoekt of leest zelf |
| D of E lukt | **Trede 4**: koppelingen en agents (ophalen) |
| 29 of 32: acties of opdrachten lukken | **Trede 4 met acties**: hier is goedkeuring vooraf het belangrijkst (zie 33) |
| 3, 23, 24, 26 | Bruikbaar voor module F, **Wat mag hier?** |
| 22 en 30 | Of je in de training zelf een agent kunt laten bouwen |

**Let op:**
- "Niet gelukt" betekent "niet beschikbaar voor deze deelnemer", niet "bestaat niet". Koppelingen werken vaak alleen als de IT-afdeling ze heeft aangezet. Voor een definitief antwoord is IT de beste bron.
- **De trede hangt ook van de tool af.** Gebruikt een organisatie meerdere AI's (bijvoorbeeld Copilot én Claude), laat de prompt dan in elke tool draaien. Binnen dezelfde organisatie kan de ene tool bij andere systemen dan de andere.
- **"Niet gevonden" is niet "bestaat niet".** Vindt de ene AI een document wel en de andere niet, dan zegt dat iets over het zoeken van die AI, niet over het document.
- **"Staat uit"** is een eigen categorie: kan de deelnemer het zelf aanzetten, dan is die trede binnen bereik.

**Een AI in de terminal** (zoals Claude Code) vraagt bij blok H vaak eerst toestemming om een opdracht uit te voeren. Geef die alleen voor opdrachten die iets lezen.
