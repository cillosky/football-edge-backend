// debug-apifootball.js
// Test API-Football — xG + fixtures
// Esegui con: node --env-file=.env debug-apifootball.js

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = 'https://v3.football.api-sports.io';

async function get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY
    }
  });
  if (!res.ok) {
    console.error(`❌ ${endpoint} → ${res.status}`);
    const text = await res.text();
    console.error(text.substring(0, 300));
    return null;
  }
  return res.json();
}

// 1. Verifica account e quota richieste
console.log('=== 1. STATUS ACCOUNT ===');
const status = await get('/status');
if (status) {
  console.log('Account:', status.response?.account?.firstname);
  console.log('Piano:', status.response?.subscription?.plan);
  console.log('Richieste oggi:', status.response?.requests?.current);
  console.log('Limite giornaliero:', status.response?.requests?.limit_day);
}

// 2. Leghe disponibili con xG
console.log('\n=== 2. LEGHE TARGET ===');
// ID leghe API-Football: PL=39, BL1=78, SA=135, LaLiga=140, Ligue1=61
const leagues = [
  { id: 39,  name: 'Premier League' },
  { id: 78,  name: 'Bundesliga' },
  { id: 135, name: 'Serie A' },
  { id: 140, name: 'La Liga' },
  { id: 61,  name: 'Ligue 1' },
];

for (const league of leagues) {
  const data = await get(`/fixtures?league=${league.id}&season=2025&next=3`);
  if (data) {
    const fixtures = data.response || [];
    console.log(`\n${league.name} (id:${league.id}) — prossime partite: ${fixtures.length}`);
    fixtures.slice(0, 2).forEach(f => {
      console.log(`  ${f.teams?.home?.name} vs ${f.teams?.away?.name} — ${f.fixture?.date}`);
    });
  }
}

// 3. Test xG su una partita recente
console.log('\n=== 3. TEST xG PARTITA ===');
const recent = await get(`/fixtures?league=39&season=2025&last=1`);
if (recent?.response?.length > 0) {
  const match = recent.response[0];
  const matchId = match.fixture?.id;
  console.log(`Partita: ${match.teams?.home?.name} vs ${match.teams?.away?.name}`);
  
  const stats = await get(`/fixtures/statistics?fixture=${matchId}`);
  if (stats?.response) {
    for (const team of stats.response) {
      const xg = team.statistics?.find(s => s.type === 'expected_goals' || s.type === 'Expected Goals');
      console.log(`  ${team.team?.name} xG: ${xg?.value ?? 'non disponibile'}`);
    }
  }
}

// 4. Test statistiche squadra (xG stagionale)
console.log('\n=== 4. xG STAGIONALE TEAM ===');
const teamStats = await get(`/teams/statistics?league=39&season=2025&team=40`); // Liverpool id=40
if (teamStats?.response) {
  const r = teamStats.response;
  console.log('Team:', r.team?.name);
  console.log('Partite casa:', r.fixtures?.played?.home);
  console.log('Partite trasferta:', r.fixtures?.played?.away);
  console.log('xG casa:', r.expected_goals?.for?.average?.home);
  console.log('xG trasferta:', r.expected_goals?.for?.average?.away);
  console.log('xGA casa:', r.expected_goals?.against?.average?.home);
  console.log('xGA trasferta:', r.expected_goals?.against?.average?.away);
}

console.log('\n=== DONE ===');
