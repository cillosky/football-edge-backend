// test-odds.js
// Fetch quote O/U da The Odds API e aggiorna football_games
// Esegui con: node --env-file=.env test-odds.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const BASE = 'https://api.the-odds-api.com/v4';

const LEAGUES = [
  { sport: 'soccer_epl',              league: 'PL'  },
  { sport: 'soccer_germany_bundesliga', league: 'BL1' }
];

async function fetchOdds(sport) {
  const url = `${BASE}/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=totals,spreads&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Odds API ${sport}: ${res.status}`);
    return [];
  }
  const remaining = res.headers.get('x-requests-remaining');
  const used = res.headers.get('x-requests-used');
  console.log(`  Requests: usate=${used} rimanenti=${remaining}`);
  return res.json();
}

function extractBestOdds(event) {
  let pinLine = null, pinOver = null, pinUnder = null;
  let bookOver25 = null, bookUnder25 = null, bookName = null;

  // Priority per quota di gioco: william hill, unibet, bet365, betfair
  const BOOK_PRIORITY = ['williamhill', 'unibet', 'unibet_se', 'bet365', 'betfair'];

  for (const bm of event.bookmakers || []) {
    const totals = bm.markets?.find(m => m.key === 'totals');
    if (!totals) continue;

    // Pinnacle → prendi qualsiasi linea totals come riferimento sharp
    if (bm.key === 'pinnacle') {
      // Cerca 2.5 prima, poi prendi qualsiasi
      const over25 = totals.outcomes?.find(o => o.name === 'Over' && o.point === 2.5);
      const under25 = totals.outcomes?.find(o => o.name === 'Under' && o.point === 2.5);
      if (over25) {
        pinLine  = 2.5;
        pinOver  = over25.price;
        pinUnder = under25?.price;
      } else {
        // Linea asiatica — salva comunque
        const anyOver = totals.outcomes?.find(o => o.name === 'Over');
        if (anyOver) {
          pinLine  = anyOver.point;
          pinOver  = anyOver.price;
          pinUnder = totals.outcomes?.find(o => o.name === 'Under')?.price;
        }
      }
    }

    // Altri book — cerca O/U 2.5
    if (BOOK_PRIORITY.includes(bm.key) && !bookOver25) {
      const over25  = totals.outcomes?.find(o => o.name === 'Over'  && o.point === 2.5);
      const under25 = totals.outcomes?.find(o => o.name === 'Under' && o.point === 2.5);
      if (over25 && under25) {
        bookOver25  = over25.price;
        bookUnder25 = under25.price;
        bookName    = bm.key;
      }
    }
  }

  return { pinLine, pinOver, pinUnder, bookOver25, bookUnder25, bookName };
}

function normalizeTeamName(name) {
  const map = {
    // Bundesliga
    '1. FC Köln':               'FC Cologne',
    'SV Werder Bremen':         'Werder Bremen',
    'RB Leipzig':               'RasenBallsport Leipzig',
    'FC Bayern München':        'Bayern Munich',
    'FC Schalke 04':            'Schalke 04',
    'Borussia Mönchengladbach': 'Borussia M.Gladbach',
    'FSV Mainz 05':             'Mainz 05',
    '1. FSV Mainz 05':          'Mainz 05',
    'TSG Hoffenheim':           'Hoffenheim',
    'TSG 1899 Hoffenheim':      'Hoffenheim',
    'SC Freiburg':              'Freiburg',
    'SC Paderborn 07':          'Paderborn',
    'SV 07 Elversberg':         'Elversberg',
    '1. FC Union Berlin':       'Union Berlin',
    'VfB Stuttgart':            'VfB Stuttgart',
    // Premier League
    'Tottenham Hotspur':        'Tottenham',
    'Manchester United':        'Manchester United',
    'Manchester City':          'Manchester City',
    'Brighton and Hove Albion': 'Brighton',
    'Brighton & Hove Albion':   'Brighton',
    'Newcastle United':         'Newcastle United',
    'Nottingham Forest':        'Nottingham Forest',
    'Ipswich Town':             'Ipswich',
    'Leeds United':             'Leeds',
    'Hull City':                'Hull',
    'Coventry City':            'Coventry',
    'Crystal Palace':           'Crystal Palace',
  };
  return map[name] || name;
}

async function main() {
  console.log('=== FOOTBALL EDGE PRO — Odds Fetch ===\n');

  let updated = 0;

  for (const league of LEAGUES) {
    console.log(`--- ${league.league} ---`);
    const events = await fetchOdds(league.sport);
    console.log(`  Eventi: ${events.length}`);

    for (const event of events) {
      const homeNorm = normalizeTeamName(event.home_team);
      const awayNorm = normalizeTeamName(event.away_team);

      const { pinLine, pinOver, pinUnder, bookOver25, bookUnder25, bookName } = extractBestOdds(event);

      if (!bookOver25 && !pinOver) {
        console.log(`  ⚠️  Nessuna quota: ${homeNorm} vs ${awayNorm}`);
        continue;
      }

      // Trova partita su Supabase
      const { data: games } = await supabase
        .from('football_games')
        .select('match_id')
        .eq('league', league.league)
        .eq('home_team', homeNorm)
        .eq('away_team', awayNorm);

      if (!games || games.length === 0) {
        console.log(`  ⚠️  Non trovata in DB: ${homeNorm} vs ${awayNorm}`);
        continue;
      }

      const { error } = await supabase
        .from('football_games')
        .update({
          ou_quote_pin:    pinOver  || null,
          ou_quote_book:   bookOver25 || null,
          ou_line_source:  bookName || 'PINNACLE',
          updated_at:      new Date().toISOString()
        })
        .eq('match_id', games[0].match_id);

      if (error) {
        console.error(`  ❌ ${homeNorm} vs ${awayNorm}:`, error.message);
      } else {
        console.log(`  ✅ ${homeNorm} vs ${awayNorm}`);
        console.log(`     Book (${bookName ?? 'N/A'}): O=${bookOver25 ?? 'N/A'} U=${bookUnder25 ?? 'N/A'}`);
        console.log(`     Pinnacle (linea ${pinLine}): O=${pinOver ?? 'N/A'} U=${pinUnder ?? 'N/A'}`);
        updated++;
      }
    }
    console.log('');
  }

  console.log(`=== FATTO: ${updated} partite aggiornate ===`);
}

main().catch(console.error);
