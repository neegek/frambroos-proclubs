# Codeboek eventcodes (`match_event_aggregate`)

Elke speler-wedstrijd uit `/clubs/matches` heeft vier velden `match_event_aggregate_0` t/m `_3`: een lijst
`code:aantal`, gescheiden door komma's, lexicografisch gesorteerd op code. **EA kapt `_0` af op ~250 tekens en
zet de rest in `_1` (en in theorie `_2`/`_3`).** Bij 74 van onze 166 rijen stond er iets in `_1`; codes die
alfabetisch achteraan komen (30–39, 4–9, 97, 99) ontbraken daardoor in de kolom `event_aggregate`. Sinds commit van dit
codeboek voegt `src/collect.js` de vier velden samen en vult hij oude rijen aan vanuit `matches.raw`.

Een code die ontbreekt betekent 0. Een lege string in alle vier de velden betekent "onbekend" (komt voor bij
vriendschappelijke wedstrijden en soms bij competitierijen; niet als 0 lezen).

## Hoe dit codeboek tot stand kwam

1. **Eigen data:** `node src/decode-events.js` leest alle 166 speler-wedstrijden (beide clubs, 18 wedstrijden) uit de ruwe
   JSON, telt per code, en toetst correlatie (Pearson r), exacte gelijkheid en ≤-relaties tegen EA's benoemde velden
   (goals, assists, shots, pass_attempts, passes_made, tackle_attempts, tackles_made, red_cards, mom, cleansheets,
   seconds_played), afgeleiden daarvan, positie, teamuitslag en tegen de andere codes (a = b, a ≤ b, a = b + c).
   Met `--json pad` schrijft het alles weg; met `--code N` zie je één code.
2. **Community-bronnen** (alle onofficieel; EA documenteert niets):
   - **[Interactive-63]** [eafc-pro-clubs-api-research](https://github.com/Interactive-63/eafc-pro-clubs-api-research) —
     codeboek op basis van 51.395 FC 27-rijen, met tabellen "confirmed", "partial" en "exploratory". Laatst gezien
     2026-10-18.
   - **[CapUnc, issue 1]** [issue #1 in die repo](https://github.com/Interactive-63/eafc-pro-clubs-api-research/issues/1) —
     aanvullingen op basis van 27.429 en later 67.399 wedstrijden, deels gecontroleerd tegen het in-game
     eindscherm. Alleen voorstellen van de auteur; de repo-eigenaar heeft ze nog niet overgenomen.
     [Issue #4](https://github.com/Interactive-63/eafc-pro-clubs-api-research/issues/4) meldt dat 218 = 14 + 19 + 47 + 167.
   - **[ClubsXI]** [MeelanFC/FC-27-ClubsXI, docs/04-hidden-counters.md](https://github.com/MeelanFC/FC-27-ClubsXI/blob/main/docs/04-hidden-counters.md) —
     onafhankelijke decodering via tracker-screenshots en foto's van het in-game Match Facts-scherm.
   - [1erkandogan/fc27-clubs-api](https://github.com/1erkandogan/fc27-clubs-api) — Python-client die de
     "confirmed"-tabel van Interactive-63 implementeert (`src/fc_clubs_api/events.py`); geen eigen bewijs, wel de
     waarneming dat EA's `passesmade` buitenspelpasses (153) meetelt en 215 niet.

Waar bronnen elkaar tegenspreken staat dat erbij. Zekerheidsgraad:

- **zeker** — exact gelijk aan een EA-veld of een gelabeld scherm, in onze data én elders;
- **waarschijnlijk** — sterk statistisch bewijs of community-bevestiging, hier niet exact toetsbaar (bv. geen keepers, 2 verdedigersrijen);
- **mogelijk** — hint of zwak bewijs;
- **onbekend** — alleen frequentie.

Kolom "gem." = gemiddeld aantal per speler-wedstrijd in onze data (aantal rijen waarin de code voorkomt / 166).
Bedenk dat onze rijen vrijwel alleen middenvelders en aanvallers zijn; keepers zijn AI en staan niet in de data.

## Direct bruikbaar voor "aan de bal komen"

EA levert geen balcontacten. De beste benadering uit de codes, in `src/events.js` als `ball_actions`:
passpogingen (215 + 216 + 153) + schoten (217 + 218) + geslaagde dribbels (174) + balwinst (108 + 109 + 110).
Daarnaast zijn relevant: balcarries (97), tegenstanders uitgespeeld (112), balverlies per veldderde (105–107),
steekpasses (152), passes ineens (143) en de feedback-codes 175/176/177/182 die samen ~90 % van de passes beoordelen.

## Passen en voorzetten

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 8 | `line_breaks_around` | Verdedigingslinie gebroken (omheen) / headed pass | mogelijk | 0.97 (93/166) | ≤ 143 in 100 % (hier) en 99,8 % ([CapUnc, issue 1], "mogelijk kopballen"); [ClubsXI]: "linie gebroken (omheen)", in-game scherm exact. Tegenstrijdig. |
| 24 | `passes_completed_short` | Geslaagde korte passes | zeker | 7.02 (163/166) | onderdeel van 215 (lengtesom r 1,00). [Interactive-63] [ClubsXI] |
| 25 | `passes_failed_short` | Mislukte korte passes | zeker | 2.30 (139/166) | onderdeel van 216 (lengtesom r 0,99). [Interactive-63] [ClubsXI] |
| 26 | `passes_completed_medium` | Geslaagde middellange passes | zeker | 4.07 (157/166) | zie 24. |
| 27 | `passes_failed_medium` | Mislukte middellange passes | zeker | 0.92 (99/166) | zie 25. |
| 28 | `passes_completed_long` | Geslaagde lange passes | zeker | 0.89 (85/166) | zie 24. |
| 29 | `passes_failed_long` | Mislukte lange passes | zeker | 0.72 (71/166) | zie 25. |
| 30 | `passes_completed_forward` | Geslaagde passes vooruit | zeker | 6.63 (162/166) | onderdeel van 215, r 0,99 op de som. [Interactive-63] [ClubsXI] |
| 31 | `passes_failed_forward` | Mislukte passes vooruit | zeker | 3.17 (151/166) | onderdeel van 216, r 0,99 op de som; r 0,61 met mislukte passes. [Interactive-63] [ClubsXI] |
| 32 | `passes_completed_backward` | Geslaagde passes achteruit | zeker | 2.73 (143/166) | zie 30. |
| 33 | `passes_failed_backward` | Mislukte passes achteruit | zeker | 0.33 (46/166) | zie 31. |
| 34 | `passes_completed_sideways` | Geslaagde passes opzij | zeker | 2.87 (150/166) | zie 30. |
| 35 | `passes_failed_sideways` | Mislukte passes opzij | zeker | 0.94 (87/166) | zie 31. |
| 36 | `crosses_completed` | Geslaagde voorzetten | zeker | 0.25 (32/166) | 36 + 37 = 157 in 98,8 % (r 1,00). [Interactive-63] |
| 37 | `crosses_failed` | Mislukte voorzetten | zeker | 0.52 (50/166) | 36 + 37 = 157 in 98,8 %; altijd ≤ 216. [Interactive-63] |
| 143 | `first_time_passes` | Passes ineens (first-time) | waarschijnlijk | 3.28 (154/166) | altijd ≤ passpogingen (100 %). [Interactive-63] [ClubsXI] (past bij in-game scherm). |
| 144 | `switches_of_play` | Spelverleggingen | waarschijnlijk | 0.14 (21/166) | [Interactive-63]; hier 21 rijen. |
| 147 | `flair_passes` | Fancy/flair passes | waarschijnlijk | 0.17 (22/166) | [Interactive-63]; hier 22 rijen. |
| 150 | `tiki_taka_passes` | Tiki-taka-passes (playstyle) | mogelijk | 0.02 (3/166) | [CapUnc, issue 1]: ≤ 24 in 99,95 % van 28.585 rijen. Hier 3 rijen. |
| 151 | `bad_passes` | Slechte passes (hospitaalballen) | mogelijk | 1.17 (104/166) | [Interactive-63]: 4/4 wedstrijden; label onzeker. Hier 1,17 per rij, altijd ≤ 216. |
| 152 | `through_balls` | Geslaagde steekpasses | waarschijnlijk | 3.05 (140/166) | ≥ 118 in 100 %. [Interactive-63]; [ClubsXI]: gelijk aan in-game "through passes". |
| 153 | `passes_offside` | Passes die buitenspel opleverden | waarschijnlijk | 0.23 (33/166) | passes_made = 215 + 153 verbetert van 71 % naar 88,6 % exact: EA's eigen telling bevat buitenspelpasses, 215 niet. [Interactive-63] |
| 157 | `crosses_attempted` | Voorzetten (pogingen) | zeker | 0.79 (62/166) | = 36 + 37 in 98,8 %. [Interactive-63] noemt het "crosses attempted (open play)", [ClubsXI] "set-piece passes"; de som-identiteit hier steunt [Interactive-63]. |
| 184 | `line_breaks_through` | Verdedigingslinie gebroken (erdoorheen) | mogelijk | 0.17 (25/166) | [ClubsXI]: "linie gebroken (erdoorheen)", in-game scherm exact. Hier 25 rijen. |
| 215 | `passes_completed` | Geslaagde passes | zeker | 12.04 (163/166) | = passes_made in 71 %, = passes_made − 153 in 88,6 %; richting 30+32+34 ≤ 215 in 97,6 %, lengte 24+26+28+36 ≤ 215 in 97,6 %. [Interactive-63] [ClubsXI] |
| 216 | `passes_failed` | Mislukte passes | zeker | 4.57 (156/166) | = pass_attempts − passes_made in 78,9 % (r 0,74); 31+33+35 = 216 in 88 %. [Interactive-63] |

## Schieten en scoren

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 11 | `assists` | Assists | zeker | 0.32 (43/166) | exact = assists in 98,2 %, r 0,93. [Interactive-63] [ClubsXI] |
| 12 | `goals_tag_12` | Doelpunt-techniek (onbekend welke) | mogelijk | 0.12 (20/166) | altijd ≤ 214 (100 %); [Interactive-63]: overlapt met 124/128/137 tot 85,8 % van alle goals. |
| 13 | `shots_on_target_inside_box` | Schoten op doel binnen de zestien | zeker | 0.73 (76/166) | onderdeel van 217 (100 %). [Interactive-63] [ClubsXI] (13 + 14 = schoten in de zestien, in-game scherm) |
| 14 | `shots_off_target_inside_box` | Schoten naast binnen de zestien | zeker | 0.33 (41/166) | onderdeel van 218 (97 %). [Interactive-63] [ClubsXI] |
| 16 | `shots_type_16` | Schottype (finesse of misser in de zestien) | mogelijk | 0.04 (6/166) | altijd ≤ 14 (100 %); [ClubsXI] zegt "finesse shots" (2/2 wedstrijden), [CapUnc, issue 1] zegt "misser binnen de zestien". |
| 18 | `shots_on_target_outside_box` | Schoten op doel buiten de zestien | zeker | 0.24 (30/166) | onderdeel van 217 (100 %). [Interactive-63] |
| 19 | `shots_off_target_outside_box` | Schoten naast buiten de zestien | zeker | 0.17 (27/166) | onderdeel van 218 (97 %). [Interactive-63] |
| 21 | `shots_type_21` | Schottype (power shot?) | mogelijk | 0.03 (5/166) | altijd ≤ 218 (100 %); [CapUnc, issue 1]: één scherm met 2 power shots = 21:2. |
| 115 | `second_assists` | Tweede assists (pre-assists) | waarschijnlijk | 0.17 (26/166) | komt alleen voor bij spelers met passes vlak voor een goal; scherm-gelabeld door [CapUnc, issue 1] en [ClubsXI]. |
| 117 | `assists_corner` | Assists uit een corner | mogelijk | 0.02 (3/166) | [CapUnc, issue 1]: 98,7 % van 4.116 rijen heeft een assist, 99,4 % nam een corner. Hier 3 rijen. |
| 118 | `assists_through_ball` | Assists uit een steekpass | waarschijnlijk | 0.16 (22/166) | altijd ≤ 11 (100 %), altijd ≤ 152 (100 %). [CapUnc, issue 1]: 100 % van 23.845 rijen heeft ook een steekpass. |
| 123 | `goals_chip` | Doelpunten met een lob | waarschijnlijk | 0.05 (7/166) | [Interactive-63] (~99 % precisie); hier 7 rijen, altijd ≤ 214. |
| 125 | `goals_header` | Kopdoelpunten | mogelijk | 0.01 (2/166) | [CapUnc, issue 1]: 89,8 % van de 125-goals heeft ook een gewonnen luchtduel (basis 42,5 %). Hier 1 rij. |
| 128 | `goals_first_time` | Doelpunten ineens | waarschijnlijk | 0.07 (10/166) | altijd ≤ 214 (100 %). [Interactive-63] |
| 131 | `goals_weak_foot` | Doelpunten met de zwakke voet | waarschijnlijk | 0.17 (27/166) | altijd ≤ 214 (100 %), r 0,64 met goals. [Interactive-63] |
| 136 | `goals_off_post` | Doelpunten via de paal | waarschijnlijk | 0.01 (2/166) | [Interactive-63]; hier niet gezien. |
| 202 | `shots_saved` | Schoten gered door de keeper | waarschijnlijk | 0.49 (54/166) | 214 + 202 ≤ 217 in 89 %, exact in 75 %; r 0,88 met 217. [Interactive-63] zegt "shots saved"; [ClubsXI] zegt "schoten op de korte hoek". Onze data past beter bij "gered". |
| 203 | `penalties_taken` | Genomen strafschoppen | waarschijnlijk | 0.03 (5/166) | [CapUnc, issue 1]: handmatig logboek van 49 wedstrijden klopt 1-op-1; ~80 % benutting. Hier 5 rijen. |
| 214 | `goals` | Doelpunten | zeker | 0.43 (53/166) | exact = goals in 99,4 %, r 0,99. [Interactive-63] [ClubsXI] |
| 217 | `shots_on_target` | Schoten op doel (incl. geblokt) | zeker | 0.98 (88/166) | 13 + 18 = 217 in 100 %; 217 + 218 = shots in 95,2 % (r 0,95). [Interactive-63] [ClubsXI] |
| 218 | `shots_off_target` | Schoten naast | zeker | 0.52 (64/166) | 14 + 19 = 218 in 97,0 % (rest: codes 47/167, issue 4). [Interactive-63] |
| 238 | `goals_outside_box_a` | Doelpunten van buiten de zestien (afstandsband a) | mogelijk | 0.04 (6/166) | [CapUnc, issue 1]: vuurt in 90,6 % van de enkel-goal-rijen met alleen schoten van buiten de zestien, 0,2 % bij alleen binnen. Hier 6 rijen. |
| 239 | `goals_outside_box_b` | Doelpunten van buiten de zestien (afstandsband b) | mogelijk | 0.02 (3/166) | zie 238; 238 en 239 nooit samen in enkel-goal-rijen ([CapUnc, issue 1]). Hier 3 rijen. |

## Dribbelen

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 38 | `skill_move_beats` | Uitgespeeld met een skill move | waarschijnlijk | 0.13 (15/166) | altijd ≤ 112 en ≤ 119 (100 %). [Interactive-63] [ClubsXI] |
| 97 | `ball_carries` | Balcarries (dribbles carried) | waarschijnlijk | 9.63 (162/166) | [Interactive-63] noemt het "dribbles carried". Hier 9,6 per rij; 112 ≤ 97 altijd. Let op: valt vrijwel altijd in _1 (afkapping). |
| 112 | `players_beaten` | Tegenstanders uitgespeeld (incl. skill moves) | waarschijnlijk | 1.87 (117/166) | 38 ≤ 112 en 119 ≤ 112 in 100 %. [Interactive-63] |
| 119 | `beats_type_119` | Uitspeel-type (omvat alle skill-move-beats) | mogelijk | 0.18 (16/166) | 38 ≤ 119 ≤ 112 in 100 % (hier en [CapUnc, issue 1]: 89.754 rijen). |
| 174 | `dribbles_completed` | Geslaagde dribbels | waarschijnlijk | 13.18 (163/166) | [ClubsXI]: tracker-screenshots 34/36 exact; [CapUnc, issue 1]: in-game scherm 8/8. Hier 13,2 per rij, 112 ≤ 174 altijd. |
| 211 | `beats_type_211` | Uitspeel-type (onbekend) | mogelijk | 0.13 (21/166) | ≤ 112 in 100 % (hier) en 99,97 % ([CapUnc, issue 1]). |

## Verdedigen

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 0 | `tackles_won_alt` | Gewonnen tackles (variant, ≤ 164) | waarschijnlijk | 0.87 (96/166) | ≤ 164 in 100 %, = 164 in 96,4 %; = tackles_made in 86 %. [Interactive-63] noemt 0 "tackles won" en 164 "clean tackles"; in onze data is 164 de ruimere. |
| 1 | `tackles_lost` | Verloren tackles (deel van de mislukte pogingen) | waarschijnlijk | 2.26 (131/166) | r 0,85 met tackle_attempts − tackles_made, maar gemiddeld 2,3 tegen 3,7 mislukte pogingen: 1 dekt niet alles. [Interactive-63] |
| 5 | `blocks` | Blocks | waarschijnlijk | 0.06 (9/166) | [CapUnc, issue 1]: in-game "Blocks" 8/8 exact (één wedstrijd); [ClubsXI]: 3 rijen. Hier 9 rijen. |
| 6 | `interceptions` | Onderscheppingen | waarschijnlijk | 1.67 (129/166) | [ClubsXI]: tracker-screenshots 22 rijen + in-game scherm exact; [CapUnc, issue 1]: 8/8. Hier 1,7 per rij. |
| 9 | `clearances` | Wegwerkballen | mogelijk | 0.08 (10/166) | [ClubsXI]: tracker-screenshots 6 rijen. Hier 10 rijen, vooral verdedigers. |
| 120 | `sliding_tackles_won_dup` | Kopie van 230 | zeker | 0.12 (19/166) | = 230 in 99,4 % (r 0,98). [CapUnc, issue 1] |
| 121 | `standing_tackles_won_dup` | Kopie van 229 | zeker | 0.80 (88/166) | = 229 in 99,4 % (r 1,00). [Interactive-63] (98,5 %). |
| 156 | `crosses_blocked` | Geblokte voorzetten | waarschijnlijk | 0.01 (1/166) | [Interactive-63]; hier niet gezien. |
| 158 | `dispossessions` | Tegenstander van de bal gezet | waarschijnlijk | 0.34 (47/166) | ≤ balwinst (108+109+110) in 90 %. [Interactive-63] |
| 162 | `tackles_type_162` | Tackle-subtype (≤ 164) | mogelijk | 0.07 (10/166) | ≤ 164 in 100 % (hier) en 99,8 % ([CapUnc, issue 1]). |
| 163 | `tackles_dangerous` | Gevaarlijke/mislukte tackles | waarschijnlijk | 1.06 (100/166) | r 0,72 met mislukte tackles; 78,7 % zonder overtreding ([CapUnc, issue 1]). [Interactive-63] noemt het "dangerous tackles". |
| 164 | `tackles_won` | Gewonnen tackles | zeker | 0.92 (97/166) | = tackles_made in 89,8 % (r 0,78); = 229 + 230 in 98,8 %. [CapUnc, issue 1]: sommen over 185k rijen gelijk. [ClubsXI]: 89 % van 6.671 rijen. |
| 166 | `sliding_tackles_type_166` | Sliding-subtype (≤ 230) | mogelijk | 0.10 (17/166) | ≤ 120 in 100 %, = 120 in 98,8 %. [CapUnc, issue 1]: vuurt nooit zonder 120. |
| 229 | `standing_tackles_won` | Gewonnen staande tackles | zeker | 0.79 (87/166) | 121 = 229 in 99,4 %; 229 + 230 = 164. [Interactive-63] [CapUnc, issue 1] (in-game scherm 8/8). |
| 230 | `sliding_tackles_won` | Gewonnen slidings | zeker | 0.13 (20/166) | 120 = 230 in 99,4 %. [Interactive-63] [CapUnc, issue 1] (in-game scherm 8/8). |
| 265 | `aerial_duels_won_attacking` | Gewonnen luchtduels (aanvallend) | waarschijnlijk | 1.00 (77/166) | [Interactive-63]; [CapUnc, issue 1] gebruikt het om kopgoals te onderbouwen. Hier 1,0 per rij, meer bij aanvallers. |
| 266 | `aerial_duels_won_defending` | Gewonnen luchtduels (verdedigend) | waarschijnlijk | 0.42 (50/166) | [Interactive-63]; hier 0,4 per rij. |

## Balbezit (per derde van het veld)

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 105 | `possession_lost_def_third` | Balverlies op eigen helft (verdedigend derde) | waarschijnlijk | 0.25 (36/166) | [Interactive-63]; [ClubsXI]: teamtotalen gelijk in 4/4 wedstrijden (in-game scherm). [CapUnc, issue 1]: per speler slechts 4/8. |
| 106 | `possession_lost_mid_third` | Balverlies op het middenveld | waarschijnlijk | 1.15 (98/166) | zie 105. |
| 107 | `possession_lost_att_third` | Balverlies op de helft van de tegenstander | waarschijnlijk | 1.37 (101/166) | zie 105. |
| 108 | `possession_won_def_third` | Balwinst op eigen helft (verdedigend derde) | waarschijnlijk | 0.46 (54/166) | zie 105. |
| 109 | `possession_won_mid_third` | Balwinst op het middenveld | waarschijnlijk | 0.54 (69/166) | zie 105. |
| 110 | `possession_won_att_third` | Balwinst op de helft van de tegenstander | waarschijnlijk | 0.22 (34/166) | zie 105. |

## Overtredingen en spelhervattingen

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 2 | `fouls_conceded` | Overtredingen (buiten eigen verdedigend derde) | waarschijnlijk | 0.09 (13/166) | 171 = 2 + 3 in 96,4 %; 95 ≤ 2 + 3 in 100 %. [Interactive-63] [ClubsXI] |
| 3 | `fouls_conceded_def_third` | Overtredingen in het eigen verdedigend derde | waarschijnlijk | 0.13 (18/166) | 94 ≤ 3 in 100 %; [ClubsXI]: verdedigers 0,14 per wedstrijd tegen 0,03. [Interactive-63] |
| 4 | `fouls_won` | Overtredingen tegen (vrije trappen gewonnen) | waarschijnlijk | 0.31 (43/166) | [ClubsXI]: in-game scherm exact, r 0,43 met overtredingen van de tegenstander. [Interactive-63] |
| 10 | `corners_conceded` | Corners weggegeven (of: linie gebroken met een hoge bal) | mogelijk | 0.01 (1/166) | [Interactive-63]: corners weggegeven; [ClubsXI]: "verdedigingslinie gebroken met een hoge bal" (in-game scherm exact). Tegenstrijdig; hier 2 rijen. |
| 94 | `penalties_conceded` | Strafschoppen weggegeven | waarschijnlijk | 0.02 (3/166) | = red_cards in 98,8 % (r 0,66), ≤ 3 altijd. [Interactive-63] zegt "penalties conceded"; [ClubsXI]: nooit meer dan code 3 (80/80). Overlap met rood is logisch (noodrem). |
| 95 | `yellow_cards` | Gele kaarten (direct) | waarschijnlijk | 0.14 (19/166) | ≤ overtredingen (100 %); r 0,62 met red_cards (tweede geel). [Interactive-63] [ClubsXI] |
| 96 | `red_card_trigger` | Rode kaart / zware overtreding | mogelijk | 0 (0/166) | [Interactive-63]: 82,7 % precisie, 16,6 % dekking; hier niet gezien. |
| 104 | `offsides` | Buitenspel gestaan | waarschijnlijk | 0.07 (10/166) | [Interactive-63]: aanwezigheid klopt, aantal vaak te laag; [ClubsXI]: aanvallers 0,17, verdedigers 0,00. |
| 145 | `corners_taken` | Genomen corners | waarschijnlijk | 0.40 (28/166) | [ClubsXI]: in-game scherm exact; [CapUnc, issue 1]: 99,4 % van de corner-assists. [Interactive-63] |
| 171 | `free_kicks_conceded` | Vrije trappen weggegeven (= 2 + 3) | zeker | 0.18 (24/166) | = 2 + 3 in 96,4 % (r 0,93). [Interactive-63] noemt het "free kicks for bad tackles"; de som-identiteit maakt "weggegeven vrije trappen" het logische label. |
| 213 | `yellow_cards_delayed` | Gele kaarten na voordeel | waarschijnlijk | 0.02 (3/166) | [Interactive-63]; hier 3 rijen. |

## Positiespel

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 99 | `out_of_position_1` | Uit positie, ernst 1/5 | waarschijnlijk | 0.21 (35/166) | onderdeel van 219. [Interactive-63] |
| 100 | `out_of_position_2` | Uit positie, ernst 2/5 | waarschijnlijk | 1.04 (99/166) | zie 99. |
| 101 | `out_of_position_3` | Uit positie, ernst 3/5 | waarschijnlijk | 2.53 (112/166) | zie 99. |
| 102 | `out_of_position_4` | Uit positie, ernst 4/5 | waarschijnlijk | 1.75 (49/166) | zie 99. |
| 103 | `out_of_position_5` | Uit positie, ernst 5/5 | waarschijnlijk | 0.38 (7/166) | zie 99. |
| 111 | `in_position` | Goed gepositioneerd (feedback) | waarschijnlijk | 15.19 (160/166) | 15,2 per rij, de frequentste code. [Interactive-63]: "in position"-feedback; [ClubsXI]: niet balbezit. Hier geen correlatie met benoemde velden, verdedigers hoogst (21,5). |
| 219 | `out_of_position` | Uit positie (totaal) | zeker | 5.90 (144/166) | = 99+100+101+102+103 in 100 %. [Interactive-63] (51.395 rijen) [ClubsXI] |

## Wedstrijdfeedback (de meldingen rechtsboven in beeld)

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 175 | `fb_no_good_option` | Feedback: geen goede optie | waarschijnlijk | 9.92 (163/166) | [Interactive-63]; [CapUnc, issue 1]: 175+176+177+182 = 91,5 % van passattempts; aandeel goed/best voorspelt de winnaar in 63,5 %. |
| 176 | `fb_good_option` | Feedback: goede optie gekozen | waarschijnlijk | 3.61 (158/166) | zie 175. |
| 177 | `fb_best_option` | Feedback: beste optie gekozen | waarschijnlijk | 1.46 (124/166) | zie 175. |
| 179 | `fb_should_have_shot` | Feedback: had moeten schieten | mogelijk | 0.13 (19/166) | [Interactive-63]: 2/2 gevallen; hier niet gezien. |
| 182 | `fb_should_have_passed_elsewhere` | Feedback: had elders moeten passen | waarschijnlijk | 4.24 (155/166) | zie 175. |
| 183 | `fb_chose_to_pass` | Feedback: koos voor de pass | waarschijnlijk | 0.78 (85/166) | [Interactive-63]; hier 0,8 per rij. |
| 207 | `fb_pick_your_pass` | Feedback: kies je pass | waarschijnlijk | 0.07 (12/166) | [Interactive-63]; hier 12 rijen. |
| 212 | `fb_use_the_ball` | Feedback: gebruik de bal | waarschijnlijk | 1.16 (97/166) | [Interactive-63]; hier 1,2 per rij, ≤ 97 altijd. |

## Team en wedstrijd

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 113 | `clean_sheet` | Clean sheet (team won zonder tegengoal) | zeker | 0.20 (33/166) | eigen vondst: staat precies 1× bij elke speler van een team dat won met 0 tegen (8/8 clean sheets, 33 rijen), nooit bij verlies, gelijkspel, DNF-winst of winst mét tegengoal. EA's cleansheetsany is voor deze (MID/FWD) rijen altijd 0. |

## Keeper

| Code | Veld in `events.js` | Betekenis | Zekerheid | Gem. (rijen) | Bewijs |
|---|---|---|---|---|---|
| 267 | `good_direction_saves` | Reddingen de goede kant op (keeper) | waarschijnlijk | 0 (0/166) | [Interactive-63]; [ClubsXI]: = goodDirectionSaves in 97,7 % van de keeper-rijen. Hier geen keepers. |

## Afgeleide velden in `events.js`

| Veld | Formule | Opmerking |
|---|---|---|
| `pass_attempts` | 215 + 216 + 153 | = EA's `passattempts` in 82 % van de rijen (de rest zijn de afwijkende rijen hieronder) |
| `pass_accuracy` | 215 / (215 + 216 + 153) | |
| `shots` | 217 + 218 | = EA's `shots` in 95 % |
| `shots_inside_box`, `shots_outside_box` | 13 + 14, 18 + 19 | |
| `fouls_conceded_total` | 2 + 3 | = 171 in 96 % |
| `yellow_cards_total` | 95 + 213 | |
| `possession_lost`, `possession_won` | 105 + 106 + 107, 108 + 109 + 110 | |
| `players_beaten_no_skill` | 112 − 38 | |
| `feedback_passes_graded`, `feedback_good_share` | 175 + 176 + 177 + 182, (176 + 177) / dat | voorspelt de winnaar beter dan passnauwkeurigheid (CapUnc) |
| `ball_actions` | 215 + 216 + 153 + 217 + 218 + 174 + 108 + 109 + 110 | proxy voor "aan de bal komen" |

## Onbekende codes in onze data

Codes die in onze 166 rijen voorkomen maar (nog) geen betekenis hebben. Hints komen uit de bronnen hierboven.

| Code | Gem. (rijen) | Hint |
|---|---|---|
| 114 | 0.66 (75/166) | misschien sleutelpasses (≠ 118) [ClubsXI]; hier 0,66 per rij, ≤ 215 altijd, ≥ assists in 93 % |
| 178 | 0.51 (59/166) | ligt tussen de feedback-codes 175–183; hier 0,5 per rij, aanvallers vaker. Geen bron. |
| 204 | 0.25 (37/166) | 153 of 204 is "buitenspelpasses" [ClubsXI]; hier ≤ 216 in 98 %, geen correlatie met 153 |
| 195 | 0.24 (35/166) | sub-type schot naast [CapUnc, issue 1] |
| 186 | 0.11 (17/166) | geen bron |
| 188 | 0.11 (17/166) | sub-type schot naast (≤ 218 in 94–98 %) [CapUnc, issue 1] |
| 39 | 0.12 (16/166) | geen bron; hier 16 rijen, geen correlatie |
| 197 | 0.09 (15/166) | sub-type schot naast; hier = 188 in 98 % [CapUnc, issue 1] |
| 140 | 0.09 (14/166) | goal-techniek-tag (~99 % precisie) [Interactive-63] |
| 196 | 0.07 (11/166) | sub-type schot naast [CapUnc, issue 1] |
| 98 | 0.06 (10/166) | onverklaard; 4–6× vaker bij teams met 2–4 mensen dan met 8+ [CapUnc, issue 1] |
| 190 | 0.06 (9/166) | geen bron |
| 181 | 0.05 (8/166) | geen bron |
| 124 | 0.04 (7/166) | goal-techniek-tag, overlapt met 12/128/137 [Interactive-63] |
| 137 | 0.04 (7/166) | goal-techniek-tag [Interactive-63] |
| 210 | 0.05 (7/166) | geen bron |
| 200 | 0.04 (6/166) | sub-type schot naast; hier = 196 in 96 % [CapUnc, issue 1] |
| 142 | 0.04 (5/166) | geen bron; hier = 21 in 95 % (beide zeldzaam) |
| 193 | 0.03 (5/166) | geen bron; hier = 16 in 98 % (beide zeldzaam) |
| 201 | 0.03 (5/166) | sub-type schot naast [CapUnc, issue 1] |
| 15 | 0.02 (4/166) | goal-techniek-tag (≥98,6 % precisie, 3,2 % van de goals) [Interactive-63] |
| 17 | 0.02 (4/166) | goal-techniek-tag (≥98,6 % precisie) [Interactive-63] |
| 126 | 0.02 (4/166) | goal-techniek-tag (≥98,6 % precisie) [Interactive-63] |
| 167 | 0.02 (4/166) | onderdeel van schoten naast: 218 = 14 + 19 + 47 + 167 (issue 4, Interactive-63) |
| 191 | 0.02 (4/166) | geen bron |
| 192 | 0.02 (4/166) | geen bron |
| 194 | 0.02 (4/166) | goal-techniek-tag (62 % precisie) [Interactive-63] |
| 46 | 0.02 (3/166) | goal-techniek-tag; vuurde bij alle 10 penalty-goals van één club maar ook zonder penalty [CapUnc, issue 1] |
| 205 | 0.02 (3/166) | geen bron |
| 93 | 0.01 (2/166) | goal-techniek-tag (~99 % precisie) [Interactive-63] |
| 132 | 0.01 (2/166) | goal-techniek-tag (100 % precisie, zeldzaam) [Interactive-63] |
| 141 | 0.01 (2/166) | goal-techniek-tag (≥98,6 % precisie, 6,4 % van de goals) [Interactive-63] |
| 149 | 0.01 (2/166) | geen bron |
| 47 | 0.01 (1/166) | onderdeel van schoten naast: 218 = 14 + 19 + 47 + 167 (issue 4, Interactive-63) |
| 48 | 0.01 (1/166) | goal van buiten de zestien, vuurt alleen; mogelijk directe vrije trap [CapUnc, issue 1] |
| 130 | 0.01 (1/166) | goal-techniek-tag (≥98,6 % precisie) [Interactive-63] |
| 134 | 0.01 (1/166) | goal-techniek-tag (≥98,6 % precisie) [Interactive-63] |
| 138 | 0.01 (1/166) | goal-techniek-tag (≥98,6 % precisie) [Interactive-63] |
| 159 | 0.01 (1/166) | tackle die een dribbel stopt? (1/1 geval) [Interactive-63] |
| 161 | 0.01 (1/166) | geen bron |
| 189 | 0.01 (1/166) | geen bron |

Codes die de community wél kent maar die in onze data (nog) niet voorkwamen: 96 (rood/zware overtreding), 122 (goal-techniek-tag), 135 (goal-techniek-tag), 139 (goal-techniek-tag), 168 (goal-techniek-tag), 173 (goal-techniek-tag), 199 (goal-techniek-tag), 267 (reddingen goede kant op), 49–60 (keeper), 268–269 (keeper).

## Bekende eigenaardigheden

- **Afkapping:** zie boven. Alles wat met 3 begint, plus 4–9, 97 en 99, viel in oudere rijen weg.
- **Benoemde velden ≫ events:** bij 4 van de 166 rijen (bv. `passattempts` 127 tegen 24 passevents) liggen EA's eigen tellingen
  ver boven de events, bij spelers die wel de hele wedstrijd speelden. Dezelfde waarneming staat in de fc27-clubs-api-docs
  (4 van 59 rijen). Oorzaak onbekend; neem EA's benoemde velden als totaal en de events als uitsplitsing.
- **tackle_attempts** is niet te reconstrueren: 0 + 1 (gewonnen + verloren) dekt gemiddeld 3,1 van de 4,7 pogingen; ook met
  163 erbij klopt het niet (dan te veel). Wat EA onder een "tackle attempt" verstaat is ruimer dan de codes.
- **Teamniveau-codes:** 113 (clean sheet) is de enige code met vrijwel geen variatie binnen een team (variantie-ratio 0,03).
  Alle andere codes zijn echt per speler.
- **Rage quits / DNF:** bij een DNF-winst (2 wedstrijden) ontbrak 113 ook bij 5-0 en 5-1; de community meldt dat tellers
  bij afgebroken wedstrijden anders worden afgesneden.
