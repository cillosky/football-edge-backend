// debug-apifootball3.js
// Verifica endpoint disponibili piano free
// Esegui con: node --env-file=.env debug-apifootball3.js

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = 'https://v3.football.api-sports.io';

async function get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.log(`❌ ERRORE:`, JSON.stringify(data.errors));
  }
  return data;
}

// Test fixtures con date esplicite
console.log('=== FIXTURES con date ===');
const fix = await get('/fixtures?league=39&season=2026&from=2026-09-12&to=2026-09-20');
console.log('Errori:', fix.errors);
console.log('Risultati:', fix.results);
console.log('Response length:', fix.response?.length);
if (fix.response?.length > 0) {
  fix.response.slice(0, 3).forEach(f => {
    console.log(`  ${f.teams?.home?.name} vs ${f.teams?.away?.name} — ${f.fixture?.date} — status:${f.fixture?.status?.short}`);
  });
}

// Test partite già giocate stagione 2026
console.log('\n=== PARTITE GIA GIOCATE ===');
const played = await get('/fixtures?league=39&season=2026&status=FT&last=5');
console.log('Errori:', played.errors);
console.log('Risultati:', played.results);
played.response?.slice(0, 3).forEach(f => {
  console.log(`  ${f.teams?.home?.name} ${f.goals?.home}-${f.goals?.away} ${f.teams?.away?.name}`);
});

// Test statistiche squadra
console.log('\n=== TEAM STATS Liverpool season=2026 ===');
const ts = await get('/teams/statistics?league=39&season=2026&team=40');
console.log('Errori:', ts.errors);
console.log('Response:', JSON.stringify(ts.response, null, 2).substring(0, 1000));

console.log('\n=== DONE ===');
