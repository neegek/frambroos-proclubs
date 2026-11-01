// Spelersprofielen (docs/coach-logica.md §9, Sessie): wie de pro's zijn, hoe ze praten en wat ze zeggen.
// Dit is de bron voor verhalen en zinnen over spelers: nieuwe eigenschappen hier toevoegen (Jamal levert ze aan).
// Sleutel = accountnaam (zoals in DATA); in de app staat altijd de pro-naam (proName).
//
// quotes: per thema van de anekdote één cruijffiaanse uitspraak in de stem van de speler. De thema's leunen op:
//   schieten      "Je moet schieten, anders kun je niet scoren."
//   doorhebben    "Je gaat het pas zien als je het doorhebt."
//   nadeel        "Elk nadeel heb z'n voordeel."
//   nietVerliezen "Als je niet kunt winnen, moet je zorgen dat je niet verliest."
//   simpel        "Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen."
//   fout          "Voordat ik een fout maak, maak ik die fout niet."
//   bal           "Als wij de bal hebben, kunnen zij niet scoren."
//   italianen     "Italianen kunnen niet van je winnen, maar je kan wel van ze verliezen."
//   toeval        "Toeval is logisch."
// Geen hij of zij in deze teksten (CLAUDE.md); de achtergrond is voor ons, de quotes komen in de app.

const PERSONAS = {
  Neegek: {
    pro: 'Terry Yaki',
    achtergrond: 'Japanner die geen woord Nederlands of Engels spreekt.',
    stem: 'Alles komt eruit als verbasterd Nederlands of Engels zoals het in katakana klinkt, in romaji geschreven '
      + '(gōruden gēto burijji = golden gate bridge). Korte zinnen, lange klinkers met een streep.',
    quotes: {
      schieten: 'Nō shūto, nō gōru. Shūto… mēbī gōru. Beri rojikku.',
      doorhebben: 'Yū sī itto ōnrī wen yū andāsutando itto. Ai andāsutando. Ai sī.',
      nadeel: 'Eruku nādēru hebu zun fōrudēru. Sō.',
      nietVerliezen: 'Win dekinai? Den nō rūzu. Gērijkusupēru iz ōkē.',
      simpel: 'Futtobōru iz simpuru. Simpuru futtobōru iz beri beri hādo.',
      fout: 'Bifoā ai meiku misutēku, ai dōnto meiku misutēku.',
      bal: 'Wī habu bōru. Zei habu nō bōru. Zei habu nō gōru.',
      italianen: 'Itarian kan nō win yū. Bātto yū kan rūzu tsū Itarian.',
      toeval: 'Rakkī iz rojikaru. Tūfāru isu rōhisu.',
    },
  },
  'Highnis 023': {
    pro: 'Mo van der Kamp',
    achtergrond: 'Was een Nederlandse crimineel die geld witwaste; is in de gevangenis bekeerd tot de islam.',
    stem: 'Straattaal uit de stad, verwijzingen naar het oude leven (witwassen, recherche, de cel) en naar het nieuwe '
      + '(alhamdulillah, inshallah), altijd met respect voor het geloof. Rustig, een beetje wijs geworden.',
    quotes: {
      schieten: 'Wie niet schiet, krijgt ook geen strafblad. Maar ook geen goal. Ik kies nu voor de goal, alhamdulillah.',
      doorhebben: 'Je ziet het pas als je het doorhebt. Dat zei de recherche ook, maar toen was ik al drie jaar verder.',
      nadeel: 'Elk nadeel heb z\'n voordeel. Zonder die cel had ik nooit leren verdedigen.',
      nietVerliezen: 'Kun je niet winnen, dan zorg je dat niemand ziet dat je verliest. Vroeger noemden we dat boekhouden.',
      simpel: 'Voetbal is simpel: bal erin, schoon eruit. Nee, alleen bal erin. Oude gewoonte, broer.',
      fout: 'Een fout die niemand ziet, is ook een fout. Er kijkt altijd Iemand mee, dus ik maak hem gewoon niet.',
      bal: 'Zolang wij de bal hebben, kunnen zij niks bewijzen.',
      italianen: 'Van Italianen verlies je niet. Je doet zaken met ze, of je doet het niet.',
      toeval: 'Toeval bestaat niet, broer. Alles staat al geschreven, inshallah.',
    },
  },
  'GoodTimes 023': {
    pro: 'J. Wheatley',
    achtergrond: 'Gewone Indonesische man.',
    stem: 'Kalm en vriendelijk, vergelijkt voetbal met het dagelijks leven in Indonesië: rijst, sambal, familie, '
      + 'het verkeer in Jakarta. Af en toe een woord Indonesisch (pelan-pelan = rustig aan).',
    quotes: {
      schieten: 'Bij ons zeggen ze: wie niet schiet, eet geen nasi. Dus ik schiet.',
      doorhebben: 'Het is net als sambal: je merkt het pas als het al te laat is.',
      nadeel: 'Elk nadeel heeft z\'n voordeel. Regen is slecht voor het veld, maar goed voor de rijst.',
      nietVerliezen: 'Kun je niet winnen, dan speel je gelijk. Mijn moeder noemt dat beleefd zijn.',
      simpel: 'Voetbal is als rijst koken. Iedereen kan het, bijna niemand doet het goed.',
      fout: 'Een fout maken kan altijd nog. Eerst even geduld, pelan-pelan.',
      bal: 'Hebben wij de bal, dan hebben zij hem niet. Pelan-pelan, rustig aan.',
      italianen: 'Van Italianen win je niet, je verliest alleen langzamer. Net als van het verkeer in Jakarta.',
      toeval: 'Toeval is logisch. In Jakarta staat ook niemand toevallig in de file.',
    },
  },
  'Xero 023': {
    pro: 'Bennie',
    achtergrond: 'Een beetje onzeker door een broer die heel goed is, maar op een mooi pad van groei: steeds meer zichzelf.',
    stem: 'Begint vaak bij de broer en eindigt bij zichzelf. Twijfelt hardop, maar de conclusie wordt steeds zekerder.',
    quotes: {
      schieten: 'Mijn broer had hem eerder geschoten. Maar ik heb hem geschoten. Dat telt ook.',
      doorhebben: 'Je ziet het pas als je het doorhebt. Ik heb het nu door: ik hoef mijn broer niet te zijn.',
      nadeel: 'Elk nadeel heb z\'n voordeel. Niemand verwacht iets van het broertje, dus niemand dekt me.',
      nietVerliezen: 'Als je niet kunt winnen, moet je niet verliezen. Mijn broer wint gewoon, maar ik leer tenminste iets.',
      simpel: 'Voetbal is simpel. Dat zegt mijn broer altijd. Vanavond geloofde ik het voor het eerst.',
      fout: 'Vroeger maakte ik een fout en dacht ik aan mijn broer. Nu maak ik die fout gewoon niet.',
      bal: 'Als ik de bal heb, kan mijn broer hem niet hebben. Klein begin, maar het is een begin.',
      italianen: 'Mijn broer zegt dat je van Italianen niet kunt winnen. Ik ga het toch proberen.',
      toeval: 'Was het toeval? Volgens mij niet meer. Toeval is logisch.',
    },
  },
  // Nog zonder achtergrond: neutrale cruijffiaanse zinnen (GENERIC) tot Jamal er een geeft.
  Konijnenlover22: { pro: 'Petra Selie', achtergrond: null, stem: null, quotes: null },
  'KFH Guip 023': { pro: 'G. Snoek', achtergrond: null, stem: null, quotes: null },
};

const PERSONA_GENERIC = {
  schieten: 'Niet schieten is altijd mis. Schieten is minder vaak mis.',
  doorhebben: 'Je ziet het pas als je het ziet. Daarvoor zie je het niet.',
  nadeel: 'Elk nadeel heb z\'n voordeel. Je moet alleen weten welk.',
  nietVerliezen: 'Als je niet wint, moet je zorgen dat je ook niet verliest. Dan heb je gelijk.',
  simpel: 'Simpel spelen is het moeilijkste, dus speel je het simpel.',
  fout: 'Een fout die je niet maakt, hoef je ook niet goed te maken.',
  bal: 'Wij de bal, zij niet. Daar begint alles.',
  italianen: 'Van sommige ploegen win je niet. Je verliest alleen minder.',
  toeval: 'Toeval is als je het niet zag aankomen. Wij zagen het aankomen.',
};

// De quote van een speler bij een thema; zonder eigen quote een neutrale.
const personaQuote = (name, theme) => PERSONAS[name]?.quotes?.[theme] || PERSONA_GENERIC[theme] || PERSONA_GENERIC.simpel;
