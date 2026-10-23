# Archetypes in FC27: referentie en bronnen

De data staat in `public/archetypes.js`. Dit document zegt waar elk gegeven vandaan komt en hoe actueel het is.
Controleer bij een nieuwe EA-update eerst de officiële patch notes en werk dan beide bestanden bij.

## Wat er is, met bron

| Gegeven | Bron | Datum | Zekerheid |
|---|---|---|---|
| Archetypes en hun linie | [EA, The Grounds Developer Archetypes Update](https://www.ea.com/games/ea-sports-fc/fc-27/news/fc-27-the-grounds-developer-archetypes-update) | 19 okt 2026 | officieel |
| Welke attributen duurder of goedkoper werden per archetype (`patch`) | idem, actief vanaf 22 okt 2026 | 22 okt 2026 | officieel, alleen de richting |
| `archetypeid` 1–13 → naam | [MeelanFC/FC-27-ClubsXI, docs/03-ea-api.md](https://github.com/MeelanFC/FC-27-ClubsXI) | 2026 | bevestigd door spelers |
| Prijsklasse per attribuut per archetype (`tiers`) | [Pro Clubs HQ, AP costs](https://proclubshq.com/blog/pro-clubs-attribute-upgrade-costs/) | 15 okt 2026 | community, **van vóór de patch** |
| AP-prijs per stap (`AP_COST`) | idem | 15 okt 2026 | community |
| AP-budget per level, levelcap, PlayStyle-slots (`LEVELS`) | [Pro Clubs HQ, level rewards](https://proclubshq.com/blog/pro-clubs-level-rewards/) | 20 okt 2026 | community |
| Signature PlayStyle per archetype | [Pro Clubs HQ, FC 27 archetypes](https://proclubshq.com/blog/fc27-archetypes/) | 15 okt 2026 | community |
| Masteries per archetype (level 10 en 30) | [Pro Clubs HQ, masteries](https://proclubshq.com/blog/fc27-masteries-explained/) | 15 okt 2026 | community; het attribuut dat op level 30 nog +1 krijgt is niet bij elk archetype zeker |

## Wat er niet is

- Startwaarden en maxima per attribuut per archetype: online alleen voor een paar archetypes compleet. Niet opgenomen.
- Exacte nieuwe prijsklassen na 22 oktober: EA geeft alleen welke attributen duurder of goedkoper werden. De app toont
  daarom de oude klasse met de richting van de patch erbij ("was goedkoop, sinds 22 okt duurder").
- AP per afzonderlijk level: alleen tussenstanden (100 op level 1, 224 op 10, 397 op 20, 674 op 30, 962 op 40).

## Tegenstrijdig, nog niet bevestigd

- [eafcclubs.com](https://eafcclubs.com/) meldt in zijn changelog (v2.1.0, gezien 23 okt 2026) dat levels in FC 27 tot
  **55** gaan, met een tweede signature PlayStyle, een vierde PlayStyle-slot en nieuwe masteries op level 55. Andere
  bronnen noemen op dat moment nog level 40. Niet overgenomen tot EA of een tweede bron het bevestigt.
- Zo'n builder bouwt zijn data met de hand op (startwaarden, maxima en prijsklassen per archetype, eisen voor
  PlayStyles) uit het spel zelf, EA's nieuwsberichten en eigen tests; er is geen EA-API voor builds of AP-kosten.

## Kernregels

- 13 archetypes, allemaal vanaf het begin beschikbaar; elk levelt apart met AXP tot level 40 (962 AP).
  Level 50 wordt verwacht vanaf seizoen 2.
- De prijs per +1 stijgt met de waarde waar je naartoe gaat: in de goedkoopste klasse 1 AP tot 69 en 35 AP voor de stap
  naar 99; in de duurste klasse 2 AP tot 60 en 50 AP naar 99. Skillmoves en weak foot gaan van hetzelfde budget af.
- Attributen kunnen stap voor stap worden teruggezet; punten komen terug.
- PlayStyle-slots op level 5, 15 en 40, plus de signature PlayStyle (goud op level 20).
- Masteries: +1 op twee attributen op level 10, nog +1 op één daarvan op level 30. Permanent en voor alle archetypes.
- Op 22 oktober 2026 zijn alle AP van archetypes teruggezet om opnieuw te verdelen; levels en totale AP bleven gelijk.
