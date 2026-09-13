// debug-names.js
// Mostra i nomi squadre in football_games vs football_teams_xg
// Esegui con: node --env-file=.env debug-names.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Nomi da football_games
const { data: games } = await supabase
  .from('football_games')
  .select('home_team, away_team, league')
  .order('league');

const gameNames = new Set();
for (const g of games) {
  gameNames.add(`${g.league}|${g.home_team}`);
  gameNames.add(`${g.league}|${g.away_team}`);
}

// Nomi da football_teams_xg
const { data: teams } = await supabase
  .from('football_teams_xg')
  .select('team_name, league')
  .order('league');

const xgNames = new Set(teams.map(t => `${t.league}|${t.team_name}`));

console.log('=== NOMI IN football_games MA NON IN football_teams_xg ===\n');
for (const name of [...gameNames].sort()) {
  if (!xgNames.has(name)) {
    const [league, team] = name.split('|');
    console.log(`  [${league}] "${team}"`);
  }
}

console.log('\n=== NOMI IN football_teams_xg ===\n');
for (const t of teams.sort((a,b) => a.league.localeCompare(b.league) || a.team_name.localeCompare(b.team_name))) {
  console.log(`  [${t.league}] "${t.team_name}"`);
}
