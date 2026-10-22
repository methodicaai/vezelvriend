// The systems participants get to know in step 3, before the first exercise.
// Add a system here and it appears on the page, with a link that opens it in a
// new tab for the participant's own customer. The link keys (key) are defined
// in /assets/mijnklant.js, which also rewrites the links in the exercises.
// Tasks are neutral on purpose: they never hint at what is wrong in the data.

export interface TourSystem { key: string; name: string; what: string; where: string; task: string; usedIn: string }

export const tour: TourSystem[] = [
  {
    key: 'klantbeeld', name: 'Klantbeeld: klantgegevens',
    what: 'Het scherm dat een medewerker van de klantenservice openhoudt tijdens een telefoongesprek. Op het tabblad Klantgegevens staan naam, adres, contract en contactgegevens.',
    where: 'Klantbeeld › tabblad Klantgegevens',
    task: 'Welk abonnement heeft je klant, en met welke snelheid?',
    usedIn: 'stap 4',
  },
  {
    key: 'modem', name: 'Modem controleren',
    what: 'Op het tabblad Techniek van het Klantbeeld zit de knop Modem controleren. Je ziet de laatste meting, de snelheid, de straatstatus en wanneer het modem voor het laatst op afstand is herstart. Onderaan staat alles ook als tekst om te kopiëren.',
    where: 'Klantbeeld › tabblad Techniek › Modem controleren',
    task: 'Wanneer was de laatste meting, en wat is de straatstatus?',
    usedIn: 'stap 4 en 8',
  },
  {
    key: 'historie', name: 'Klanthistorie op adres',
    what: 'Alle contacten op het adres van je klant: telefoon, mail en monteursbezoeken, met datum en onderwerp.',
    where: 'Klantbeeld › tabblad Klanthistorie op adres',
    task: 'Wat is het laatste contact op dit adres, en waar ging het over?',
    usedIn: 'stap 4',
  },
  {
    key: 'beslisboom', name: 'De beslisboom',
    what: 'De werkwijze van de klantenservice als een klant zegt: "mijn internet doet het niet". Vijf stappen; de eerste die past, bepaalt wat je doet.',
    where: 'Document van de klantenservice',
    task: 'Wat doe je volgens de beslisboom als er een storing in de straat is?',
    usedIn: 'stap 4, 8 en 9',
  },
  {
    key: 'klantsysteem', name: 'Klantsysteem',
    what: 'De lijst van alle klanten met contract en adres. Je zoekt op naam, adres, postcode of klantnummer. Met het scherm SQL stel je zelf vragen aan de database.',
    where: 'Klantsysteem › zoeken, of het scherm SQL',
    task: 'Zoek je klant op met het klantnummer. Wat laat het Klantsysteem over hem zien?',
    usedIn: 'stap 5 en 9',
  },
];
