// test-results.js
// Testa aggiornamento risultati in locale
// Esegui con: node --env-file=.env test-results.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

const LEAGUES = [
  { code: 'PL',  name: 'Premier League' },
  { code: 'BL1', name: 'Bundesliga'     },
];

let updatedGames = 0;
let updatedPicks = 0;

for (const league of LEAGUES) {
  const now  = new Date();
  const from = new Date(now.getTime() - 48 * 3600000).toISOString().split('T')[0];
  const to   = now.toISOString().split('T')[0];

  const url = `https://api.football-data.org/v4/competitions/${league.code}/matches?dateFrom=${from}&dateTo=${to}&status=FINISHED`;
  const res = await fetch(url, { headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY } });

  if (!res.ok) { console.log(`❌ ${league.code}: ${res.status}`); continue; }

  const { matches = [] } = await res.json();
  console.log(`\n${league.name}: ${matches.length} partite finite`);

  for (const match of matches) {
    const matchId   = `fd_${match.id}`;
    const scoreHome = match.score?.fullTime?.home;
    const scoreAway = match.score?.fullTime?.away;
    if (scoreHome == null || scoreAway == null) continue;

    const totalGoals = scoreHome + scoreAway;

    const { error } = await supabase.from('football_games').update({
      score_home: scoreHome, score_away: scoreAway,
      total_goals: totalGoals, status: 'FINISHED',
      updated_at: new Date().toISOString(),
    }).eq('match_id', matchId);

    if (error) { console.error(`❌ ${matchId}:`, error.message); continue; }

    console.log(`✅ ${match.homeTeam.name} ${scoreHome}-${scoreAway} ${match.awayTeam.name} (${totalGoals} gol)`);
    updatedGames++;

    // Aggiorna pick
    const { data: picks } = await supabase
      .from('football_pick_history').select('*')
      .eq('match_id', matchId).is('win', null);

    for (const pick of picks || []) {
      let win = null;
      if (pick.pick_market === 'OU25') {
        if (pick.pick_dir === 'OVER')  win = totalGoals > (pick.ou_line || 2.5);
        if (pick.pick_dir === 'UNDER') win = totalGoals < (pick.ou_line || 2.5);
        if (totalGoals === pick.ou_line) win = null;
      }
      if (pick.pick_market === 'BTTS_Y') win = scoreHome > 0 && scoreAway > 0;
      if (pick.pick_market === 'BTTS_N') win = scoreHome === 0 || scoreAway === 0;
      if (win === null) continue;

      let clv = null;
      if (pick.quote_pinnacle && pick.quote_used) {
        clv = Math.round(((pick.quote_used / pick.quote_pinnacle) - 1) * 10000) / 10000;
      }

      await supabase.from('football_pick_history').update({
        score_home: scoreHome, score_away: scoreAway,
        total_goals: totalGoals, win, clv,
      }).eq('id', pick.id);

      console.log(`  📊 Pick ${pick.pick_dir} ${pick.ou_line} → ${win ? '✅ W' : '❌ L'}`);
      updatedPicks++;
    }
  }
}

console.log(`\n✅ DONE: ${updatedGames} partite, ${updatedPicks} pick aggiornati`);
