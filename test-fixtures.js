// test-fixtures.js
// Fetch partite da football-data.org e salva su Supabase con nomi normalizzati
// Esegui con: node --env-file=.env test-fixtures.js

import { createClient } from '@supabase/supabase-js';
import { normalizeName } from './team-name-map.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

const LEAGUES = [
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'PL',  name: 'Premier League' }
];

async function fetchMatches(leagueCode) {
  const today = new Date();
  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = new Date(today);
  dateTo.setDate(dateTo.getDate() + 7);
  const dateToStr = dateTo.toISOString().split('T')[0];

  const url = `https://api.football-data.org/v4/competitions/${leagueCode}/matches?dateFrom=${dateFrom}&dateTo=${dateToStr}&status=SCHEDULED,TIMED`;

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

async function main() {
  console.log('=== FOOTBALL EDGE PRO — Fixtures ===\n');

  let totalSaved = 0;

  for (const league of LEAGUES) {
    const matches = await fetchMatches(league.code);
    console.log(`${league.name}: trovate ${matches.length} partite`);

    for (const match of matches) {
      const matchId = `fd_${match.id}`;

      // Normalizza nomi → nomi Understat
      const homeName = normalizeName(match.homeTeam.name);
      const awayName = normalizeName(match.awayTeam.name);

      const record = {
        match_id:   matchId,
        league:     league.code,
        home_team:  homeName,
        away_team:  awayName,
        match_date: match.utcDate,
        status:     match.status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('football_games')
        .upsert(record, { onConflict: 'match_id' });

      if (error) {
        console.error(`❌ ${matchId}:`, error.message);
      } else {
        console.log(`✅ ${homeName} vs ${awayName} — ${match.utcDate}`);
        totalSaved++;
      }
    }
    console.log('');
  }

  console.log(`=== FATTO: ${totalSaved} partite salvate ===`);
}

main().catch(console.error);
