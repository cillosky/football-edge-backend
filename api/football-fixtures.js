// api/football-fixtures.js
// Fetch partite dalle leghe monitorate e salva su Supabase
// Cron: 06:00 UTC ogni giorno

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

// Leghe V1: Bundesliga + Premier League
const LEAGUES = [
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'PL',  name: 'Premier League' }
];

async function fetchMatches(leagueCode) {
  const today = new Date();
  const dateFrom = today.toISOString().split('T')[0];

  // Fetch prossimi 7 giorni
  const dateTo = new Date(today);
  dateTo.setDate(dateTo.getDate() + 7);
  const dateToStr = dateTo.toISOString().split('T')[0];

  const url = `https://api.football-data.org/v4/competitions/${leagueCode}/matches?dateFrom=${dateFrom}&dateTo=${dateToStr}&status=SCHEDULED`;

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
  });

  if (!res.ok) {
    console.error(`Errore fetch ${leagueCode}: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data.matches || [];
}

function buildMatchId(match) {
  return `fd_${match.id}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = { inserted: 0, updated: 0, errors: [] };

  for (const league of LEAGUES) {
    try {
      const matches = await fetchMatches(league.code);
      console.log(`${league.name}: trovate ${matches.length} partite`);

      for (const match of matches) {
        const matchId = buildMatchId(match);

        const record = {
          match_id:   matchId,
          league:     league.code,
          home_team:  match.homeTeam.name,
          away_team:  match.awayTeam.name,
          match_date: match.utcDate,
          status:     match.status,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('football_games')
          .upsert(record, { onConflict: 'match_id', ignoreDuplicates: false });

        if (error) {
          console.error(`Errore upsert ${matchId}:`, error.message);
          results.errors.push({ matchId, error: error.message });
        } else {
          results.inserted++;
        }
      }
    } catch (err) {
      console.error(`Errore lega ${league.code}:`, err.message);
      results.errors.push({ league: league.code, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results
  });
}
