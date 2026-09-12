// test-elo.js
// Fetch rating Elo da ClubElo e aggiorna football_teams_xg
// Esegui con: node --env-file=.env test-elo.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ClubElo usa nomi diversi da Understat — mapping necessario
const TEAM_NAME_MAP = {
  // Premier League
  'Aston Villa':        'AstonVilla',
  'Everton':            'Everton',
  'Bournemouth':        'Bournemouth',
  'Sunderland':         'Sunderland',
  'Crystal Palace':     'CrystalPalace',
  'Chelsea':            'Chelsea',
  'Tottenham':          'Tottenham',
  'Arsenal':            'Arsenal',
  'Newcastle United':   'Newcastle',
  'Liverpool':          'Liverpool',
  'Manchester City':    'ManCity',
  'Manchester United':  'ManUnited',
  'Hull':               'Hull',
  'Brighton':           'Brighton',
  'Fulham':             'Fulham',
  'Brentford':          'Brentford',
  'Leeds':              'Leeds',
  'Nottingham Forest':  'Nottingham',
  'Ipswich':            'Ipswich',
  'Coventry':           'Coventry',
  // Bundesliga
  'Bayern Munich':          'Bayern',
  'Hamburger SV':           'Hamburg',
  'Bayer Leverkusen':       'Leverkusen',
  'Hoffenheim':             'Hoffenheim',
  'Augsburg':               'Augsburg',
  'Werder Bremen':          'Werder',
  'Schalke 04':             'Schalke',
  'Mainz 05':               'Mainz',
  'Borussia Dortmund':      'Dortmund',
  'Borussia M.Gladbach':    'MGladbach',
  'Eintracht Frankfurt':    'EintrachtFrankfurt',
  'VfB Stuttgart':          'Stuttgart',
  'FC Cologne':             'Cologne',
  'Freiburg':               'Freiburg',
  'RasenBallsport Leipzig': 'RBLeipzig',
  'Paderborn':              'Paderborn',
  'Union Berlin':           'UnionBerlin',
  'Elversberg':             'Elversberg',
};

async function fetchClubElo() {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.clubelo.com/${today}`;
  console.log(`Fetching ClubElo: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ClubElo error: ${res.status}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split('\n');

  // Header: Rank,Club,Country,Level,Elo,From,To
  const eloMap = {};
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    if (parts.length >= 5) {
      const club = parts[1]?.trim();
      const elo  = parseInt(parts[4]?.trim());
      if (club && !isNaN(elo)) {
        eloMap[club] = elo;
      }
    }
  }

  console.log(`ClubElo: ${Object.keys(eloMap).length} club trovati\n`);
  return eloMap;
}

async function main() {
  console.log('=== FOOTBALL EDGE PRO — Elo Update ===\n');

  const eloMap = await fetchClubElo();

  // Leggi tutte le squadre da Supabase
  const { data: teams, error } = await supabase
    .from('football_teams_xg')
    .select('id, team_name, league, elo_rating');

  if (error) {
    console.error('Errore lettura squadre:', error.message);
    return;
  }

  console.log(`Squadre da aggiornare: ${teams.length}\n`);

  let updated = 0;
  let notFound = 0;

  for (const team of teams) {
    const eloName = TEAM_NAME_MAP[team.team_name];

    if (!eloName) {
      console.log(`⚠️  Mapping mancante: "${team.team_name}"`);
      notFound++;
      continue;
    }

    const elo = eloMap[eloName];

    if (!elo) {
      console.log(`⚠️  Non trovato su ClubElo: "${team.team_name}" → "${eloName}"`);
      notFound++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('football_teams_xg')
      .update({ elo_rating: elo, updated_at: new Date().toISOString() })
      .eq('id', team.id);

    if (updateError) {
      console.error(`❌ ${team.team_name}:`, updateError.message);
    } else {
      console.log(`✅ ${team.team_name.padEnd(28)} [${team.league}] → Elo: ${elo}`);
      updated++;
    }
  }

  console.log(`\n=== FATTO: ${updated} aggiornati, ${notFound} non trovati ===`);
}

main().catch(console.error);
