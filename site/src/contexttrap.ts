// The context ladder: five ways context reaches an AI, numbered 1 to 5, each
// with a worked example (a weak and a strong prompt side by side, with an
// example answer) and the check question for that step.
//
// The whole ladder is explained in one place: step 2 of the route
// (/training/oefeningen/contexttrap/). The exercises only carry the name of the
// ladder step they practise, as a label (see src/route.ts), with no explanation
// or link, so participants are never told which step "they" are on.
// Worked examples come before the exercises on purpose: beginners learn more
// from studying a good and a bad example than from trying straight away.
//
// The examples use a made-up customer (Familie Peters) on another day, so they
// show the method without giving away a scenario of the exercises.
// Steps 3 and 4 use a neutral project example, so no pitfall of the
// exercises is given away here.

export interface Example { prompt: string; answer: string; note: string }
export interface Step {
  nr: number; name: string; who: string; copilot: string; check: string; risk: string;
  intro: string; rule?: string; weak: Example; strong: Example; checkHow: string[];
}

export const steps: Step[] = [
  {
    nr: 1, name: 'Kale vraag', who: 'Niemand', copilot: 'Elke chat-AI',
    check: 'Klopt het feitelijk?', risk: 'Het antwoord klinkt goed, maar is algemeen.',
    intro: 'Je stelt alleen een vraag. De AI weet niets van jouw klant, jouw bedrijf of hoe laat het is. Voor algemene kennis is dat prima, voor een beslissing over één klant niet.',
    weak: {
      prompt: 'Een klant zegt dat zijn internet traag is. Hoe los ik dat op?',
      answer: '1. Laat de klant het modem 30 seconden uitzetten en weer aanzetten.\n2. Laat hem dichter bij de router gaan zitten, of een netwerkkabel proberen.\n3. Helpt dat niet, plan dan een monteur in.',
      note: 'Klinkt logisch, maar past op elke klant en daardoor op geen enkele. De AI weet niet of er een storing is, hoe het modem ervoor staat, of hoe jullie werken.',
    },
    strong: {
      prompt: 'Leg in gewone taal voor een klant uit wat het verschil is tussen een modem en een wifi-router. Maximaal vijf zinnen.',
      answer: 'Het modem is de verbinding tussen je huis en ons glasvezelnetwerk. De wifi-router verdeelt die verbinding draadloos door je huis. Bij ons zitten ze vaak in één kastje, de Vezelbox. Werkt internet via een kabel wel, maar wifi niet? Dan ligt het meestal aan de wifi, niet aan de verbinding.',
      note: 'Een goede kale vraag: algemene kennis, geen gegevens van een klant nodig. Toch controleer je of het klopt, want "bij ons in één kastje" heeft de AI gegokt.',
    },
    checkHow: ['Klopt het feitelijk, en is het niet te algemeen voor wat je ermee wilt doen?', 'Heeft de AI iets aangenomen over jouw situatie dat hij niet kan weten?'],
  },
  {
    nr: 2, name: 'Zelf plakken', who: 'Jij kiest elk stuk', copilot: 'Copilot Chat zonder werkdata',
    check: 'Heb ik de juiste gegevens, en niet te veel?', risk: 'Te veel, te weinig of de verkeerde gegevens.',
    intro: 'Jij kiest elk stuk dat de AI te zien krijgt, en plakt het in je vraag. Daardoor weet je precies wat de AI heeft: niet meer en niet minder. Je hebt alles in de hand, maar het kost werk, en kiezen is een vak.',
    rule: 'Kort en volledig? Dan plak je het zelf. Zo weet je zeker dat de AI alles ziet.',
    weak: {
      prompt: 'Hier is alles wat ik over de klant heb:\nFamilie Peters, telefoon 06-00000999, peters@example.com, klant sinds 2020.\nModem Vezelbox VB-200, serienummer VB200-099999, MAC 02:56:46:00:99:99, firmware 4.2.1.\nHistorie: 2023, klant vroeg of het modem naar de woonkamer kan.\nDe klant zegt dat internet het niet doet. Wat moet ik doen?',
      answer: 'Omdat het modem eerder is verplaatst, kan de bekabeling naar de woonkamer de oorzaak zijn. Laat de klant de kabels controleren. Helpt dat niet, herstart dan het modem op afstand en plan een monteur in.',
      note: 'Te veel en het verkeerde: naam, telefoon en e-mail zijn niet nodig. Een oud gesprek stuurt de AI de verkeerde kant op. En wat er echt toe doet, ontbreekt: de meting, de straatstatus, de tijd en jullie werkwijze.',
    },
    strong: {
      prompt: 'Je helpt een medewerker van de klantenservice van een glasvezelbedrijf.\nHet is nu vrijdag 16-10-2026 16:40.\nDe klant zegt: "Mijn internet doet het niet."\n\nModemgegevens:\n- laatste meting 16:35: offline, geen sessie\n- vorige meting 15:00: online, 486 Mbit/s\n- straatstatus: storing sinds 15:20, ticket INC-2026-0398\n\nOnze werkwijze: (de beslisboom uit de documentatie)\n\nWat is de volgende stap, en wat zeg ik tegen de klant? Leg kort uit waarom.',
      answer: 'Stap 1 van de beslisboom past: er is een storing in de straat sinds 15:20. Plan geen monteur in, maar koppel het gesprek aan ticket INC-2026-0398.\nTegen de klant: "Er is een storing bij u in de straat. Onze monteurs zijn ermee bezig. U hoeft niets te doen; zodra het is opgelost, werkt uw internet weer."',
      note: 'Alleen wat nodig is voor de beslissing, plus de tijd en de werkwijze. Geen naam, telefoon of e-mail.',
    },
    checkHow: ['Staat alles erin wat de beslissing bepaalt (hier: meting, tijd, straatstatus, werkwijze)?', 'Staat er iets in dat er niet in hoort, zoals persoonsgegevens of oude historie?', 'Kloppen de gegevens die je plakte nog met het systeem?'],
  },
  {
    nr: 3, name: 'Documenten meegeven', who: 'Jij kiest de bestanden, de AI kiest wat hij eruit gebruikt', copilot: 'Bestand toevoegen, Notebooks of Pages',
    check: 'Zijn mijn bronnen actueel en eenduidig?', risk: 'Oude of tegenstrijdige documenten.',
    intro: 'Je geeft hele documenten mee als bestand, of zet ze in een vaste werkruimte. Het verschil met plakken: nu kiest de AI zelf welke delen hij gebruikt. Bij een lang document leest hij niet altijd alles, en tabellen of scans komen soms slecht door. Handig bij lange stukken, maar controleer wat hij ermee deed. En hij gebruikt alles wat je meegeeft, ook wat verouderd is.',
    rule: 'Lang, of vaak nodig? Geef het mee als bestand, en controleer of de AI het echt las: vraag naar een kopje of naar iets op de laatste pagina.',
    weak: {
      prompt: '(Bijlagen: "Eisen klantportaal v2", "Eisen klantportaal v3", "Verslag overleg 14 oktober")\n\nMaak een lijst van alle eisen voor het klantportaal.',
      answer: '- De klant kan facturen downloaden als pdf en Excel.\n- De klant kan zijn adres zelf wijzigen.\n- Inloggen gaat met tweestapsverificatie.\n- ...',
      note: 'De AI weet niet welk document leidend is, en mengt oud en nieuw. Je ziet niet waar elke eis vandaan komt, dus je kunt het niet controleren.',
    },
    strong: {
      prompt: '(Bijlagen: "Eisen klantportaal v3", "Verslag overleg 14 oktober")\n\nVersie 3 van de eisen is leidend. Het verslag is van na versie 3.\nMaak een lijst van de eisen. Noem bij elke eis de bron (document en paragraaf).\nMeld apart waar het verslag afwijkt van versie 3.\nVerzin geen eisen: staat iets er niet in, zeg dat dan.',
      answer: '- Facturen downloaden als pdf (v3, par. 2.1)\n- Adres zelf wijzigen (v3, par. 2.4)\n- Inloggen met tweestapsverificatie (v3, par. 3.2)\n\nAfwijking: in het overleg van 14 oktober is afgesproken dat de download als Excel vervalt. Versie 3 noemt die nog (par. 2.1).',
      note: 'Jij bepaalt welke bronnen meetellen en welke leidend is. De AI noemt de bron per eis, en meldt tegenstrijdigheden in plaats van ze stilletjes op te lossen.',
    },
    checkHow: ['Zijn dit de nieuwste versies, en weet de AI welke leidend is?', 'Open twee of drie bronverwijzingen: staat het er echt?', 'Heeft de AI alles gelezen? Vraag naar iets van de laatste pagina of uit een tabel.', 'Spreken de documenten elkaar tegen? Wie beslist dan?'],
  },
  {
    nr: 4, name: 'De AI zoekt zelf', who: 'De AI, in alles waar jij bij kunt', copilot: 'Microsoft 365 Copilot met werkdata',
    check: 'Waar komt dit vandaan, en mocht de AI dat zien?', risk: 'De AI vindt dingen die je niet zocht, die verouderd zijn, of die niet voor dit doel bedoeld zijn.',
    intro: 'De AI doorzoekt zelf je mail, documenten, chats en vergaderingen. Jij kiest niet meer wat erin gaat. Dat is snel, maar je ziet niet wat hij las en wat hij miste.',
    weak: {
      prompt: 'Wat is er afgesproken over de livegang van het klantportaal?',
      answer: 'De livegang van het klantportaal is gepland op 1 december.',
      note: 'Geen bron, geen datum. Komt dit uit een oud overleg of uit de laatste mail? Uit een document dat voor jou bedoeld was? En wat heeft de AI niet gevonden?',
    },
    strong: {
      prompt: 'Zoek in mijn mail, Teams-chats en vergaderverslagen van de afgelopen vier weken wat er is afgesproken over de livegang van het klantportaal.\nNoem bij elke afspraak de bron: wat voor bron, de datum, en de afzender of het overleg.\nZeg ook wat je niet kon vinden, en waar bronnen elkaar tegenspreken.\nLaat vertrouwelijke zaken over personen buiten beschouwing.',
      answer: '- 2 oktober, overleg stuurgroep: livegang 1 december, onder voorbehoud van de testresultaten.\n- 18 oktober, mail van de projectleider: livegang verschoven naar 15 januari, omdat de koppeling met de facturatie later klaar is.\n\nTegenstrijdig: de mail van 18 oktober is nieuwer dan het besluit van de stuurgroep.\nNiet gevonden: een nieuw besluit van de stuurgroep over 15 januari.',
      note: 'Met bron en datum kun je zelf beoordelen wat de laatste stand is. Wat de AI niet vond, is net zo belangrijk als wat hij wel vond.',
    },
    checkHow: ['Open de genoemde bronnen: staat het er echt, en is dit de laatste stand?', '"Niet gevonden" is niet "bestaat niet". Wat kan de AI gemist hebben?', 'Kwam er iets mee dat niet voor dit doel bedoeld is? Dan hoort het ook niet in je antwoord.'],
  },
  {
    nr: 5, name: 'Koppelingen en agents', who: 'Een systeem haalt op, of voert zelf iets uit', copilot: 'Connectoren, agents, Copilot Studio',
    check: 'Wat gaat de koppeling doen, en wie keurt het goed?', risk: 'Te veel gegevens, en acties zonder dat iemand meekijkt.',
    intro: 'Een koppeling haalt automatisch gegevens uit andere systemen, of een agent voert zelf een taak uit. Wat er wordt opgehaald en gedaan, is vooraf ingesteld. Dat moet je dus vooraf goed afspreken.',
    weak: {
      prompt: 'Instructie voor de storingsagent:\nHaal bij elke melding alle klantgegevens en de volledige historie op het adres op.\nIs het modem offline, plan dan een monteur in.',
      answer: '(De agent plant voor Familie Peters een monteur in. Er is een storing in de straat, dus de monteur kan niets doen. Intussen gingen naam, telefoon en de historie van iedereen die ooit op het adres woonde, mee naar de AI.)',
      note: 'Niemand ziet het voordat het gebeurt. De agent haalt meer op dan nodig, en doet iets wat geld kost en de klant een dagdeel.',
    },
    strong: {
      prompt: 'Instructie voor de storingsagent:\nHaal alleen op: de laatste meting met tijd, de straatstatus en de laatste herstart.\nVolg de beslisboom en stel de volgende stap voor, met uitleg.\nPlan zelf niets in. Een medewerker keurt elke monteursafspraak goed.',
      answer: 'Voorstel: geen monteur. Er is een storing in de straat sinds 15:20 (ticket INC-2026-0398). Koppel de melding aan dit ticket.\nWacht op goedkeuring van een medewerker.',
      note: 'De koppeling haalt alleen op wat nodig is. De agent stelt voor, een mens beslist.',
    },
    checkHow: ['Welke gegevens haalt de koppeling op, en zijn die allemaal nodig?', 'Welke acties mag de agent zelf doen, en welke pas na goedkeuring?', 'Wie heeft dit afgesproken, en waar staat dat?'],
  },
];
