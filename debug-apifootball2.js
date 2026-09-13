// debug-apifootball2.js
// Test con stagione corretta
// Esegui con: node --env-file=.env debug-apifootball2.js

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = 'https://v3.football.api-sports.io';

async function get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  const data = await res.json();
  return data;
}

// Trova la stagione corrente per Premier League
console.log('=== STAGIONI DISPONIBILI PREMIER LEAGUE ===');
const seasons = await get('/leagues?id=39');
const leagueSeasons = seasons.response?.[0]?.seasons || [];
console.log('Ultime 3 stagioni:', leagueSeasons.slice(-3).map(s => `${s.year} (current:${s.current})`));

// Prova con stagione 2026
console.log('\n=== FIXTURES con season=2026 ===');
const fix2026 = await get('/fixtures?league=39&season=2026&next=3');
console.log('Partite trovate:', fix2026.response?.length);
fix2026.response?.slice(0, 2).forEach(f => {
  console.log(`  ${f.teams?.home?.name} vs ${f.teams?.away?.name} — ${f.fixture?.date}`);
});

// Prova xG stagionale Liverpool con season=2026
console.log('\n=== xG STAGIONALE TEAM season=2026 ===');
const teamStats = await get('/teams/statistics?league=39&season=2026&team=40');
const r = teamStats.response;
console.log('Team:', r?.team?.name);
console.log('Partite casa:', r?.fixtures?.played?.home);
console.log('Partite trasferta:', r?.fixtures?.played?.away);
console.log('xGF media casa:', r?.expected_goals?.for?.average?.home);
console.log('xGF media away:', r?.expected_goals?.for?.average?.away);
console.log('xGA media casa:', r?.expected_goals?.against?.average?.home);
console.log('xGA media away:', r?.expected_goals?.against?.average?.away);

// Full response per vedere struttura completa
console.log('\n=== STRUTTURA COMPLETA ===');
console.log(JSON.stringify(r?.expected_goals, null, 2));

console.log('\n=== DONE ===');
