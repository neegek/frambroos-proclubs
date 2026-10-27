# Wat EA geeft

Inventaris van de onofficiële Pro Clubs-API (`https://proclubs.ea.com/api/fc`), gecontroleerd op 27 oktober 2026.
Alles wat we ophalen bewaren we ruw (`raw` in de database), zodat we later kunnen kiezen wat we tonen.
Nieuw veld tonen: eerst hier kijken of het er al is, dan `src/data.js`.

## Eindpunten

| Eindpunt | Wat | Gebruik |
|---|---|---|
| `clubs/matches` (league, playoff) | laatste 10 wedstrijden per type, met per club de uitslag, `details` (naam, regio, stadion, kleuren van alle tenues, `crestAssetId`) en per speler alle cijfers en de eventstring | opgeslagen in `matches.raw`; spelerscijfers in `player_match_stats` |
| `clubs/overallStats` | totalen van een club: wedstrijden, winst, doelpunten, beste divisie, promoties, laatste 10 uitslagen en tegenstanders, reeksen, skill rating, reputatie | `club_snapshots` (eigen club en elke tegenstander, hooguit wekelijks) |
| `allTimeLeaderboard/search` | eigen club in de ranglijst: huidige divisie, clean sheets, punten, rang | gevoegd bij het eigen clubsnapshot |
| `members/stats` | per lid: carrièretotalen, pro-naam, positie, lengte, nationaliteit (nummer), overall, goals per laatste 10 potten (`prevGoals1..10`) | `member_snapshots` |
| `members/career/stats` | zelfde als `members/stats`, minder velden | niet gebruikt |
| `clubs/info` | naam, regio, stadion, tenues, `crestAssetId` | zit ook in `details` van elke wedstrijd; niet apart opgehaald |
| `settings` | per divisie de punten voor promotie, handhaving en titel | sinds 27 okt 2026 in het eigen clubsnapshot (`divisions`) |
| `allTimeLeaderboard` | top 100 clubs | niet gebruikt |
| `clubs/matches` met `friendlyMatch` | leeg | — |
| `clubs/seasonalStats`, `clubs/playoffAchievements`, `clubs/searchByName`, `seasonRankLeaderboard` | bestaan niet (404) | — |

## Wat er niet is

- **Clublogo's van tegenstanders.** EA geeft alleen een `crestAssetId` (bijv. 99161001 voor Frambroos). Acht bekende
  adresvormen van EA's beeldservers getest: allemaal 404 of 403. De logo's zitten in het spel, niet op het web.
  Ons eigen logo is daarom een eigen bestand (`public/crest.png`). Het id bewaren we wel (`club.crestAssetId`).
- Formatie, exacte positie, attribuutpunten, AI-spelers, fans: zie coach-logica §2.
- De skill rating van een tegenstander op de dag zelf: EA geeft alleen de huidige.

## Wat in `DATA` staat maar nog niet in de app

Per wedstrijd `opponent.club`: stadion, regio, `teamId`, `crestAssetId`, clubkleur en alle drie de tenues (vier kleuren
elk). In `snapshot`: `points`, `rank`, `leagueAppearances`, `bestFinishGroup` en `divisions` (de divisieregels; nog
null tot de eerste verzamelrun na 27 oktober 2026). Per lid in de ruwe data: `prevGoals1..10`, `proStyle`, `redCards`,
`cleanSheetsDef/GK`, `passesMade`, `tacklesMade`.
