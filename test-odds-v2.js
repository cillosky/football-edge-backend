// test-odds-v2.js
// Fetch quote con linea equilibrata (più vicina a 1.85 su entrambi i lati)
// Esegui con: node --env-file=.env test-odds-v2.js

import { createClient } from '@supabase/supabase-js';
import { normalizeName } from './team-name-map.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const BASE = 'https://api.the-odds-api.com/v4';

const LEAGUES = [
  { sport: 'soccer_epl',                league: 'PL'  },
  { sport: 'soccer_germany_bundesliga', league: 'BL1' },
  { sport: 'soccer_italy_serie_a',      league: 'SA'  },
  { sport: 'soccer_spain_la_liga',      league: 'PD'  },
  { sport: 'soccer_france_ligue_one',   league: 'FL1' },
];

const SHARP_BOOKS  = ['pinnacle'];
const TARGET_BOOKS = ['williamhill', 'unibet', 'unibet_se', 'bet365', 'betfair'];

// Linee standard accettate (no linee asiatiche come 2.75, 2.8 ecc)
const STANDARD_LINES = [1.5, 2.5, 3.5, 4.5];

// Trova la linea standard più equilibrata (Over e Under più vicine tra loro)
function findBalancedLine(outcomes) {
  const lines = {};
  for (const o of outcomes) {
    if (!STANDARD_LINES.includes(o.point)) continue; // solo linee standard
    if (!lines[o.point]) lines[o.point] = {};
    lines[o.point][o.name] = o.price;
  }

  let bestLine = null;
  let bestBalance = 999;

  for (const [point, prices] of Object.entries(lines)) {
    if (!prices.Over || !prices.Under) continue;
    // Entrambe le quote devono essere ragionevoli (tra 1.30 e 3.50)
    if (prices.Over < 1.30 || prices.Under < 1.30) continue;
    if (prices.Over > 3.50 || prices.Under > 3.50) continue;

    const balance = Math.abs(prices.Over - prices.Under);
    if (balance < bestBalance) {
      bestBalance = balance;
      bestLine = {
        line:  parseFloat(point),
        over:  prices.Over,
        under: prices.Under,
      };
    }
  }
  return bestLine;
}

async function fetchOdds(sport) {
  const url = `${BASE}/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=totals&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ ${sport}: ${res.status}`);
    return [];
  }
  const remaining = res.headers.get('x-requests-remaining');
  console.log(`  requests rimanenti: ${remaining}`);
  return res.json();
}

const ODDS_NAME_MAP = {
  // Bundesliga
  '1. FC Köln': 'FC Cologne', 'SV Werder Bremen': 'Werder Bremen',
  'RB Leipzig': 'RasenBallsport Leipzig', 'FC Bayern München': 'Bayern Munich',
  'FC Schalke 04': 'Schalke 04', 'Borussia Mönchengladbach': 'Borussia M.Gladbach',
  'FSV Mainz 05': 'Mainz 05', '1. FSV Mainz 05': 'Mainz 05',
  'TSG Hoffenheim': 'Hoffenheim', 'SC Freiburg': 'Freiburg',
  'SC Paderborn 07': 'Paderborn', 'SV 07 Elversberg': 'Elversberg',
  '1. FC Union Berlin': 'Union Berlin',
  // Premier League
  'Tottenham Hotspur': 'Tottenham', 'Brighton and Hove Albion': 'Brighton',
  'Brighton & Hove Albion': 'Brighton', 'Newcastle United': 'Newcastle United',
  'Nottingham Forest': 'Nottingham Forest', 'Ipswich Town': 'Ipswich',
  'Leeds United': 'Leeds', 'Hull City': 'Hull', 'Coventry City': 'Coventry',
  // Serie A
  'ACF Fiorentina': 'Fiorentina', 'AS Roma': 'Roma', 'Atalanta BC': 'Atalanta',
  'Bologna FC 1909': 'Bologna', 'Cagliari Calcio': 'Cagliari', 'Como 1907': 'Como',
  'FC Internazionale Milano': 'Inter', 'Frosinone Calcio': 'Frosinone',
  'Genoa CFC': 'Genoa', 'Juventus FC': 'Juventus', 'SS Lazio': 'Lazio',
  'SSC Napoli': 'Napoli', 'Torino FC': 'Torino', 'US Lecce': 'Lecce',
  'US Sassuolo Calcio': 'Sassuolo', 'Udinese Calcio': 'Udinese',
  'Venezia FC': 'Venezia', 'AC Monza': 'Monza',
  // La Liga
  'CA Osasuna': 'Osasuna', 'Club Atletico de Madrid': 'Atletico Madrid',
  'Club Atlético de Madrid': 'Atletico Madrid', 'Deportivo Alaves': 'Alaves',
  'Deportivo Alavés': 'Alaves', 'FC Barcelona': 'Barcelona',
  'RC Celta de Vigo': 'Celta Vigo', 'RC Deportivo La Coruna': 'Deportivo La Coruna',
  'RC Deportivo La Coruña': 'Deportivo La Coruna', 'RCD Espanyol': 'Espanyol',
  'Rayo Vallecano': 'Rayo Vallecano', 'Real Betis Balompie': 'Real Betis',
  'Real Betis Balompié': 'Real Betis', 'Real Madrid CF': 'Real Madrid',
  'Real Sociedad': 'Real Sociedad', 'Sevilla FC': 'Sevilla',
  // Ligue 1
  'AJ Auxerre': 'Auxerre', 'AS Monaco FC': 'Monaco', 'AS Monaco': 'Monaco',
  'Angers SCO': 'Angers', 'ES Troyes AC': 'Troyes',
  'FC Lorient': 'Lorient', 'Le Havre AC': 'Le Havre',
  'Lille OSC': 'Lille', 'OGC Nice': 'Nice',
  'Olympique Lyonnais': 'Lyon', 'Olympique de Marseille': 'Marseille',
  'Paris Saint-Germain FC': 'Paris Saint Germain', 'Paris Saint-Germain': 'Paris Saint Germain',
  'RC Strasbourg Alsace': 'Strasbourg', 'Racing Club de Lens': 'Lens',
  'Stade Brestois 29': 'Brest', 'Stade Rennais FC': 'Rennes',
  'Stade Rennais FC 1901': 'Rennes', 'Toulouse FC': 'Toulouse',
};

function normOdds(name) { return ODDS_NAME_MAP[name] || name; }

async function main() {
  console.log('=== FOOTBALL EDGE PRO — Odds v2 (linea equilibrata) ===\n');
  let updated = 0;

  for (const league of LEAGUES) {
    console.log(`--- ${league.league} ---`);
    const events = await fetchOdds(league.sport);
    console.log(`  Eventi: ${events.length}`);

    for (const ev of events) {
      const homeN = normOdds(ev.home_team);
      const awayN = normOdds(ev.away_team);

      let pinLine = null, pinOver = null, pinUnder = null;
      let bookLine = null, bookOver = null, bookUnder = null, bookName = null;

      for (const bm of ev.bookmakers || []) {
        const totals = bm.markets?.find(m => m.key === 'totals');
        if (!totals?.outcomes) continue;

        if (SHARP_BOOKS.includes(bm.key)) {
          const balanced = findBalancedLine(totals.outcomes);
          if (balanced) {
            pinLine  = balanced.line;
            pinOver  = balanced.over;
            pinUnder = balanced.under;
          }
        }

        if (TARGET_BOOKS.includes(bm.key) && !bookOver) {
          const balanced = findBalancedLine(totals.outcomes);
          if (balanced) {
            bookLine  = balanced.line;
            bookOver  = balanced.over;
            bookUnder = balanced.under;
            bookName  = bm.key;
          }
        }
      }

      if (!pinOver && !bookOver) continue;

      // Usa linea Pinnacle come riferimento, book come target
      const finalLine = pinLine || bookLine || 2.5;

      // Trova partita su Supabase
      const { data: games } = await supabase
        .from('football_games')
        .select('match_id')
        .eq('league', league.league)
        .eq('home_team', homeN)
        .eq('away_team', awayN);

      if (!games?.length) {
        console.log(`  ⚠️  Non trovata: ${homeN} vs ${awayN}`);
        continue;
      }

      const { error } = await supabase
        .from('football_games')
        .update({
          ou_line:         finalLine,
          ou_quote_pin:    pinOver  || null,
          ou_quote_book:   bookOver || null,
          ou_line_source:  bookName || 'PINNACLE',
          updated_at:      new Date().toISOString(),
        })
        .eq('match_id', games[0].match_id);

      if (error) {
        console.error(`  ❌ ${homeN} vs ${awayN}:`, error.message);
      } else {
        const lineStr = finalLine !== 2.5 ? ` ⚡ linea ${finalLine}` : '';
        console.log(`  ✅ ${homeN} vs ${awayN}${lineStr} — O:${pinOver ?? bookOver} U:${pinUnder ?? bookUnder}`);
        updated++;
      }
    }
    console.log('');
  }

  console.log(`=== FATTO: ${updated} partite aggiornate ===`);
}

main().catch(console.error);
