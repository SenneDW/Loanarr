/**
 * Plain-language explanations of mortgage jargon (user-facing, Dutch).
 * Used by the <Term> hovercard and the /begrippen page.
 */
export interface GlossaryEntry {
  term: string;
  /** One or two sentences, shown in the hovercard. */
  short: string;
  /** Optional extra detail, shown on the /begrippen page. */
  more?: string;
}

export const glossary = {
  quotiteit: {
    term: "Quotiteit",
    short:
      "Hoeveel procent van de woningprijs je leent. € 270.000 lenen voor een woning van € 300.000 is een quotiteit van 90 %.",
    more: "Banken lenen meestal tot 90 %. Boven 90 % kan het enkel voor een beperkt deel van hun leningen (regels van de Nationale Bank) en vaak tegen een hogere rente.",
  },
  marktrente: {
    term: "Marktrente",
    short:
      "De gemiddelde rente die kopers in België écht betalen op nieuwe woonleningen, na onderhandeling. Gepubliceerd door de Nationale Bank.",
  },
  tarieflijst: {
    term: "Tarieflijst",
    short:
      "Het officiële prijsblad van een bank met haar rentevoeten per looptijd. Dat is de vertrekprijs: na onderhandeling krijg je vaak minder.",
  },
  affichetarief: {
    term: "Affichetarief",
    short:
      "De rente die een bank publiek aankondigt, vóór onderhandeling of persoonlijke kortingen.",
  },
  nbb: {
    term: "NBB",
    short:
      "Nationale Bank van België. Verzamelt van alle banken de rentes op nieuwe leningen en bewaakt de regels voor hypotheken.",
  },
  kredietmakelaar: {
    term: "Kredietmakelaar",
    short:
      "Een tussenpersoon die je aanvraag bij meerdere banken indient en de beste voorwaarden zoekt. Vaak krijg je zo een scherpere rente.",
  },
  procentpunt: {
    term: "Procentpunt (pt)",
    short:
      "Het verschil tussen twee percentages. Van 3,50 % naar 3,62 % is +0,12 procentpunt (niet +0,12 %).",
  },
  rentevoet: {
    term: "Rentevoet",
    short:
      "Het percentage dat je per jaar betaalt om geld te lenen. Bij een vaste rentevoet blijft het de hele looptijd gelijk.",
  },
  looptijd: {
    term: "Looptijd",
    short:
      "Hoe lang je over het terugbetalen van je lening doet, meestal 20 tot 25 jaar voor een eerste woning.",
  },
  maandlast: {
    term: "Maandlast",
    short:
      "Wat je elke maand aan de bank terugbetaalt: een deel kapitaal plus interest.",
  },
  eigenMiddelen: {
    term: "Eigen middelen",
    short:
      "Het geld dat je zelf inbrengt (spaargeld, schenking). Daarmee betaal je de kosten en het deel van de prijs dat de bank niet leent.",
  },
  kapitaal: {
    term: "Kapitaal",
    short: "Het geleende bedrag zelf, zonder de interest.",
  },
  interest: {
    term: "Interest",
    short:
      "De prijs die je de bank betaalt voor het lenen: de rente, uitgedrukt in euro.",
  },
  vasteMensualiteiten: {
    term: "Vaste mensualiteiten",
    short:
      "Elke maand hetzelfde bedrag. In het begin betaal je vooral interest, op het einde vooral kapitaal.",
  },
  vasteKapitaalaflossing: {
    term: "Vaste kapitaalaflossing",
    short:
      "Elke maand evenveel kapitaal terug. Je maandlast start hoger en daalt; in totaal betaal je minder interest.",
  },
  registratierechten: {
    term: "Registratierechten",
    short:
      "De belasting die je aan het gewest betaalt als je een woning koopt. Voor je enige eigen woning: 2 % in Vlaanderen (3 % aangekondigd vanaf 2027), 3 % in Wallonië, 12,5 % met vrijstelling in Brussel.",
  },
  notarieleAkte: {
    term: "Notariële akte",
    short:
      "Het officiële contract bij de notaris waarmee je echt eigenaar wordt. Volgt 2 tot 4 maanden na het compromis.",
  },
  compromis: {
    term: "Compromis",
    short:
      "De voorlopige koopovereenkomst die je met de verkoper tekent. Daarna volgt de notariële akte.",
  },
  ereloon: {
    term: "Ereloon notaris",
    short:
      "Wat de notaris verdient. Het bedrag ligt wettelijk vast (een barema) en is bij elke notaris hetzelfde.",
  },
  administratieveKosten: {
    term: "Administratieve kosten",
    short:
      "Vast bedrag dat de notaris per akte aanrekent voor dossierbeheer (€ 855 excl. btw in 2026).",
  },
  kredietakte: {
    term: "Kredietakte",
    short:
      "De akte bij de notaris voor je lening. Hierin krijgt de bank haar zekerheid op je woning (inschrijving of mandaat).",
  },
  hypothecaireInschrijving: {
    term: "Hypothecaire inschrijving",
    short:
      "De bank krijgt meteen een hypotheek op je woning. Daarop betaal je 1 % registratierecht en 0,3 % hypotheekrecht.",
  },
  hypothecairMandaat: {
    term: "Hypothecair mandaat",
    short:
      "Je geeft de bank de toelating om later een hypotheek in te schrijven als het nodig is. Veel goedkoper dan een inschrijving.",
  },
  dossierkosten: {
    term: "Dossierkosten",
    short: "Wat de bank aanrekent om je lening op te maken, meestal € 300–500.",
  },
  schattingskosten: {
    term: "Schattingskosten",
    short:
      "De kost van een schatter die de waarde van de woning bepaalt voor de bank, meestal € 180–300.",
  },
  schuldratio: {
    term: "Schuldratio",
    short:
      "Welk deel van je netto inkomen naar je lening gaat. Banken willen meestal niet boven ongeveer een derde.",
  },
  schuldsaldoverzekering: {
    term: "Schuldsaldoverzekering",
    short:
      "Verzekering die (een deel van) je lening terugbetaalt als je overlijdt. Banken vragen ze bijna altijd.",
  },
  jkp: {
    term: "JKP",
    short:
      "Jaarlijks kostenpercentage: de rente plus alle verplichte kosten (dossier, verzekeringen…) in één percentage. Handig om offertes te vergelijken.",
  },
  epc: {
    term: "EPC",
    short:
      "Energieprestatiecertificaat: hoe zuinig een woning is. Een goed label geeft bij veel banken een kleine rentekorting.",
  },
  leefgeld: {
    term: "Leefgeld",
    short:
      "Wat er elke maand overblijft na je leningen, om van te leven. Banken willen dat dit niet te laag wordt (eigen interne normen per bank).",
  },
  buffer: {
    term: "Buffer",
    short:
      "Spaargeld dat je achter de hand houdt voor onverwachte kosten (een kapotte ketel, werkloosheid). Vaak 3 tot 6 maanden uitgaven.",
  },
  onroerendeVoorheffing: {
    term: "Onroerende voorheffing",
    short:
      "Jaarlijkse belasting die je als eigenaar betaalt op je woning. Afhankelijk van gemeente en woning, vaak € 600–1.500 per jaar.",
  },
  omslagpunt: {
    term: "Omslagpunt",
    short:
      "Het jaar waarin kopen voordeliger wordt dan huren: je woning (min je lening) is dan meer waard dan wat een huurder had kunnen beleggen.",
  },
  woonbonus: {
    term: "Woonbonus",
    short:
      "Vroegere belastingaftrek voor je woonlening. Bestaat niet meer voor nieuwe leningen: in Vlaanderen sinds 2020, in Wallonië en Brussel ook afgeschaft.",
  },
  enigeEigenWoning: {
    term: "Enige eigen woning",
    short:
      "Je koopt een woning om er zelf te wonen en je bezit geen andere woning. Dan geldt het lage tarief voor registratierechten.",
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof glossary;
