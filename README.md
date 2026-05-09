# ScoreShell CLI

Live sports scores, right in your terminal. Cricket · Football · Basketball (NBA).

## Requirements

- **Node.js >= 18** (uses native `fetch` — no npm install needed)
- Any modern terminal with ANSI color support
- Internet connection (fetches from Cricbuzz + ESPN APIs)

## Usage

```bash
node scoreshell.js
```

That's it. No install, no config, no dependencies.

## Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate list / selector |
| `j` / `k` | Vim-style navigate |
| `1`–`9` | Quick-pick match by number |
| `Enter` | Select |
| `b` | Go back |
| `r` | Refresh match data now |
| `q` / `Ctrl+C` | Quit |

## Features

- **Sport selector** — animated intro for each sport
- **Cricket** — live scorecard, batters/bowlers table, ball-by-ball with badges (W/4/6/·), CRR/RRR, partnership, toss
- **Football** — match list with live clock, stats bars (possession, shots, etc.), goals timeline, cards, lineup by formation (GK/DEF/MID/FWD), live commentary
- **Basketball (NBA)** — quarter scores table, player box scores (PTS/REB/AST/STL/BLK/FG/3P/FT/±)
- **Auto-refresh** — live matches refresh every 30 seconds automatically
- **Color coding** — green=live, amber=home/score, orange=away/basketball, muted=completed

## Data Sources

- Cricket: [cricbuzz.com](https://www.cricbuzz.com) (scraper, no API key needed)
- Football: [ESPN Soccer API](https://site.api.espn.com/apis/site/v2/sports/soccer) (public, no key)
- Basketball: [ESPN NBA API](https://site.api.espn.com/apis/site/v2/sports/basketball/nba) (public, no key)

## Tips

- Run in a **wide terminal** (80+ columns) for best experience
- Football stats bars scale to terminal width
- Basketball box score needs ~120+ columns for all columns to show cleanly
- If cricket shows no live matches, there may genuinely be none — try during IND/ENG/AUS match hours

## Troubleshooting

**"Error loading match data"** — network blip, press `r` to retry.  
**Animation looks broken** — your terminal may not support Unicode block chars; still functional.  
**No matches** — check time zone; matches may be scheduled later.
