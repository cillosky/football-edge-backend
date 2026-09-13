// test-daily.js
// Testa il pipeline completo in locale
// Esegui con: node --env-file=.env test-daily.js

import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;
const ODDS_API_KEY      = process.env.ODDS_API_KEY;
const SEASON            = '2026';

const LEAGUES = [
  { code: 'PL',  name: 'Premier League', understat: 'EPL',        sport: 'soccer_epl'                  },
  { code: 'BL1', name: 'Bundesliga',     understat: 'Bundesliga', sport: 'soccer_germany_bundesliga'   },
  { code: 'SA',  name: 'Serie A',        understat: 'Serie_A',    sport: 'soccer_italy_serie_a'        },
  { code: 'PD',  name: 'La Liga',        understat: 'La_liga',    sport: 'soccer_spain_la_liga'        },
  { code: 'FL1', name: 'Ligue 1',        understat: 'Ligue_1',    sport: 'soccer_france_ligue_one'     },
];

const TEAM_NAME_MAP = {
  'Arsenal FC': 'Arsenal', 'Aston Villa FC': 'Aston Villa',
  'AFC Bournemouth': 'Bournemouth', 'Brentford FC': 'Brentford',
  'Brighton & Hove Albion FC': 'Brighton', 'Chelsea FC': 'Chelsea',
  'Coventry City FC': 'Coventry', 'Crystal Palace FC': 'Crystal Palace',
  'Everton FC': 'Everton', 'Fulham FC': 'Fulham',
  'Hull City AFC': 'Hull', 'Ipswich Town FC': 'Ipswich',
  'Leeds United FC': 'Leeds', 'Liverpool FC': 'Liverpool',
  'Manchester City FC': 'Manchester City', 'Manchester United FC': 'Manchester United',
  'Newcastle United FC': 'Newcastle United', 'Nottingham Forest FC': 'Nottingham Forest',
  'Sunderland AFC': 'Sunderland', 'Tottenham Hotspur FC': 'Tottenham',
  '1. FC Köln': 'FC Cologne', '1. FC Union Berlin': 'Union Berlin',
  '1. FSV Mainz 05': 'Mainz 05', 'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'Borussia Dortmund': 'Borussia Dortmund', 'Borussia Mönchengladbach': 'Borussia M.Gladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt', 'FC Augsburg': 'Augsburg',
  'FC Bayern München': 'Bayern Munich', 'FC Schalke 04': 'Schalke 04',
  'Hamburger SV': 'Hamburger SV', 'SC Freiburg': 'Freiburg',
  'SV 07 Elversberg': 'Elversberg', 'SV Werder Bremen': 'Werder Bremen',
  'RB Leipzig': 'RasenBallsport Leipzig', 'TSG 1899 Hoffenheim': 'Hoffenheim',
  'VfB Stuttgart': 'VfB Stuttgart', 'SC Paderborn 07': 'Paderborn',
};

const ODDS_NAME_MAP = {
  '1. FC Köln': 'FC Cologne', 'SV Werder Bremen': 'Werder Bremen',
  'RB Leipzig': 'RasenBallsport Leipzig', 'FC Bayern München': 'Bayern Munich',
  'FC Schalke 04': 'Schalke 04', 'Borussia Mönchengladbach': 'Borussia M.Gladbach',
  'FSV Mainz 05': 'Mainz 05', '1. FSV Mainz 05': 'Mainz 05',
  'TSG Hoffenheim': 'Hoffenheim', 'SC Freiburg': 'Freiburg',
  'SC Paderborn 07': 'Paderborn', 'SV 07 Elversberg': 'Elversberg',
  '1. FC Union Berlin': 'Union Berlin',
  'Tottenham Hotspur': 'Tottenham', 'Brighton and Hove Albion': 'Brighton',
  'Brighton & Hove Albion': 'Brighton', 'Newcastle United': 'Newcastle United',
  'Nottingham Forest': 'Nottingham Forest', 'Ipswich Town': 'Ipswich',
  'Leeds United': 'Leeds', 'Hull City': 'Hull', 'Coventry City': 'Coventry',
};

function normFD(n)   { return TEAM_NAME_MAP[n]   || n; }
function normOdds(n) { return ODDS_NAME_MAP[n]   || n; }

// ─── STEP 1: FIXTURES ────────────────────────────────────────────────────────
async function fetchFixtures() {
  console.log('\n[1/5] FIXTURES');
  let saved = 0;
  for (const league of LEAGUES) {
    const today   = new Date().toISOString().split('T')[0];
    const in7days = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
    const url = `https://api.football-data.org/v4/competitions/${league.code}/matches?dateFrom=${today}&dateTo=${in7days}&status=SCHEDULED,TIMED`;
    const res = await fetch(url, { headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY } });
    if (!res.ok) { console.log(`  ❌ ${league.code}: ${res.status}`); continue; }
    const { matches = [] } = await res.json();
    console.log(`  ${league.name}: ${matches.length} partite`);
    for (const m of matches) {
      const { error } = await supabase.from('football_games').upsert({
        match_id: `fd_${m.id}`, league: league.code,
        home_team: normFD(m.homeTeam.name), away_team: normFD(m.awayTeam.name),
        match_date: m.utcDate, status: m.status, updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' });
      if (!error) saved++;
    }
  }
  console.log(`  ✅ ${saved} partite salvate`);
}

// ─── STEP 2: xG ──────────────────────────────────────────────────────────────
async function fetchXG() {
  console.log('\n[2/5] xG UNDERSTAT');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  let saved = 0;
  try {
    for (const league of LEAGUES) {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', req => {
        ['image','stylesheet','font'].includes(req.resourceType()) ? req.abort() : req.continue();
      });
      await page.goto(`https://understat.com/league/${league.understat}/${SEASON}`, { waitUntil: 'networkidle0', timeout: 45000 });
      await new Promise(r => setTimeout(r, 2000));
      const teamsData = await page.evaluate(() => {
        if (typeof teamsData !== 'undefined') return teamsData;
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
          if (s.textContent.includes('teamsData')) {
            const m = s.textContent.match(/teamsData\s*=\s*(\{.+?\});/s);
            if (m) try { return JSON.parse(m[1]); } catch(e) {}
          }
        }
        return null;
      });
      await page.close();
      if (!teamsData) { console.log(`  ❌ ${league.understat}: non trovato`); continue; }
      const teams = Object.values(teamsData);
      console.log(`  ${league.name}: ${teams.length} squadre`);
      for (const t of teams) {
        const home = (t.history||[]).filter(m=>m.h_a==='h');
        const away = (t.history||[]).filter(m=>m.h_a==='a');
        const avg  = (arr,f) => arr.length ? Math.round(arr.reduce((s,m)=>s+parseFloat(m[f]||0),0)/arr.length*100)/100 : 0;
        const { error } = await supabase.from('football_teams_xg').upsert({
          team_name: t.title, league: league.code, season: SEASON,
          xgf_home: avg(home,'xG'), xga_home: avg(home,'xGA'),
          xgf_away: avg(away,'xG'), xga_away: avg(away,'xGA'),
          matches_home: home.length, matches_away: away.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'team_name,league,season' });
        if (!error) saved++;
      }
    }
  } finally { await browser.close(); }
  console.log(`  ✅ ${saved} squadre aggiornate`);
}

// ─── STEP 3: ELO ─────────────────────────────────────────────────────────────
async function fetchElo() {
  console.log('\n[3/5] ELO');
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`https://api.clubelo.com/${today}`);
    if (!res.ok) { console.log(`  ⚠️  ClubElo ${res.status} — skip`); return; }
    const csv = await res.text();
    const eloMap = {};
    for (const line of csv.trim().split('\n').slice(1)) {
      const p = line.split(',');
      if (p.length >= 5) eloMap[p[1]?.trim()] = parseInt(p[4]?.trim());
    }
    const ELO_MAP = {
      'Arsenal':'Arsenal','Liverpool':'Liverpool','Manchester City':'ManCity',
      'Manchester United':'ManUnited','Chelsea':'Chelsea','Tottenham':'Tottenham',
      'Newcastle United':'Newcastle','Brighton':'Brighton','Aston Villa':'AstonVilla',
      'Bournemouth':'Bournemouth','Brentford':'Brentford','Crystal Palace':'CrystalPalace',
      'Everton':'Everton','Fulham':'Fulham','Nottingham Forest':'Nottingham',
      'Ipswich':'Ipswich','Leeds':'Leeds','Hull':'Hull','Sunderland':'Sunderland','Coventry':'Coventry',
      'Bayern Munich':'Bayern','Borussia Dortmund':'Dortmund','Bayer Leverkusen':'Leverkusen',
      'RasenBallsport Leipzig':'RBLeipzig','Eintracht Frankfurt':'EintrachtFrankfurt',
      'VfB Stuttgart':'Stuttgart','Borussia M.Gladbach':'MGladbach','FC Cologne':'Cologne',
      'Werder Bremen':'Werder','Freiburg':'Freiburg','Hoffenheim':'Hoffenheim',
      'Augsburg':'Augsburg','Mainz 05':'Mainz','Union Berlin':'UnionBerlin',
      'Hamburger SV':'Hamburg','Schalke 04':'Schalke','Paderborn':'Paderborn','Elversberg':'Elversberg',
    };
    const { data: teams } = await supabase.from('football_teams_xg').select('id,team_name');
    let updated = 0;
    for (const t of teams||[]) {
      const elo = eloMap[ELO_MAP[t.team_name]];
      if (!elo) continue;
      await supabase.from('football_teams_xg').update({ elo_rating: elo, updated_at: new Date().toISOString() }).eq('id', t.id);
      updated++;
    }
    console.log(`  ✅ ${updated} Elo aggiornati`);
  } catch(e) { console.log(`  ⚠️  ClubElo errore: ${e.message} — skip`); }
}

// ─── STEP 4: ODDS ────────────────────────────────────────────────────────────
async function fetchOdds() {
  console.log('\n[4/5] ODDS');
  let updated = 0;
  for (const league of LEAGUES) {
    const url = `https://api.the-odds-api.com/v4/sports/${league.sport}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=totals&oddsFormat=decimal`;
    const res = await fetch(url);
    if (!res.ok) { console.log(`  ❌ ${league.sport}: ${res.status}`); continue; }
    const events = await res.json();
    console.log(`  ${league.name}: ${events.length} eventi`);
    for (const ev of events) {
      const homeN = normOdds(ev.home_team);
      const awayN = normOdds(ev.away_team);
      let pinOver = null, bookOver = null;
      for (const bm of ev.bookmakers||[]) {
        const totals = bm.markets?.find(m=>m.key==='totals');
        if (!totals) continue;
        const over25 = totals.outcomes?.find(o=>o.name==='Over'&&o.point===2.5);
        if (!over25) continue;
        if (bm.key==='pinnacle') pinOver = over25.price;
        if (bm.key==='williamhill'&&!bookOver) bookOver = over25.price;
      }
      if (!pinOver&&!bookOver) continue;
      const { data: games } = await supabase.from('football_games')
        .select('match_id').eq('league',league.code).eq('home_team',homeN).eq('away_team',awayN);
      if (!games?.length) continue;
      await supabase.from('football_games').update({
        ou_quote_pin: pinOver||null, ou_quote_book: bookOver||null,
        ou_line_source: bookOver?'ODDS_API':'PINNACLE', updated_at: new Date().toISOString(),
      }).eq('match_id', games[0].match_id);
      updated++;
    }
  }
  console.log(`  ✅ ${updated} partite con quote`);
}

// ─── STEP 5: ALGO ────────────────────────────────────────────────────────────
async function runAlgo() {
  console.log('\n[5/5] ALGO');
  const now   = new Date();
  const in48h = new Date(now.getTime()+48*3600000);
  const { data: games } = await supabase.from('football_games')
    .select('*').gte('match_date',now.toISOString()).lte('match_date',in48h.toISOString()).eq('status','TIMED');
  const { data: teamsXG } = await supabase.from('football_teams_xg').select('*').eq('season',SEASON);
  const xgMap = {};
  for (const t of teamsXG||[]) xgMap[`${t.team_name}_${t.league}`] = t;
  let processed = 0;
  for (const g of games||[]) {
    const H = xgMap[`${g.home_team}_${g.league}`];
    const A = xgMap[`${g.away_team}_${g.league}`];
    if (!H||!A||H.matches_home<1||A.matches_away<1) continue;
    const xgH = Math.round(((H.xgf_home+A.xga_away)/2)*100)/100;
    const xgA = Math.round(((A.xgf_away+H.xga_home)/2)*100)/100;
    const xgT = Math.round((xgH+xgA)*100)/100;
    const line = g.ou_line||2.5;
    const gap  = Math.round((xgT-line)*100)/100;
    let signal='NOPLAY', strength='NONE';
    if      (gap>= 0.50){signal='OVER'; strength='GREEN';}
    else if (gap>= 0.25){signal='OVER'; strength='YELLOW';}
    else if (gap<=-0.50){signal='UNDER';strength='GREEN';}
    else if (gap<=-0.25){signal='UNDER';strength='YELLOW';}
    let btts='NOPLAY';
    if      (xgH>=0.90&&xgA>=0.90) btts='BTTS_YES';
    else if (xgH>=0.75&&xgA>=0.75) btts='BTTS_YES';
    else if (xgH<=0.65||xgA<=0.65) btts='BTTS_NO';
    await supabase.from('football_games').update({
      xg_home_proj:xgH, xg_away_proj:xgA, xg_total_proj:xgT,
      xg_gap:gap, ou_line:line, signal, signal_strength:strength, btts_signal:btts,
      updated_at:new Date().toISOString(),
    }).eq('match_id',g.match_id);
    processed++;
  }
  console.log(`  ✅ ${processed} partite elaborate`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log('='.repeat(50));
console.log(`FOOTBALL DAILY TEST — ${new Date().toISOString()}`);
console.log('='.repeat(50));

await fetchFixtures();
await fetchXG();
await fetchElo();
await fetchOdds();
await runAlgo();

console.log('\n✅ DONE');
