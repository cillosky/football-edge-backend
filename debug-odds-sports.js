// debug-odds-sports.js
// Trova le sport keys corrette per calcio su The Odds API
// Esegui con: node --env-file=.env debug-odds-sports.js

const ODDS_API_KEY = process.env.ODDS_API_KEY;

const res = await fetch(
  `https://api.the-odds-api.com/v4/sports?apiKey=${ODDS_API_KEY}`
);
const sports = await res.json();

// Filtra solo calcio
const soccer = sports.filter(s => s.group === 'Soccer' || s.key.includes('soccer'));
console.log('=== SPORT CALCIO DISPONIBILI ===\n');
soccer.forEach(s => {
  console.log(`key: "${s.key}"`);
  console.log(`  title: ${s.title}`);
  console.log(`  active: ${s.active}`);
  console.log('');
});
