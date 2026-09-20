// api/football-import-csv.js
// Importa statistiche squadre da Football-Data.org e aggiorna football_teams_stats

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

const LEAGUES = [
  { code: 'PL',  name: 'Premier League' },
  { code: 'BL1', name: 'Bundesliga'     },
  { code: 'SA',  name: 'Serie A'        },
  { code: 'PD',  name: 'La Liga'        },
  { code: 'FL1', name: 'Ligue 1'        },
  { code: 'DED', name: 'Eredivisie'     },
];

export default async function handler(req, res) {
  const season = req.query.season || '2526';

  try {
    let updated = 0;

    for (const league of LEAGUES) {
      const url = `https://api.football-data.org/v4/competitions/${league.code}/standings?season=20${season.slice(0,2)}`;
      const resp = await fetch(url, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
      });

      if (!resp.ok) continue;
      const data = await resp.json();
      const standings = data?.standings?.[0]?.table || [];

      for (const row of standings) {
        const team = row.team.name;
        await supabase
          .from('football_teams_stats')
          .upsert({
            team_name: team,
            league: league.name,
            season,
            matches_home: row.homeWon + row.homeDrawn + row.homeLost,
            matches_away: row.awayWon + row.awayDrawn + row.awayLost,
            avg_goals_scored_home:  row.homeWon + row.homeDrawn + row.homeLost > 0
              ? Math.round((row.homeGoalsFor / (row.homeWon + row.homeDrawn + row.homeLost)) * 100) / 100 : null,
            avg_goals_conceded_home: row.homeWon + row.homeDrawn + row.homeLost > 0
              ? Math.round((row.homeGoalsAgainst / (row.homeWon + row.homeDrawn + row.homeLost)) * 100) / 100 : null,
            avg_goals_scored_away:  row.awayWon + row.awayDrawn + row.awayLost > 0
              ? Math.round((row.awayGoalsFor / (row.awayWon + row.awayDrawn + row.awayLost)) * 100) / 100 : null,
            avg_goals_conceded_away: row.awayWon + row.awayDrawn + row.awayLost > 0
              ? Math.round((row.awayGoalsAgainst / (row.awayWon + row.awayDrawn + row.awayLost)) * 100) / 100 : null,
          }, { onConflict: 'team_name,league,season' });

        updated++;
      }
    }

    res.status(200).json({ ok: true, updated, season });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
