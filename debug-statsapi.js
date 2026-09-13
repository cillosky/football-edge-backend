// debug-statsapi.js
// Test TheStatsAPI — xG + fixtures + odds
// Esegui con: node --env-file=.env debug-statsapi.js

const API_KEY = process.env.STATS_API_KEY;
const BASE = 'https://api.thestatsapi.com/api';

async function get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  if (!res.ok) {
    console.error(`❌ ${endpoint} → ${res.status}`);
    const text = await res.text();
    console.error(text.substring(0, 300));
    return null;
  }
  return res.json();
}

// 1. Lista competizioni disponibili
console.log('=== 1. COMPETIZIONI ===');
const comps = await get('/football/competitions?limit=50');
if (comps) {
  const target = ['Premier League', 'Bundesliga', 'Serie A', 'La Liga', 'Ligue 1'];
  const found = comps.data?.filter(c => target.includes(c.name)) || [];
  console.log('Leghe trovate:');
  found.forEach(c => console.log(`  ${c.name} → id: ${c.id}`));
}

// 2. Partite Premier League prossimi 7 giorni
console.log('\n=== 2. FIXTURES PREMIER LEAGUE ===');
const today = new Date().toISOString().split('T')[0];
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
const nextWeekStr = nextWeek.toISOString().split('T')[0];

// Prova con competition_id Premier League (di solito 1 o comp_3039)
const fixtures = await get(`/football/matches?competition_id=comp_3039&date_from=${today}&date_to=${nextWeekStr}&per_page=5`);
if (fixtures) {
  console.log('Partite trovate:', fixtures.data?.length || 0);
  fixtures.data?.slice(0, 3).forEach(m => {
    console.log(`  ${m.home_team?.name} vs ${m.away_team?.name} — ${m.utc_date} xG:${m.xg_available}`);
  });
}

// 3. Match stats con xG (prima partita trovata)
if (fixtures?.data?.length > 0) {
  const firstMatch = fixtures.data[0];
  console.log(`\n=== 3. STATS PARTITA: ${firstMatch.home_team?.name} vs ${firstMatch.away_team?.name} ===`);
  const stats = await get(`/football/matches/${firstMatch.id}/stats`);
  if (stats) {
    console.log('Home xG:', stats.data?.home?.xg);
    console.log('Away xG:', stats.data?.away?.xg);
    console.log('Full stats:', JSON.stringify(stats.data, null, 2).substring(0, 500));
  }
}

console.log('\n=== DONE ===');
